# 0029. Live audio visualizer

**Date**: 2026-11-09
**Status**: Accepted

## Summary

This decision connects the fullscreen visualizer to live audio playback using frequency analysis in the native engine. A background Rust worker analyzes playback samples with RustFFT and streams 32 normalized frequency bands to the visible visualizer through a Tauri Channel. For building, the native player adds a nonblocking sample tap, the commands stream frames only while the visualizer is active, and the canvas decays smoothly on pause.

## Requirements

**User stories**:

- As a listener, I want the fullscreen visualizer to respond to the sound the player is producing.
- As a listener, I want the visualizer to stop suggesting sound when playback pauses or analysis fails.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Active visualizer styles use 32 normalized mono frequency bands from the current playback signal after software volume and mute. In bars style, the 32 bands map directly to 32 bar heights. In wave style, the 32 bands modulate displacement control points and curve amplitudes using low, mid, and high band averages. The analyzer targets 20 snapshots per second, with 18 to 22 acceptable. Rates from 15 to 17 are degraded but usable. If the rate stays below 15 snapshots per second for one second, the UI shows the unavailable state. The canvas may draw at 60 frames per second between snapshots. Existing styles remain, and Off remains off.
- **AC-2**: Analysis runs only while fullscreen Visualizer mode is active. A long running Tauri command streams typed spectrum frames through a Channel using a cancellation token in engine state. A separate idempotent stop command sets the token to false and ends the stream on mode change, view close, or Off.
- **AC-3**: Analysis runs outside the audio output callback and never blocks or changes playback. The audio thread sample tap allocates no memory. Paused playback sends no new samples and the UI decays to baseline. Muted playback produces zero bands. The UI ignores frames for another track, older timestamp, or sequence that is not greater than the last accepted sequence.
- **AC-4**: An unsupported control in the fullscreen visualizer is visibly disabled and has an accessible explanation. No control is left as a dead click.
- **AC-5**: If analysis cannot start, stops producing valid frames, or remains below its minimum rate, the UI shows Live visualizer unavailable with Retry and a way to return to Artwork. The underlying error goes through the existing error logging path and raw technical details are not shown. The frame arrival watchdog is paused during seek and track transitions. It never substitutes simulated data.
- **AC-6**: Audio samples and spectrum frames stay in memory and are not recorded or sent to a remote service.

## Decision

**Chosen option**: Option 1: Analyze the existing native playback signal with RustFFT on a worker thread and stream frames through a Tauri Channel.

The stream is active only while fullscreen Visualizer mode is selected. The existing visualizer styles consume the same measured bands. A concrete `SpectrumTapSource` wrapper taps PCM samples before Rodio sink volume, gated by an `AtomicBool` flag to avoid accumulation when inactive. A preallocated buffer pushes window copies to a worker thread that applies an atomic volume snapshot, performs RustFFT, and streams 32 bands.

**Implementation skills**: `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Data model sketch**:

```rust
struct SpectrumFrame {
    track_id: String,
    timestamp_ms: u64,
    sequence: u64,
    bands: [f32; 32],
}
```

`SpectrumFrame` is an in memory stream payload only. The tap wrapper `SpectrumTapSource<I>` wraps Rodio source iterators. It maintains an internal sliding buffer of 4,096 mono samples (`(L + R) / 2`). An `AtomicBool` flag `is_active` gates accumulation: when false, sample polling performs a single relaxed atomic read and bypasses the buffer completely, guaranteeing zero heap allocation and near zero CPU in the audio thread.

The shared `AudioEngine` stores gain and mute together in an `Arc<AtomicU64>`. Bits 0 through 31 contain `f32::to_bits(gain)`, bit 63 contains the mute flag, and bits 32 through 62 are zero. The existing `set_volume` and `set_muted` methods update the packed value with release ordering; the source observer reads one acquire snapshot at the start of each sample window. Playback retains the existing sink volume path.

**State transitions**:

1. Entering Visualizer with an active style creates a Channel, sets the cancellation token to true, and starts `start_spectrum_analysis`.
2. The native worker reads the current signal without blocking the audio output callback and sends frames at 20 per second.
3. The UI accepts only finite values between 0 and 1 for the current track when `sequence` is greater than the last accepted sequence. It also rejects an older monotonic timestamp.
4. Pause stops new samples and the UI decays its last frame to baseline. Resume starts fresh samples.
5. Mode change, Off, or view close invokes `stop_spectrum_analysis`, sets the cancellation token to false, ends the long running command, and releases the Channel.
6. The 500 millisecond frame watchdog is paused during seek and gapless track transitions until the first frame of the new track arrives. If playback is active and no valid frame arrives outside of transitions, or the rate stays below 15 frames in a one second window, the UI enters the error state.
7. A failed start or invalid stream displays an error state with Retry and a return to Artwork. A dropped Channel during normal close ends the worker without an error.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `start_spectrum_analysis` | Long running Tauri command | `Channel<SpectrumFrame>` | Ordered frames until stopped, targeting 20 per second | Local desktop | Engine unavailable, analysis setup error |
| `stop_spectrum_analysis` | Tauri command | none | Success, including if already stopped | Local desktop | Worker stop error |
| `startSpectrumAnalysis` | TypeScript audio service | Typed Channel | Promise settles when stream ends | Local UI | Rejected IPC call |
| `stopSpectrumAnalysis` | TypeScript audio service | none | Promise of completion | Local UI | Rejected IPC call |

The Rust command is registered through the existing Tauri command handler. Channel cleanup is treated as normal when the UI closes. Other send or analysis errors are surfaced to the visualizer state.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Start analysis | Current track identity and PCM samples | Existing Rust playback engine state |
| Compute spectrum | 32 mono frequency bands | RustFFT applied to the analysis copy after its current software gain and mute factor |
| Interpolate low bands | Sub 10 Hz band energy | Nearest FFT bin interpolation for narrow logarithmic bands |
| Normalize frame | Finite values from 0 to 1 | RMS magnitude in dBFS mapped from minus 60 dBFS to 0 and minus 6 dBFS to 1 |
| Read gain and mute | One consistent analysis setting | Packed gain and mute snapshot in the shared `Arc<AtomicU64>` value |
| Identify frame | Track id, monotonic sample time, and sequence | Current engine track, monotonic clock, and engine wide frame counter |
| Render bars style | 32 vertical bar heights | Direct mapping of each `SpectrumFrame.bands[i]` |
| Render wave style | Curve control points and wave heights | Low, mid, and high averages derived from `SpectrumFrame.bands` |
| Handle pause | Decay target | Absence of new playback samples |
| Handle stale frame | Current track and last accepted sequence | `SpectrumFrame.track_id` and `sequence` |

**Analysis details**:

1. Use 4,096 sample mono windows with a Hann window.
2. Advance the window by one twentieth of the current sample rate, rounded to the nearest sample, to target 20 snapshots per second. Windows overlap as needed.
3. Map FFT bins into 32 logarithmic bands from 20 Hz to the lesser of 20 kHz and the stream Nyquist frequency. Band edge `i` is `20 * (upper_frequency / 20) ^ (i / 32.0)` for `i` from 0 to 32.
4. Normalize source samples by 32768 before the FFT. For each non DC and non Nyquist bin, compute peak amplitude as `2 * abs(bin) / sum(hann_window)`. For DC and Nyquist bins, use `abs(bin) / sum(hann_window)`. For each band energy, sum `amplitude ^ 2 / 2` for non DC and non Nyquist bins, and `amplitude ^ 2` for DC or Nyquist bins. If a logarithmic band span contains zero discrete FFT bin centers (sub 10 Hz bands), interpolate energy from the nearest bin rather than leaving RMS at zero. The band RMS is the square root of the energy sum. Zero RMS maps to 0. For other values compute `clamp((20 * log10(rms) + 60) / 54, 0, 1)`.
5. The source copy sends windows to a preallocated `VecDeque` with capacity two, protected by a `Mutex` and `Condvar`. The source observer uses `try_lock` only. When the queue is full it removes the oldest window, adds the newest, and notifies the worker. If the lock is contended it drops the incoming window instead of waiting. The worker removes a window under the lock, then releases the lock before transforming or sending frames. A poisoned buffer stops analysis, logs the cause, and leaves playback unchanged.

**Key invariants**:

1. The audio callback never allocates memory, waits for FFT work, or blocks for UI delivery. Its tap reads one atomic active flag and volume snapshot without changing playback.
2. Only one spectrum worker is active for the fullscreen view.
3. A stop request is safe when the worker is already stopped.
4. A disconnected Channel ends analysis without changing playback.
5. Paused or stopped playback does not produce fabricated nonzero data.
6. The engine wide frame counter increases for every emitted frame during the AudioEngine lifetime. The UI rejects any frame whose sequence is not greater than the last accepted sequence.
7. The watchdog is paused during seek and track boundary transitions to avoid false error states.
8. No audio buffers or frequency frames are written to SQLite or sent remotely.

**Security model**:

The native player and visualizer run in the same local app. No account or network permission is added. Only the active UI command receives the Channel.

**Configuration required**:

Not applicable. No new environment variables, feature flags, or credentials are required.

**Critical test scenarios**:

- Frequency response and sub 10 Hz interpolation: Known tones in low and high frequencies produce energy across all bands without dead lowest bands, verifies **AC-1**.
- Style mapping: 32 bars map directly to heights, and wave mode modulates curves using frequency groupings, verifies **AC-1**.
- Lifecycle management: Analysis starts only in the active visualizer and stops on Off, mode change, close, or repeated stop, verifies **AC-2**.
- Performance and isolation: The worker does not block audio playback, allocates zero memory on the audio thread, targets 20 frames per second, and detects sustained low frame rates, verifies **AC-1**, **AC-3**.
- Playback states and watchdog: Pause decays to baseline, seek pauses the watchdog without false errors, mute yields zero bands, and stale sequences are ignored, verifies **AC-3**, **AC-5**.
- Unsupported controls: Disabled controls show accessible tooltips, verifies **AC-4**.
- Failure handling: Engine or stream failure shows Retry and Artwork navigation without simulated output, verifies **AC-5**.
- Privacy and memory: Audio buffers and spectrum frames stay in volatile memory, verifies **AC-6**.

## Build plan

- [x] 1. Add a visualizer data state, error view, retry, Artwork return control, and accessible disabled control states using typed sample frames, satisfies **AC-4**, **AC-5**
- [x] 2. Add RustFFT, the nonallocating `SpectrumTapSource` wrapper, and a bounded analysis worker outside the audio output callback, satisfies **AC-1**, **AC-3**, **AC-6**
- [x] 3. Add the typed Channel start and stop commands with cancellation token, transition watchdog guards, and the TypeScript service, satisfies **AC-2**, **AC-3**, **AC-5**
- [x] 4. Connect bars and wave visualizer styles to the 32 band frame and add lifecycle cleanup, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**
- [x] 5. Add unit and integration tests for low band interpolation, tone analysis, boundary conditions, stream close, pause decay, and error states, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:

- The visualizer reflects the actual native playback path.
- A scoped typed Channel avoids a global event listener for a continuous stream.
- Analysis stops when it is not visible.
- Sub 10 Hz band interpolation prevents dead frequency bars.

**Negative / tradeoffs**:

- RustFFT and the worker add native code and concurrency that require careful testing.
- A fixed scale may make very quiet audio less visually prominent than per frame normalization.
- The channel start command remains active for the lifetime of the visualizer stream.

**Neutral**:

- No audio file is decoded a second time.
- Existing visualizer styles and settings remain in place.

## Follow-up

- None.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
