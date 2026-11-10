# 0029. Live audio visualizer: Rationale

## Context

The fullscreen player view provides an animated audio visualizer mode. However, the existing implementation uses simulated sine wave animations rather than analyzing the active audio signal. As a result, the visualizer does not reflect the tempo, pitch, or energy of the song actually playing.

This shortcoming was identified in `docs/reviews/process-0002-ui-hydration-improvements.md` under finding P2-F7 (Audio visualizer shows simulated sine waves rather than real frequency data). Listeners expect desktop music players to provide authentic audio visualizers that react to live playback.

Without this decision, the visualizer remains cosmetic and decoupled from the native playback engine.

## Options considered

### Option 1: Native Rodio sample tap with RustFFT and Tauri Channel streaming (chosen)

Tap playback PCM samples directly in the native audio engine before Rodio applies sink gain. Multiply the analysis copy by the software gain and mute factor, perform Fast Fourier Transform via RustFFT on a background worker thread, and stream 32 normalized frequency bands to the frontend using a Tauri Channel.

**Pros**:

- Accurately represents the exact audio samples passing through the playback sink.
- No second decoding pass or duplicate audio reading.
- Keeps heavy Fourier transform math inside compiled Rust code off the user interface thread.
- Tauri Channel provides a typed, backpressure aware streaming interface.
- Streams only while the fullscreen visualizer is active, using zero CPU when inactive.

**Cons**:

- Introduces RustFFT as a native dependency.
- Requires careful concurrency handling between the Rodio audio thread and the analysis worker.

### Option 2: Frontend Web Audio API decoding in React

Decode the audio file a second time in the browser web view using the Web Audio API AnalyserNode.

**Pros**:

- Pure frontend implementation without changes to native Rust audio code.

**Cons**:

- Decodes the entire audio file twice, increasing memory and disk IO.
- Playback timing can drift between the native Rodio sink and the browser audio context.
- Fails or behaves inconsistently on unsupported codecs or platform web views.

### Option 3: Polling playback state via periodic Tauri IPC commands

Periodically poll audio amplitude or precomputed waveform peaks from the frontend on a timer.

**Pros**:

- Simpler request response model.

**Cons**:

- High IPC overhead at 20 snapshots per second.
- Lacks smooth frequency band data needed for expressive visualizer styles.
- Jitter and frame pacing issues across IPC boundaries.

## Rationale

Option 1 is the most accurate, performant, and reliable choice. The native engine already owns playback and knows the active sample stream. Tapping samples before sink gain and multiplying only the analysis copy avoids interfering with playback audio quality.

RustFFT is a well established, pure Rust library with excellent performance. Running analysis on a dedicated worker with a small preallocated queue ensures the audio output callback is never blocked.

Using a Tauri Channel ties the lifetime of the stream directly to the visible visualizer component, cleanly releasing resources when the listener navigates away.

## Discovery note

The RustFFT Agent Skill search found no relevant skill. The MCP registry search found no relevant server. The repository existing Rust best practices and Tauri skills cover the implementation guidance.

## References

**Project sources**:

- `AGENTS.md`: Tauri v2 conventions and Rust memory safety best practices.
- `docs/reviews/process-0002-ui-hydration-improvements.md`: finding P2-F7.
- `docs/specs/0011-now-playing-fullscreen-view/index.md`: fullscreen view and visualizer mode.
- `docs/specs/0013-core-audio-playback-engine/index.md`: native Rodio playback engine.

