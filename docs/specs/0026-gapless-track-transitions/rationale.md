# 0026. Gapless track transitions in the audio engine: Rationale

## Context

Spec 0013 (accepted) set up the native Rodio engine with Symphonia decoders. It works, but the handover between tracks is not seamless. In `src-tauri/src/audio/engine.rs` the monitor thread polls every 100 milliseconds. When the sink is empty it stops the sink, emits `audio:track-ended`, and waits for a new play command. The frontend store reacts in `src/store/usePlayerStore.ts` by calling next track across the asynchronous IPC bridge. Both steps happen after the sound has already stopped, so there is a gap of silence between songs.

This matters most for continuous live albums, classical movements, and concept records, where the listener expects one track to flow into the next. The review in `docs/reviews/process-0003-modern-desktop-player-capabilities.md` (finding F-2) flagged this as a major gap.

If nothing is decided, the gap remains and the listening experience stays below what people expect from a desktop music player.

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
