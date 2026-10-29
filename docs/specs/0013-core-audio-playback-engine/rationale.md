# 0013. Core audio playback engine: Rationale and Context

## Context

Mutinhimira is designed as a lightweight modern desktop music player inspired by Windows Groove Music and the Midnight visual aesthetic. During Phase 1 of development, the user interface was constructed following the Facade build approach. Views, drawer panels, playlists, queue manipulation, and fullscreen playback controls were built and verified against simulated timer ticks and static fixtures in `usePlayerStore.ts`. In this facade configuration, playback progress was driven by a coarse one second JavaScript `setInterval` timer, and audio duration was read from static mock objects without actual sound output.

Phase 2 requires replacing this simulated shell with a real, high fidelity audio engine. Delivering desktop music playback introduces specific technical forces:

First, audio playback must remain completely immune to user interface stutter, garbage collection pauses, and intensive React re rendering. In desktop music players, any micro stutter or dropped audio buffer immediately destroys perceived software quality. The audio decoding and rendering pipeline must therefore run on dedicated native operating system threads with hardware level audio scheduling, completely decoupled from the webview JavaScript execution context.

Second, personal local music libraries span diverse audio containers and codecs collected over decades. Users expect seamless playback of MP3, lossless FLAC, uncompressed WAV, Apple AAC and M4A, and open source OGG Vorbis files. The decoder architecture must handle these formats reliably without requiring users to install third party codecs, system media feature packs, or external software.

Third, the desktop runtime must maintain a tiny memory and CPU footprint. Mutinhimira aims to run continuously in the background while users work, game, or browse. Spawning heavyweight external processes or embedding full browser media stacks conflicts directly with this core product goal.

Fourth, developers and automated CI pipelines need to run unit and component tests rapidly. Vitest component suites and browser previews must operate without crashing when native desktop runtime APIs are absent.

Not deciding this architecture cleanly would risk audio glitches, fragile format support, or tight coupling between native audio internals and frontend UI state.

## Options considered

### Option 1: Native Rodio engine with Symphonia decoders, thread safe Mutex state container, and Tauri IPC bridge (Chosen)

Embed the pure Rust Rodio crate (version 0.20+) compiled with the `symphonia-all` feature set directly into the `Mutinhimira_lib` Rust binary. Rodio manages the underlying hardware audio device output through CPAL on dedicated audio threads. Live playback status, active file path, track identifier, and volume are managed in an `Arc<Mutex<AudioPlaybackState>>` container. A dedicated background timer thread emits `audio:position` events at 100 millisecond intervals to Tauri webview listeners while active. Natural song completions trigger an `audio:track-ended` event, allowing the frontend Zustand queue store to advance playback smoothly.

**Pros**:

- Pure Rust implementation with zero external runtime dependencies, providing memory safety and minimal resource footprint.
- Symphonia decoders support all target formats (MP3, FLAC, WAV, AAC, and OGG Vorbis) natively across Windows, macOS, and Linux.
- Dedicated hardware audio thread guarantees zero audio stuttering even under intensive UI animations or window resizing.
- Push based Tauri events provide smooth 100 millisecond progress tracking without wasteful client polling.

**Cons**:

- Slightly increases initial Rust compilation time due to compiling multiple Symphonia decoder formats into the binary.
- Requires explicit state synchronization between Rust Mutex state and frontend Zustand stores.

### Option 2: Web Audio API and HTML5 Audio elements in webview presentation layer

Implement audio playback entirely in TypeScript inside the webview using standard browser `HTMLAudioElement` or Web Audio API `AudioContext` loading local files via custom Tauri asset protocol URLs (`asset://localhost/...`).

**Pros**:

- Pure TypeScript implementation requiring zero Rust audio code or Cargo crates.
- Web standards are familiar to frontend developers with native browser media element events (`timeupdate`, `ended`, `error`).

**Cons**:

- Vulnerable to audio stutter, buffer underruns, and audio glitches whenever the webview is busy rendering, scrolling, or performing garbage collection.
- Codec support depends entirely on the operating system installed webview (e.g. WebView2 on Windows), which may lack support for FLAC, OGG Vorbis, or specific AAC profiles on stripped Windows N editions.
- Reading large audio files through the Tauri custom asset protocol adds serialization overhead between native disk and webview memory.
- Background window throttling in some operating systems can suspend webview timers, pausing playback when the application is minimized.

### Option 3: Low level CPAL audio streams with manual custom Symphonia packet decoding loop

Bypass high level audio frameworks like Rodio and write a custom low level audio engine using CPAL (Cross Platform Audio Library) directly, manually implementing ring buffers, packet decoding loops, sample format conversions, and volume scaling.

**Pros**:

- Ultimate low level control over ring buffer sizes, latency parameters, and custom DSP filter graphs.
- Direct control over every raw PCM sample buffer.

**Cons**:

- Substantial implementation complexity requiring hundreds of lines of unsafe buffer synchronization and sample conversion logic.
- High risk of buffer underruns, device synchronization bugs, and platform specific audio glitches across different soundcards.
- Significant development overhead that delays shipping core player functionality without offering audible user benefits.

### Option 4: External CLI audio player process sidecar (mpv or ffplay)

Bundle an external open source media player executable such as mpv or ffplay as a Tauri sidecar process, issuing playback commands through stdin JSON IPC pipes.

**Pros**:

- Extremely broad format support handling virtually every known audio and video format in existence.
- Robust playback logic maintained by large open source multimedia projects.

**Cons**:

- Bloats application binary size by tens of megabytes with unnecessary video rendering and container libraries.
- Managing external child process lifecycles introduces zombie processes, pipe stalls, and fragile crash recovery.
- Higher memory and CPU overhead compared to an embedded Rust library.

## Rationale

Option 1 is selected because it directly satisfies all four forces from Context:

First, Rodio runs audio rendering on a dedicated native operating system thread managed by CPAL. This guarantees that audio playback remains completely unaffected by React rendering cycles, CSS animations in the Midnight UI, or webview garbage collection. Option 2 fails this requirement because webview audio is subject to thread contention and background throttling.

Second, configuring Rodio with `symphonia-all` provides pure Rust decoders for MP3, FLAC, WAV, AAC, and OGG Vorbis. This ensures consistent decoding across all Windows installations without relying on external system codecs or webview platform variations.

Third, Rodio compiles directly into the Mutinhimira binary with negligible memory overhead (typically under 15 megabytes during active playback) and negligible CPU usage (under one percent), far outperforming the heavy external process model of Option 4.

Fourth, Option 1 avoids the reinventing the wheel pitfalls of Option 3. Rodio already provides battle tested sink abstractions, pause and resume primitives, volume gain scaling, and stream lifecycle management, while leaving room for future DSP audio filter additions.

Pairing the native Rodio engine with an `AudioService` abstraction in TypeScript allows frontend Zustand stores to cleanly subscribe to Tauri events while providing a mock fallback for fast Vitest execution in CI and browser preview development.
