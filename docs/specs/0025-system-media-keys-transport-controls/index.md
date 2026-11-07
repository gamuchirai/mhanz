# 0025. System media keys and transport controls

**Date**: 2026-11-07
**Status**: In Progress

## Summary

This specification introduces operating system media keys and transport controls integration for Mutinhimira on Windows desktop devices. It enables hardware keyboard multimedia keys (play, pause, next track, and previous track) and the Windows volume flyout overlay to control music playback while displaying track metadata and album artwork. Following the Journey delivery strategy, this capability synchronizes native playback state cleanly from the frontend player store over local IPC and provides an optional toggle in application settings.

## Requirements

**User stories**:
* As a listener working in another desktop application, I want to use my keyboard media keys to play, pause, or skip songs without bringing Mutinhimira to the foreground.
* As a listener adjusting system volume on Windows, I want the volume flyout to show the active song title, artist, album name, and album artwork so I know what is currently playing.
* As a listener managing active playback, I want clicking the transport buttons on the Windows lock screen or volume overlay to control playback smoothly.
* As a listener who prefers another media player to claim priority on global keys, I want an option in Settings to turn off system media controls.
* As an engineer running automated Vitest suites or browser previews, I want a clean mock service so tests run reliably without native desktop errors.

**Acceptance criteria**:
* **AC-1**: Cargo configuration includes the souvlaki crate (version 0.7 or compatible), providing native integration with Windows System Media Transport Controls (SMTC) alongside an abstraction ready for other desktop platforms.
* **AC-2**: Native Rust MediaControlsManager initializes during application setup using the main window handle (HWND on Windows), stored within Tauri managed state with thread safe synchronization.
* **AC-3**: Command `media_controls_set_metadata` accepts track identifier, title, artist, album name, and duration seconds, updating the Windows System Media Transport Controls display updater with current song details.
* **AC-4**: When updating metadata, the native backend retrieves the cached cover art path from SQLite using the track identifier; if the image is in PNG or JPEG format, it loads it as a local file URI (`file:///...`), falling back to the bundled application icon for WebP or missing artwork.
* **AC-5**: Command `media_controls_set_playback_status` updates the Windows media controls playback state to Playing, Paused, or Stopped, synchronizing timeline position on state transitions and seek events without continuous high frequency polling.
* **AC-6**: Operating system media controls detach and clear active metadata when playback is stopped, when the queue is emptied, or when the application exits, preventing phantom controls in Windows.
* **AC-7**: Native event listener captures hardware media keys (Play, Pause, PlayPause toggle, Next Track, Previous Track, Stop, and Seek) and Windows flyout button clicks, emitting a `media-controls:action` Tauri event to the frontend.
* **AC-8**: Frontend MediaControlsService listens for `media-controls:action` events and coordinates with `usePlayerStore` to toggle playback, advance to next track, return to previous track, or seek without desynchronizing the playback queue.
* **AC-9**: When running in browser previews or automated Vitest test environments, MediaControlsService provides an automated mock implementation that avoids invoking native Tauri commands and emits no runtime errors.
* **AC-10**: UserSettings data model includes `systemMediaControlsEnabled` boolean (defaulting to true), persisted in SQLite `app_settings` and local storage.
* **AC-11**: Settings modal includes a toggle switch under Playback preferences labeled System Media Controls, allowing users to enable or disable operating system transport controls and global media keys.
* **AC-12**: Toggling `systemMediaControlsEnabled` off invokes `media_controls_set_enabled(false)` to detach operating system media listeners, while toggling it on initializes and rebinds controls to the currently playing track.

## Decision

**Chosen option**: Option 1: Native souvlaki integration in Tauri managed state, driven exclusively by frontend player store IPC commands and events

Adopt the souvlaki crate in the Rust backend to manage Windows System Media Transport Controls (SMTC) and hardware media key hooks. The media manager binds directly to the main window handle during application setup and resides in Tauri managed state. The frontend player store maintains single source of truth for the playback queue and drives metadata and playback status over IPC. Operating system transport actions are emitted to the frontend and dispatched safely to player store actions. User preference is persisted via UserSettings in SQLite and local storage.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```typescript
// Extended UserSettings in src/types/overlays.ts
export interface UserSettings {
  id: string;
  outputDeviceId: string;
  volumeNormalization: boolean;
  crossfadeSeconds: number;
  visualizerStyle: VisualizerStyle;
  notificationsEnabled: boolean;
  lyricsFontSize: "small" | "medium" | "large";
  fullscreenDefaultView: FullscreenViewMode;
  fullscreenAutoHideChrome: boolean;
  systemMediaControlsEnabled: boolean; // default true
  updatedAt: number;
}
```

```rust
// In memory Rust models in src-tauri/src/media_controls/models.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadataDto {
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_seconds: Option<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaPlaybackStatusDto {
    Playing,
    Paused,
    Stopped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaControlActionEvent {
    pub action: String, // "play", "pause", "toggle", "next", "previous", "stop", "seek"
    pub position_seconds: Option<f64>,
}
```

**State transitions**:

Operating system media controls reflect the playback lifecycle:
* `Uninitialized` -> `Active` (when application starts with `systemMediaControlsEnabled` true)
* `Active` + Track Loaded -> `Playing` (SMTC shows track title, artist, album art, duration, timeline slider)
* `Playing` -> `Paused` (SMTC switches icon to play symbol, preserves track metadata and current elapsed position)
* `Paused` -> `Playing` (SMTC switches icon to pause symbol, resumes timeline slider)
* `Playing` / `Paused` -> `Stopped` (SMTC clears active metadata, disables playback buttons)
* `Active` -> `Detached` (when user disables `systemMediaControlsEnabled` in Settings or application exits)

**API surface**:

| Endpoint / Command | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `media_controls_set_metadata` | Tauri IPC | `metadata: MediaMetadataDto` | `Ok(())` | Local desktop IPC | Invalid metadata, internal handle error |
| `media_controls_set_playback_status` | Tauri IPC | `status: MediaPlaybackStatusDto`, `position_seconds: Option<f64>` | `Ok(())` | Local desktop IPC | State transition failure |
| `media_controls_set_enabled` | Tauri IPC | `enabled: bool` | `Ok(())` | Local desktop IPC | Handle detachment error |
| `media_controls_clear` | Tauri IPC | None | `Ok(())` | Local desktop IPC | Detach failure |
| `media-controls:action` | Tauri Event | None | `{ action: string, position_seconds?: number }` | Local event bus | None |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `media_controls_set_metadata` | Song title | `currentTrack.title` from `usePlayerStore` |
| `media_controls_set_metadata` | Recording artist | `currentTrack.artist` from `usePlayerStore` |
| `media_controls_set_metadata` | Album release name | `currentTrack.album` from `usePlayerStore` |
| `media_controls_set_metadata` | Total track duration | `currentTrack.durationSeconds` from `usePlayerStore` |
| `media_controls_set_metadata` | Cover art image | Resolved by Rust backend from SQLite `cover_art_path` via `track_id`, or bundled PNG application icon |
| `media_controls_set_playback_status` | Playback state | Derived from `usePlayerStore.isPlaying` on play, pause, and stop transitions |
| `media_controls_set_playback_status` | Playback progress seconds | `usePlayerStore.currentTime` passed only on state transitions and manual seek events |
| `media-controls:action` | Requested transport action | Operating system event captured by souvlaki event loop |
| `useSettingsStore.setSystemMediaControlsEnabled` | Media controls toggle state | User toggle switch interaction in Settings modal |

**Action dispatch mapping**:
Frontend `MediaControlsService` receives `media-controls:action` events and routes them to `usePlayerStore` using strict state guards:
* `"play"`: if `!isPlaying`, invoke `togglePlayPause()`
* `"pause"`: if `isPlaying`, invoke `togglePlayPause()`
* `"toggle"`: invoke `togglePlayPause()`
* `"stop"`: if `isPlaying`, invoke `togglePlayPause()`; invoke `seekTo(0)`
* `"next"`: invoke `nextTrack()`
* `"previous"`: invoke `previousTrack()`
* `"seek"`: invoke `seekTo(position_seconds)` when position is provided

**Key invariants**:
* The frontend Zustand queue store remains the single source of truth for queue ordering, track navigation, shuffle, and repeat logic.
* AudioEngine remains strictly decoupled from operating system media controls; all SMTC updates originate from the player store over IPC.
* Timeline position is synchronized with SMTC only on play, pause, and seek events; Windows automatically interpolates timeline progress between transitions.
* Windows SMTC accepts PNG and JPEG images; if artwork is WebP or missing, the media manager automatically falls back to the bundled PNG application icon.
* When playback is stopped, the queue is cleared, or the application exits, the Windows media controls display is cleared to prevent phantom controls.

**Security model**:
All media control commands run strictly over local Tauri IPC with zero network connectivity or external transmission. Cover art paths are constrained to verified local application data folders and validated music directories.

**Configuration required**:
None. No environment variables or third party credentials are required.

**Critical test scenarios**:
* Happy path: Starting music playback updates the Windows media overlay with title, artist, album, duration, and cover art, and pressing media keys toggles playback and changes tracks, verifies **AC-3**, **AC-5**, **AC-7**, **AC-8**.
* Failure case: Playing a track with WebP or missing artwork loads the application default PNG icon fallback cleanly without errors, verifies **AC-4**.
* Edge case: Running outside Tauri desktop environment in Vitest unit tests activates the mock service and completes without errors, verifies **AC-9**.
* User preference: Disabling system media controls in Settings detaches native hooks and stops intercepting global keys, verifies **AC-10**, **AC-11**, **AC-12**.

## Build plan

Following the Journey delivery strategy, the build plan is organized by complete user paths:

### Journey 1: Operating System Media Controls Integration and State Synchronization
1. [x] Add `souvlaki` crate dependency to `src-tauri/Cargo.toml` and configure Windows platform bindings, satisfies **AC-1**
2. [x] Implement native `MediaControlsManager` in `src-tauri/src/media_controls/` attached to main window HWND in Tauri managed state, satisfies **AC-2**
3. [x] Create Tauri IPC commands `media_controls_set_metadata`, `media_controls_set_playback_status`, and `media_controls_clear` in `src-tauri/src/commands/media_controls.rs` and register in `src-tauri/src/lib.rs`, satisfies **AC-3**, **AC-5**, **AC-6**
4. [x] Implement cover artwork loader in `MediaControlsManager` with SQLite `cover_art_path` lookup, format verification (PNG and JPEG), and bundled PNG application icon fallback, satisfies **AC-4**
5. [x] Connect `usePlayerStore` track changes and play/pause/seek events to invoke `media_controls_set_metadata` and `media_controls_set_playback_status`, satisfies **AC-3**, **AC-5**
6. [x] Hook application exit in `src-tauri/src/lib.rs` to clear and detach media controls cleanly, satisfies **AC-6**

### Journey 2: Hardware Media Keys and Interactive OS Transport Actions
7. [x] Implement native event pump inside `MediaControlsManager` to capture media key events and emit `media-controls:action` Tauri events, satisfies **AC-7**
8. [x] Create frontend `MediaControlsService` in `src/services/mediaControls.ts` with Tauri IPC invocations and browser mock fallback, satisfies **AC-8**, **AC-9**
9. [x] Integrate `useMediaControls` listener coordinator in application shell to route incoming operating system actions to `usePlayerStore` methods with action dispatch mapping and transition throttling, satisfies **AC-8**

### Journey 3: User Settings and Playback Preferences Control
10. [x] Extend `UserSettings` schema in `src/types/overlays.ts` and `useSettingsStore.ts` with `systemMediaControlsEnabled` property and SQLite persistence, satisfies **AC-10**
11. [x] Add System Media Controls toggle switch to `src/components/settings/SettingsModal.tsx` under Playback settings, satisfies **AC-11**
12. [x] Implement `media_controls_set_enabled` command and wire dynamic attach and detach in `useSettingsStore`, satisfies **AC-12**

## Consequences

**Positive**:
* Listeners can control music playback seamlessly from any application using keyboard media keys and Windows volume flyouts.
* Rich metadata and album art display provides a polished native desktop experience matching Windows Groove.
* Queue logic remains cleanly centralized in frontend Zustand stores, avoiding logic duplication in Rust.
* Automated browser mock ensures existing Vitest test suites continue passing with zero friction.
* Eliminating high frequency position polling prevents IPC thrashing and reduces CPU overhead.

**Negative / tradeoffs**:
* Adds the souvlaki crate dependency and native Windows message handling.
* Windows System Media Transport Controls display updater requires local file URIs and PNG or JPEG formatting, necessitating format checking and fallback handling.

**Neutral**:
* UserSettings schema adds one boolean field, seamlessly handled by existing settings serialization without requiring SQLite table alterations.

## Follow-up

* [ ] Add unit test coverage in Vitest verifying MediaControlsService mock behavior and usePlayerStore action handling.
* [ ] Verify Windows lock screen and volume flyout rendering across Windows 10 and Windows 11 desktop environments during /check verify.
