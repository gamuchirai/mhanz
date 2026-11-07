# 0026. Gapless track transitions in the audio engine

**Date**: 2026-11-07
**Status**: In Progress

## Summary

Decision rationale and options history are preserved in [rationale.md](rationale.md).
Verification checklist is recorded in [verify.md](verify.md).

This decision makes songs play one after another with no silent gap (gapless playback). Today the engine runs dry at the end of each track, tells the interface, and waits for a round trip before starting the next song, which causes an audible pause. The chosen approach stages the next track inside the audio engine ahead of time and queues it on the same output, so the switch happens inside the engine. For building, this means the engine gains a short lookahead, the interface hands it the upcoming track early, and the interface is told about track changes rather than being asked to start each one.

## Requirements

**User stories**:
- As a listener playing an album, I want one track to flow straight into the next so that live recordings and concept albums play as the artist intended.
- As a listener skipping forward or back, I want the next track to start without a pause when it is already prepared.
- As a listener playing a file that fails to open, I want playback to carry on with the following track instead of stopping.
- As a listener using repeat, I want a single track or the whole queue to loop without a gap.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: When the active track reaches its end and the next track is staged, audio continues from the next track with no silent gap in the output.
- **AC-2**: Gapless transitions apply to every queue source (album, playlist, library, and shuffle), and to both automatic track end and manual Next or Previous once the target track is staged.
- **AC-3**: The engine stages the next track when 10 seconds or less of the current track remain. A track that is 10 seconds or shorter is staged as soon as it starts. Decoding for staging runs off the interface thread and does not block playback or the interface.
- **AC-4**: The frontend gives the engine the upcoming track in advance. The engine switches to it on its own and emits a track changed event at the boundary, so the interface updates without a play round trip.
- **AC-5**: If the staged track cannot be opened or decoded, the engine skips to the following valid track from an ordered lookahead list, emits a skip event, and shows a five second toast. Playback does not stop.
- **AC-6**: Seeking within the staged track keeps the staged next track ready. If a seek moves playback outside the staging window, the engine restages the next track.
- **AC-7**: Repeat one loops the same track with no gap. Repeat all wraps from the last track to the first with no gap.
- **AC-8**: When no next track is staged and the queue has ended, playback stops and the existing track ended event is emitted, as today. Device loss and reconnection behaviour from spec 0013 is unchanged.
- **AC-9**: Where a file declares encoder delay or padding that the decoder exposes, playback trims it frame accurately at the decoder layer so no extra silence is heard at the join. For a codec that does not expose this data, the criterion is marked unsupported for that codec, not partly met.
- **AC-10**: Every staged track is converted to the output device's sample rate and channel layout before it is queued. Every queue change, shuffle change, or repeat change increments a queue generation number, and the engine ignores staging or boundary work from an older generation.

## Feature design

**Data model sketch**:
Not applicable. This decision adds no database tables or columns. The engine keeps a single in-memory staged slot holding the next track's id, path, decoded source handle, and duration.

**State transitions**:
- Idle → Playing (play command with a queue): active track set, next track staged if one is known.
- Playing → Staging (about 10 seconds remain and a next track is known): decode the next track in the background and append it to the sink.
- Staging → Playing (boundary crossed): active track becomes the staged track, the staged slot clears, and the track changed event is emitted.
- Staging → Playing (staged track fails to open): skip to the following track and emit a notice (AC-5).
- Playing → Stopped (boundary crossed and no next track): the track ended event is emitted and status becomes Stopped (AC-8).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `audio_set_next_track` (Tauri command) | invoke | ordered lookahead list of track id and file path (up to 3), queue generation number | ok, rejected if generation is stale | local app only | invalid path, unsupported format, stale generation |
| `audio:track-changed` (event) | emit | track id, duration, generation | track state | local app only | none |
| `audio:track-skipped` (event) | emit | failed track id, reason code, following track id | payload for a five second toast | local app only | none |

Existing events `audio:state-changed` and `audio:track-ended` keep their meaning (AC-8).

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Stage next track | decoded source and duration | file path from `audio_set_next_track` input |
| Boundary switch | new active track id | staged slot held by the engine |
| Track changed event | position at the join | engine sink position at the boundary |
| Skip notice | failed track id, reason code, following track id | lookahead list sent by the frontend, decided in this spec |
| Restage on seek | next track path | lookahead list sent by the frontend, decided in this spec |

**Key invariants**:
- At most one track is staged at a time, and the staged track is always the first valid entry of the lookahead list.
- Each source appended to the sink carries its own boundary metadata (track id, duration, and elapsed time). Position reads as zero at each boundary, and elapsed time is tracked per source.
- The staged slot is cleared whenever the queue generation changes, a seek leaves the window, or playback stops.
- Manual Next or Previous keeps the join gapless only when the target is already the queued boundary track. Otherwise the sink is stopped and rebuilt at the target.
- Every appended source is already in the output device's sample rate and channel layout.
- The interface's view of the active track changes only through the track changed event, never by guessing.

**Security model**:
Local playback only. No network, account, or cross-user data is involved. File paths come from the library and are already limited to the supported extensions in `engine.rs` (`SUPPORTED_EXTENSIONS`).

**Configuration required**:
Not applicable. No new environment variables, feature flags, or secrets. The 10 second lookahead is a constant in the engine.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: play a two track album with no pause and confirm the join has no silent samples, verifies **AC-1**, **AC-2**, **AC-4**
- Failure case: stage a corrupt or missing next file, confirm playback skips to the track after it and shows the notice, verifies **AC-5**
- Seek case: seek inside the staged window and confirm the next track still plays with no gap, verifies **AC-6**
- Auth/permission: not applicable, local playback has no permission model

## Build plan

- [x] 1. Add a boundary wrapper source in `src-tauri/src/audio/engine.rs` that signals when a track's samples are exhausted, satisfies **AC-4**
- [x] 2. Add a staged slot fed by an ordered lookahead list, a queue generation counter, and a staging routine that decodes off the interface thread (10 seconds or less remaining, or immediately for tracks of 10 seconds or shorter), satisfies **AC-1**, **AC-3**, **AC-10**
- [x] 3. Convert staged sources to the output device's sample rate and channel layout before appending, satisfies **AC-1**, **AC-10**
- [x] 4. Add the `audio_set_next_track` Tauri command, which takes an ordered lookahead list and a queue generation, and call it from `src/store/usePlayerStore.ts` when the queue or the next items change, satisfies **AC-2**, **AC-4**, **AC-10**
- [x] 5. Replace the stop on empty path in the monitor thread with per source boundary handling that emits `audio:track-changed` and keeps `audio:track-ended` for queue end only, satisfies **AC-4**, **AC-8**. Position reads as zero at each boundary, using per source elapsed time
- [x] 6. Skip to the next valid track from the lookahead list when a staged track fails to open or decode, and emit `audio:track-skipped` for a five second toast, satisfies **AC-5**
- [x] 7. Restage on seek and on manual Next or Previous, satisfies **AC-2**, **AC-6**
- [x] 8. Repeat one and repeat all stage the same or first track ahead of time, satisfies **AC-7**
- [x] 9. Trim encoder delay and padding where the decoder exposes it, satisfies **AC-9**
- [x] 10. Add Rust unit tests for the boundary wrapper, staging, and generation checks, and Vitest tests for the store's lookahead handling, satisfies **AC-1** to **AC-10**

## Consequences

**Positive**:
- Continuous albums and classical movements play without audible gaps.
- The interface no longer needs a round trip to start each track, so changes feel immediate.

**Negative**:
- The engine holds one extra decoded track in memory, which is small for normal audio files.
- The audio thread and monitor thread now coordinate more closely, so bugs here are harder to spot.

**Risks**:
- If the sample rate or channel count differs between tracks, the mixer may resample and a short gap could still appear (see the conversion step in the Build plan).
- Some codecs may not expose encoder delay. In that case AC-9 applies only to the files that do declare it.

## Follow-up

- Consider a short crossfade as a separate scope feature. This spec only covers pure gapless handover.
- When a scope row for gapless playback is added, link this spec from it and run `/develop` against it.
- Add the lookahead length and the skip notice to the user facing copy when the interface is next reviewed.
