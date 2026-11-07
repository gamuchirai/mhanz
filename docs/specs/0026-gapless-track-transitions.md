# 0026. Gapless track transitions in the audio engine

**Date**: 2026-11-07
**Status**: In Progress

## Summary

This decision makes songs play one after another with no silent gap (gapless playback). Today the engine runs dry at the end of each track, tells the interface, and waits for a round trip before starting the next song, which causes an audible pause. The chosen approach stages the next track inside the audio engine ahead of time and queues it on the same output, so the switch happens inside the engine. For building, this means the engine gains a short lookahead, the interface hands it the upcoming track early, and the interface is told about track changes rather than being asked to start each one.

## Context

Spec 0013 (accepted) set up the native Rodio engine with Symphonia decoders. It works, but the handover between tracks is not seamless. In `src-tauri/src/audio/engine.rs` the monitor thread polls every 100 milliseconds. When the sink is empty it stops the sink, emits `audio:track-ended`, and waits for a new play command. The frontend store reacts in `src/store/usePlayerStore.ts` by calling next track across the asynchronous IPC bridge. Both steps happen after the sound has already stopped, so there is a gap of silence between songs.

This matters most for continuous live albums, classical movements, and concept records, where the listener expects one track to flow into the next. The review in `docs/reviews/process-0003-modern-desktop-player-capabilities.md` (finding F-2) flagged this as a major gap.

If nothing is decided, the gap remains and the listening experience stays below what people expect from a desktop music player.

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

## Options considered

### Option 1: Stage the next track in the same Rodio sink queue (chosen)

The engine decodes the upcoming track ahead of time and appends it to the active sink with `Sink::append`. Rodio plays queued sources one after another on one output, so the join happens inside the mixer. A boundary wrapper around each source reports when its samples run out, and the engine uses that signal to update state and emit the track changed event.

**Pros**:
- Uses the single output stream and sink already in `engine.rs`, so the change stays inside the engine.
- No new dependency, and no hand over logic between two sinks.
- Keeps volume and mute state on one sink, so there is no drift.

**Cons**:
- The boundary wrapper needs careful handling so the monitor thread and the sink agree on which track is playing.
- If the next track has a different sample rate or channel count, the mixer may resample and a short gap could appear. Staged sources must be converted to the output format before they are appended.

### Option 2: Two sinks with manual handover

Keep one sink for the active track and a second for the next track, then switch between them at the end of the first.

**Pros**:
- Each track has its own sink, so the state of each is easy to reason about.

**Cons**:
- The switch happens in application code on a timer, so it is less exact than the mixer boundary.
- Volume, mute, and position must be kept in step across two sinks.
- More code and more chances for drift or a click at the join.

### Option 3: Keep frontend driven changes and only tune timing

Leave the frontend in charge of every track change and try to make the event round trip faster.

**Pros**:
- Smallest code change.

**Cons**:
- The silence comes from the round trip itself, so this cannot remove the gap.
- Does not meet AC-1.

## Rationale

Option 1 is the only option that removes the gap at the source. The gap exists because the sink runs empty before the next track is started. Appending the next source to the same sink means the mixer already holds the next samples when the active track ends, so there is nothing to wait for. It also reuses the single output stream from spec 0013, which keeps volume, mute, and device recovery in one place and avoids adding a dependency.

The frontend keeps ownership of the queue and tells the engine the upcoming track ahead of time (AC-4). The engine owns the actual switch, because that is the only place where timing is exact. This matches the decision recorded in the scope and in finding F-2.

Encoder delay trimming (AC-9) is a recommended call, not a user choice. Most long lossy files carry padding that would otherwise add a small silence at each join. Trimming happens frame accurately at the decoder layer where that data is exposed. For codecs that do not expose it, the criterion is marked unsupported rather than partly met.

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
