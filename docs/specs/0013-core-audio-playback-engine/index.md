# 0013. Core audio playback engine

**Date**: 2026-10-24
**Status**: Accepted

## Summary

This specification defines the native audio playback engine architecture for Mutinhimira. It introduces an embedded audio subsystem in Rust using Rodio with Symphonia decoders, running audio playback on a dedicated native thread isolated from user interface rendering. Following the Clean Architecture boundaries and Facade delivery strategy, this foundation provides high fidelity local music decoding across standard formats (MP3, FLAC, WAV, AAC, and OGG Vorbis), thread safe playback state tracking, high resolution timeline streaming via Tauri events, and robust error recovery, cleanly replacing the frontend simulated timer with real desktop audio playback.

## Decision

**Chosen option**: Option 1: Native Rodio engine with Symphonia decoders, thread safe Mutex state container, background progress timer thread, and typed Tauri IPC bridge

Adopt Rodio version 0.20 with the `symphonia-all` feature set compiled into the native Rust core. Audio output is routed to the system default audio device with automatic stream reinitialization upon device disconnection or system wake. A thread safe state container protected by a Mutex manages live playback properties (active track, status, position, duration, volume, and mute flag) alongside the Rodio Sink handle. A lightweight background timer thread emits periodic progress events at 100 millisecond intervals during active playback, driving smooth timeline scrubber bars in the UI. Track completions emit dedicated events that allow the frontend Zustand queue store to advance playback seamlessly.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`)

## Requirements

**User stories**:

- As a listener playing local songs, I want local audio files to load and play immediately through my system speakers or headphones with zero UI stutter or latency.
- As a listener enjoying my music library, I want to play standard audio formats including MP3, FLAC, WAV, AAC, and OGG Vorbis without needing external codecs or players.
- As a listener controlling music playback, I want responsive play, pause, resume, stop, seek, volume, and mute controls in the player bar and fullscreen view.
- As a listener watching playback progress, I want the timeline slider and elapsed time counter to update smoothly in real time as the song plays.
- As a listener listening to queued albums or playlists, I want the player to advance automatically to the next song when the current track finishes.
- As a listener moving between desktop workspaces or unplugging headphones, I want playback to handle audio device changes gracefully without crashing the app.
- As an engineer testing the user interface in Vitest or standard browsers, I want an audio service abstraction with a mock fallback so tests and web previews run without requiring a native desktop runtime.

**Acceptance criteria**:

- **AC-1**: Cargo configuration includes Rodio 0.20 with default features disabled and `symphonia-all` enabled, providing native decoding for MP3, FLAC, WAV, AAC, and OGG Vorbis containers.
- **AC-2**: Native Rust `AudioEngine` initializes within Tauri setup, maintaining an `OutputStream` and `Sink` wrapped in an `Arc<Mutex<AudioEngineInner>>` registered into Tauri managed state.
- **AC-3**: Command `audio_play_track` accepts a track identifier and canonical file path, validates file existence and format whitelist, stops any currently playing audio, loads the file source into a fresh Sink, and begins playback.
- **AC-4**: Transport commands `audio_pause`, `audio_resume`, and `audio_stop` correctly alter the playback state and control the native Rodio Sink without dropping the audio stream.
- **AC-5**: Command `audio_seek` repositions the active stream to the specified floating point second offset using `Sink::try_seek` with fallback stream reopening, clamped between zero and total track duration.
- **AC-6**: Commands `audio_set_volume` and `audio_set_muted` adjust output gain smoothly between 0.0 and 1.0, updating live state and persisting volume preferences into SQLite `player_settings`.
- **AC-7**: Dedicated background thread emits `audio:position` events every 100 milliseconds while status is `Playing`, providing track identifier, current seconds, total duration, and playback state.
- **AC-8**: Engine emits `audio:state-changed` events upon any state transition (`Stopped`, `Loading`, `Playing`, `Paused`), updating UI presentation components immediately.
- **AC-9**: When a song reaches natural completion, the engine detects Sink emptiness and emits an `audio:track-ended` event with normal completion flag, enabling the frontend Zustand queue store to advance to the next track.
- **AC-10**: Missing, unreadable, or corrupted audio files emit an `audio:error` event containing structured error codes (`FILE_NOT_FOUND`, `DECODE_ERROR`, `DEVICE_ERROR`), stopping playback cleanly and triggering an inline notification toast in the UI.
- **AC-11**: Track play counter increments and `last_played_at` updates in SQLite table `tracks` once continuous playback crosses 30 seconds or half duration, recorded at most once per playback session via a session flag.
- **AC-12**: Frontend `AudioService` provides a clean TypeScript interface with Tauri IPC command invocations and event subscriptions, including an automated mock implementation for browser previews and Vitest suites.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```rust
// Rust Domain Models (src-tauri/src/audio/models.rs)

/// Playback status lifecycle states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackStatus {
    Stopped,
    Loading,
    Playing,
    Paused,
}

/// In memory runtime audio playback state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPlaybackState {
    pub track_id: Option<String>,
    pub file_path: Option<String>,
    pub status: PlaybackStatus,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub volume: f32,
    pub is_muted: bool,
    pub session_id: u64,
    pub play_count_recorded: bool,
}

/// DTO emitted to frontend on state changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPlaybackStateDto {
    pub track_id: Option<String>,
    pub file_path: Option<String>,
    pub status: PlaybackStatus,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub volume: f32,
    pub is_muted: bool,
}

/// High resolution position event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPositionDto {
    pub track_id: String,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub is_playing: bool,
}

/// Structured error payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioErrorDto {
    pub code: String,
    pub message: String,
    pub track_id: Option<String>,
}
```

```sql
-- SQLite Player Settings Keys (stored in existing player_settings table)
-- key: 'playback_volume' -> value: '0.8'
-- key: 'playback_is_muted' -> value: 'false'
-- key: 'playback_last_track_id' -> value: 'uuid-string'
-- key: 'playback_last_position' -> value: '107.5'
```

**State transitions**:

```text
[Stopped] -- audio_play_track --> [Loading]
[Loading] -- stream ready --> [Playing]
[Loading] -- decode error --> [Stopped] (emits audio:error)
[Playing] -- audio_pause --> [Paused]
[Paused]  -- audio_resume --> [Playing]
[Playing] -- track finished --> [Stopped] (emits audio:track-ended)
[Playing] -- audio_stop --> [Stopped]
[Paused]  -- audio_stop --> [Stopped]
[Playing] -- device disconnect --> [Paused] (attempts stream recovery)
```

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `audio_play_track` | Tauri Command | `track_id: String`, `file_path: String`, `start_position: Option<f64>` | `AudioPlaybackStateDto` | Desktop window | `FILE_NOT_FOUND`, `DECODE_ERROR`, `DEVICE_ERROR` |
| `audio_pause` | Tauri Command | none | `AudioPlaybackStateDto` | Desktop window | `NOT_PLAYING` |
| `audio_resume` | Tauri Command | none | `AudioPlaybackStateDto` | Desktop window | `NOT_PAUSED`, `DEVICE_ERROR` |
| `audio_stop` | Tauri Command | none | `AudioPlaybackStateDto` | Desktop window | none |
| `audio_seek` | Tauri Command | `position_seconds: f64` | `AudioPlaybackStateDto` | Desktop window | `SEEK_FAILED`, `NOT_LOADED` |
| `audio_set_volume` | Tauri Command | `volume: f32` | `()` | Desktop window | `INVALID_VOLUME` |
| `audio_set_muted` | Tauri Command | `muted: bool` | `()` | Desktop window | none |
| `audio_get_state` | Tauri Command | none | `AudioPlaybackStateDto` | Desktop window | none |

**Tauri event stream**:

| Event name | Emitted when | Payload | Frequency |
|---|---|---|---|
| `audio:position` | Playback active | `AudioPositionDto` | Every 100 milliseconds |
| `audio:state-changed` | Any status or track transition | `AudioPlaybackStateDto` | On state change |
| `audio:track-ended` | Track finishes naturally | `{ track_id: String, completed: bool }` | On track completion |
| `audio:error` | File, decode, or device error occurs | `AudioErrorDto` | On failure |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `audio_play_track` | Track duration | Extracted from Symphonia stream header metadata during file opening, falling back to SQLite track duration |
| `audio_play_track` | Active track identifier | Passed as `track_id` command parameter from frontend store |
| `audio_play_track` | Audio sample data | Read from filesystem path validated by `file_path` command parameter |
| `audio_seek` | New timeline position | Parameter `position_seconds`, clamped to `[0.0, duration]` |
| `audio_set_volume` | Audio output amplitude | Parameter `volume` (0.0 to 1.0), applied to Rodio Sink and saved to SQLite `player_settings` |
| `audio:position` | Current elapsed seconds | Rodio Sink position clock verified against monotonic playback start timestamp |
| `audio:position` | Total track duration | Cached duration in `AudioPlaybackState` established at track load time |
| Play counter increment | Increment count in SQLite | Evaluated in Rust background thread when `position_seconds >= 30.0` or `>= duration / 2.0` |
| Startup session restore | Initial track and volume | Read from SQLite `player_settings` keys `playback_volume`, `playback_last_track_id`, and `playback_last_position` |

**Key invariants**:

- The native `OutputStream` must remain referenced in memory while the application is active; dropping it terminates all hardware audio output.
- Volume values must always remain strictly clamped between 0.0 and 1.0; muted state sets Sink volume to 0.0 while preserving the underlying unmuted volume setting.
- Rapid seek actions are protected by monotonic session tokens and debouncing, discarding outdated seek completions so audio buffers never glitch.
- Play count increments occur at most once per played track session, reset only when a distinct track is loaded or playback restarts from zero.
- The audio engine never blocks the main UI thread; all disk reads and audio decoding occur inside Rodio background audio threads.

**Security model**:

- Audio file paths must resolve to canonical absolute filesystem paths on local drives.
- File extensions are restricted to an allowed whitelist (`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.opus`).
- Tauri IPC commands are registered in `src-tauri/capabilities/default.json` with execution strictly scoped to the primary application window.
- Network URLs and remote streaming endpoints are rejected; the engine operates exclusively on local filesystem audio assets.

**Configuration required**:

- No external API keys or secrets are required.
- Default settings stored in SQLite `player_settings` on first run: `playback_volume = "0.8"`, `playback_is_muted = "false"`.

**Critical test scenarios**:

- Happy path: Select a local song, verify `audio_play_track` loads the file, audio streams to the output device, `audio:position` events update the UI timeline smoothly, pause halts audio, resume continues playback, and volume adjusts cleanly (verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-7**, **AC-8**).
- Natural track completion: Play a short audio clip to completion, verify `audio:track-ended` emits upon Sink emptiness, and frontend store transitions automatically to the next queued item (verifies **AC-9**).
- Seeking and scrubbing: Scrub the timeline slider across a track, verify `audio_seek` updates position reliably, playback continues from the target offset, and rapid seeks do not produce audio artifacts (verifies **AC-5**).
- Missing file handling: Issue `audio_play_track` with a non existent file path, verify `audio:error` emits with `FILE_NOT_FOUND`, engine returns to stopped state, and UI displays an error notification without crashing (verifies **AC-10**).
- Play count milestone: Play an indexed song past thirty seconds, verify the database `play_count` increments by one and `last_played_at` updates in SQLite, and verify subsequent seeks within the same play session do not trigger duplicate increments (verifies **AC-11**).
- Browser and Vitest test isolation: Execute frontend test suite in Node and browser environments, verifying `AudioService` mock handles commands and simulates event emissions without requiring Tauri native binary (verifies **AC-12**).

## Build plan

Following the project Facade build approach, the implementation connects the native Rust audio core to the existing clickable shell components, transitioning `usePlayerStore` from simulated timer ticks to real desktop audio playback.

1. [x] Configure Cargo dependencies adding Rodio 0.20 with `default-features = false` and `features = ["symphonia-all"]`, satisfies **AC-1**
2. [x] Implement audio domain models, error enumerations, and thread safe `AudioEngine` container holding `OutputStream`, `Sink`, and `AudioPlaybackState` in Rust, satisfies **AC-2**, **AC-8**
3. [x] Implement file path canonicalization, format whitelist validation, stream duration extraction, and `audio_play_track` command handler, satisfies **AC-3**, **AC-10**
4. [x] Implement transport control commands `audio_pause`, `audio_resume`, `audio_stop`, `audio_seek`, `audio_set_volume`, and `audio_set_muted`, satisfies **AC-4**, **AC-5**, **AC-6**
5. [x] Implement background progress timer thread emitting `audio:position` events at 100 millisecond intervals and Sink completion monitor emitting `audio:track-ended`, satisfies **AC-7**, **AC-9**
6. [x] Wire play count and timestamp milestone update logic into SQLite database manager, satisfies **AC-11**
7. [x] Register audio IPC commands in `src-tauri/src/lib.rs` and configure Tauri v2 permissions in capabilities JSON, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**
8. [x] Create frontend TypeScript contracts and `AudioService` abstraction in `src/services/audio.ts` with Tauri IPC invocations and browser mock fallback, satisfies **AC-12**
9. [x] Wire `usePlayerStore.ts` to `AudioService`, replacing simulated timer with Tauri event subscriptions for real time playback updates, queue advancement, and volume persistence, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**
10. [x] Write comprehensive Rust unit and integration test suite in `src-tauri` and Vitest component tests in `src/services/__tests__/audio.test.ts`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:

- High quality native audio playback decoding MP3, FLAC, WAV, AAC, and OGG Vorbis with zero external codecs.
- Pure Rust playback engine guarantees memory safety and direct hardware access without Chromium media pipeline bloat.
- Dedicated audio thread completely isolates audio rendering from frontend React garbage collection or rendering load.
- Smooth 100 millisecond progress events provide fluid timeline scrubber updates in the Midnight player bar.
- Automatic play count and session persistence keep listening statistics accurate across restarts.
- Full Vitest mock support allows continuing fast web development without needing the desktop runner.

**Negative / tradeoffs**:

- Crate compilation time increases slightly when compiling Symphonia decoders into the release binary.
- Operating system audio device changes require stream reinitialization logic in Rust.

**Neutral**:

- Frontend `usePlayerStore` retains its familiar public API while switching underlying transport logic to native Tauri IPC.
- Timeline slider updates arrive as push events from Tauri rather than polling intervals.

## Follow-up

- [ ] Connect SQLite track records directly from Feature 15 local library scanner into the player playback queue.
- [ ] Investigate Windows System Media Transport Controls (SMTC) integration in a future deferred audio milestone for global hardware media key handling.
- [ ] Explore multi band audio equalizer DSP filters using Rodio source filters when addressing the deferred equalizer feature.
