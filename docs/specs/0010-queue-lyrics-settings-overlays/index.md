# 0010. Queue, lyrics, and settings overlays

**Date**: 2026-10-23
**Status**: Proposed

## Summary

This specification defines the architecture, user interface, and state management for the slide in queue drawer, immersive timestamped lyrics modal, and audio preferences settings dialog in Mumhanzi. It introduces modular feature components under src/components/queue/, src/components/lyrics/, and src/components/settings/, accompanied by reactive stores at src/store/useOverlayStore.ts and src/store/useSettingsStore.ts while extending src/store/usePlayerStore.ts. Following the Facade build approach, this feature delivers a slide in queue drawer with drag reordering and track removal, a glowing synchronised lyrics overlay with click to seek capability, and a settings panel for selecting audio output devices, crossfade duration, and visualizer styles with persistent local storage.

## Decision

**Chosen option**: Option 2: Dedicated slide in drawer and modal overlays governed by modular stores, native pointer drag reorder, and local storage persistence

Implement the queue, lyrics, and settings overlays as independent modular components coordinating through lightweight Zustand stores. Overlay visibility is centralised in `useOverlayStore`, audio preferences and mock devices are managed in `useSettingsStore` with local storage persistence, and queue mutation methods (reorder, remove, clear, jump) extend `usePlayerStore`. Queue track reordering uses zero dependency native HTML5 and pointer drag events. Synchronised lyrics use React refs with smooth auto scroll, debounced seek interaction, and manual scroll detection. Trigger buttons integrate into the PlayerFooter and sidebar navigation.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener playing music, I want to open a slide in queue drawer from the player bar so that I can see the currently playing song and upcoming tracks without leaving my active page.
- As a listener curating my listening session, I want to reorder upcoming tracks using drag gestures or remove songs from the queue so that I have control over what plays next.
- As a listener singing along or studying song words, I want an immersive lyrics overlay with synchronised scrolling lines that glow as the song plays so that I can follow track words in real time.
- As a listener navigating a track via lyrics, I want to click any lyric line to jump track audio playback directly to that timestamp so that I can replay specific song sections easily.
- As a listener customising my audio experience, I want a settings dialog accessible from the sidebar where I can choose audio output devices, adjust playback crossfade, and pick visualizer styles with settings saved across restarts.
- As a desktop user navigating with keyboard and mouse, I want to press Escape or click outside any open overlay to dismiss it quickly so that the player feels responsive and accessible.

**Acceptance criteria**:

- **AC-1**: Navigating to PlayerFooter displays a queue toggle button and a lyrics toggle button on the right controls area next to the volume slider, and the sidebar bottom area displays an audio settings gear button.
- **AC-2**: Clicking the queue button in PlayerFooter toggles the slide in queue drawer open from the right side of the screen with a smooth slide animation over the main content area without unmounting the active view.
- **AC-3**: In the queue drawer, the now playing section prominently renders the active track artwork, title, artist, live audio visualizer animation indicator, and remaining duration.
- **AC-4**: Below the now playing card, the upcoming queue displays all queued tracks with unique queue identifiers, drag handles, track title, artist name, duration, and an individual remove button that deletes songs from the queue.
- **AC-5**: Dragging an upcoming track row in the queue drawer reorders the queue sequence immediately using native pointer and drag events, updating the playback order in `usePlayerStore` without visual glitches or external drag packages.
- **AC-6**: Clicking any track in the upcoming queue jumps playback directly to that track immediately, updating the now playing card and preserving the remaining queue.
- **AC-7**: Clicking the Clear Queue action removes all upcoming songs while preserving the currently playing track, displaying a Midnight styled empty state illustration with an action button to queue recommended songs from Home.
- **AC-8**: Clicking the lyrics button in PlayerFooter opens the immersive lyrics modal over the application shell with an atmospheric frosted backdrop matching current album colors, displaying song title, artist, and large typography lyrics.
- **AC-9**: For tracks with synchronised timestamped lyrics, the active lyric line highlights with a glowing accent color and automatically scrolls smoothly into vertical center view as track playback time progresses.
- **AC-10**: Clicking on any timestamped lyric line immediately seeks track audio playback in `usePlayerStore` to that line timestamp, debouncing auto scroll to avoid jumpy animations and resuming live line tracking.
- **AC-11**: Manually scrolling the lyrics overlay with the mouse wheel or touch pad temporarily pauses auto scroll tracking, resuming automatic centering after three seconds of scroll inactivity. For tracks without timestamped lyrics, a Midnight fallback card displays plain text lyrics or a notice stating timed lyrics are unavailable.
- **AC-12**: Clicking the settings button opens the audio preferences modal dialog displaying mock audio output devices with active selection, volume normalisation toggle, crossfade duration slider from 0 to 12 seconds, visualizer style picker (bars, wave, glow, off), desktop notification toggle, and persistent storage in local storage with safe schema validation.
- **AC-13**: Pressing the Escape key on the keyboard or clicking the overlay backdrop closes any open drawer or modal overlay immediately, and focus remains trapped within the active modal for screen reader accessibility.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```typescript
export interface QueueItem {
  id: string; // Unique UUID for this queue instance
  trackId: string;
  track: Track;
  addedAt: number;
  sourceContext?: string; // e.g. "Album: Midnight", "Playlist: Favorites"
  isManuallyQueued: boolean;
}

export interface LyricLine {
  id: string;
  timeSeconds: number;
  text: string;
}

export interface TrackLyrics {
  trackId: string;
  isSynced: boolean;
  lines: LyricLine[];
  plainText?: string;
  source?: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  sampleRate: number;
  channels: number;
}

export type VisualizerStyle = "bars" | "wave" | "glow" | "off";

export interface UserSettings {
  id: string; // Singleton key "active-settings"
  outputDeviceId: string;
  volumeNormalization: boolean;
  crossfadeSeconds: number; // 0 to 12 seconds
  visualizerStyle: VisualizerStyle;
  notificationsEnabled: boolean;
  lyricsFontSize: "small" | "medium" | "large";
  updatedAt: number;
}
```

**State transitions**:

```
Overlay Visibility State Machine:
  [none] ──openOverlay("queue")──>   [queue] ──closeOverlay / Escape / backdrop──> [none]
  [none] ──openOverlay("lyrics")──>  [lyrics] ──closeOverlay / Escape / backdrop──> [none]
  [none] ──openOverlay("settings")──>[settings] ──closeOverlay / Escape / backdrop──>[none]

Queue Mutation Lifecycle:
  [Idle] ──addToQueue(track)──> [QueueItem Appended with unique UUID]
  [Idle] ──playNext(track)──>   [QueueItem Inserted immediately after currentIndex]
  [Idle] ──reorder(src, dest)──>[Array spliced and reordered in place]
  [Idle] ──remove(queueId)──>   [Item filtered out, currentIndex adjusted if needed]
  [Idle] ──clearUpcoming()──>   [Queue trimmed to currently playing track]

Lyrics Scroll Tracking:
  [Auto Tracking] ──user wheel/touch scroll──> [User Paused, 3s timeout timer]
  [User Paused]   ──3s timer expires / seek──> [Auto Tracking Centered]
```

**API surface**:

| Interface / Action | Method / Trigger | Key inputs | Key outputs | Auth / Scope | Key errors / Fallbacks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `useOverlayStore.openOverlay` | Client action | `overlay: "queue" \| "lyrics" \| "settings"` | Active overlay state updated | Local client | Closes existing open overlay |
| `useOverlayStore.closeOverlay` | Client action or Escape | None | `activeOverlay = "none"` | Local client | Safe no op if already closed |
| `useOverlayStore.toggleOverlay` | Button click | `overlay: "queue" \| "lyrics" \| "settings"` | Toggles between overlay and "none" | Local client | Safe switch |
| `usePlayerStore.playQueueItem` | Track click | `queueId: string` | Track plays, currentIndex updated | Local client | Ignores missing queueId |
| `usePlayerStore.addToQueue` | Context action | `track: Track` | Appends QueueItem with unique UUID | Local client | Allows duplicate song tracks |
| `usePlayerStore.playNext` | Context action | `track: Track` | Inserts QueueItem after current index | Local client | Immediate next playback priority |
| `usePlayerStore.removeFromQueue` | Remove button | `queueId: string` | Queue filtered, indices maintained | Local client | Preserves currentTrack if index differs |
| `usePlayerStore.reorderQueue` | Drag release | `sourceIndex: number, destIndex: number` | Reordered queue array | Local client | Bounds clamped safely |
| `usePlayerStore.clearUpcomingQueue` | Clear button | None | Trims queue to current playing track | Local client | Preserves active current track |
| `usePlayerStore.seekToLyricLine` | Lyric row click | `timeSeconds: number` | Audio seeks, playback continues | Local client | Clamps time between 0 and duration |
| `useSettingsStore.setOutputDevice` | Device select | `deviceId: string` | Updates settings and active device | Local client | Falls back to default device if invalid |
| `useSettingsStore.setCrossfade` | Slider change | `seconds: number (0 to 12)` | Updates crossfade in store | Local client | Clamped to integer 0 to 12 range |
| `useSettingsStore.setVisualizerStyle`| Radio card | `style: VisualizerStyle` | Updates visualizer animation | Local client | Defaults to "bars" if unknown |
| `useSettingsStore.resetToDefaults` | Reset button | None | Restores pristine default settings | Local client | Re writes local storage |

**Value sourcing**:

| Action | Value produced / displayed | Source |
| :--- | :--- | :--- |
| Open Queue Drawer | Upcoming tracks list, now playing card | `usePlayerStore.queue` and `usePlayerStore.currentTrack` |
| Reorder Queue Track | Updated track sequence indices | Native drag pointer event source and destination indices in `reorderQueue` |
| Remove Queue Track | Reduced upcoming queue list | Track unique queue instance ID passed to `removeFromQueue` |
| Jump to Queue Track | New active currentTrack and playback start | Track queue instance ID passed to `playQueueItem` |
| Clear Upcoming Queue | Empty upcoming list with current song playing | `clearUpcomingQueue` action retaining only `currentIndex` |
| Open Lyrics Modal | Timestamped lines, active song title, artist | `mockLyricsCatalog[trackId]` or generated lines, plus `usePlayerStore.currentTrack` |
| Highlight Active Lyric Line | Active line glowing typography index | Derived from matching `usePlayerStore.currentTime` against `lines[i].timeSeconds` |
| Seek to Lyric Line | Updated track playback time | Selected line `timeSeconds` passed to `usePlayerStore.seekTo` |
| Open Settings Modal | Available audio devices list, user preferences | `useSettingsStore.availableDevices` and `useSettingsStore.settings` |
| Change Audio Output Device | New active output device label | Device ID passed to `useSettingsStore.setOutputDevice` |
| Adjust Crossfade Slider | Numerical seconds display (0 to 12s) | Slider event value passed to `useSettingsStore.setCrossfade` |
| Change Visualizer Style | Active visualizer style card selection | Selected style passed to `useSettingsStore.setVisualizerStyle` |
| Close Overlay on Escape | Closed overlay state | Global keyboard event `e.key === "Escape"` calling `useOverlayStore.closeOverlay` |

**Key invariants**:

- Exactly zero or one overlay may be active at any given moment; opening a new overlay closes any previously open overlay.
- QueueItem instances always carry a unique UUID so identical tracks can be queued multiple times without React key collisions.
- Clearing upcoming tracks never removes or stops the currently playing track.
- Lyric timestamps must be strictly ordered ascending by timeSeconds; lines with invalid or negative timestamps are rejected or filtered.
- Local storage data loaded on application startup must be validated against a fallback schema; corrupted or unparseable JSON falls back cleanly to defaults without crashing the application.
- Escape key and backdrop clicks dismiss any active overlay without affecting audio playback.

**Security model**:

- All overlay operations execute strictly within the local desktop application context with zero external telemetry or network calls.
- Audio settings and device profiles persist safely in browser local storage under the namespace `mumhanzi:settings:v1`.
- Drag and drop operations rely on local pointer coordinates and internal component state, avoiding unvetted third party script execution.

**Configuration required**:

- No external API keys or server environment variables required. Settings persist client side via local storage keys.

**Critical test scenarios**:

- Happy path queue manipulation: Open queue drawer, verify now playing track matches current player track, drag to reorder upcoming tracks, click an upcoming track to start playback immediately, clear upcoming queue, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**.
- Happy path synchronised lyrics: Open lyrics modal, verify track title and artist match current track, observe active line change as currentTime advances, click a lyric line to seek audio playback, verify playback seeks and line highlights, verifies **AC-8**, **AC-9**, **AC-10**.
- Manual lyrics scroll pause: Scroll lyrics list manually with mouse wheel, verify auto scroll pauses for three seconds before resuming smooth centering, verifies **AC-11**.
- Lyrics fallback state: Play a track with missing timestamped lyrics, open lyrics modal, verify the fallback message renders gracefully without broken layouts, verifies **AC-11**.
- Settings persistence and device selection: Open settings dialog, select an alternative audio output device, adjust crossfade to 6 seconds, toggle volume normalisation, refresh page or reload store, verify saved settings persist accurately from local storage, verifies **AC-12**.
- Keyboard and backdrop dismissal: Press Escape while queue drawer is open, verify drawer closes; open settings modal and click frosted backdrop, verify modal closes, verifies **AC-13**.

## Build plan

1. Create domain types and mock fixtures for queue, lyrics, and audio settings in `src/types/overlays.ts`, `src/data/mockLyrics.ts`, and `src/data/mockAudioDevices.ts`, satisfies **AC-3**, **AC-8**, **AC-11**, **AC-12**.
2. Implement `useOverlayStore.ts` for centralized overlay visibility and `useSettingsStore.ts` for audio preferences with safe local storage persistence and schema validation, satisfies **AC-1**, **AC-2**, **AC-12**, **AC-13**.
3. Extend `usePlayerStore.ts` with queue mutation methods including `addToQueue`, `playNext`, `removeFromQueue`, `reorderQueue`, `clearUpcomingQueue`, and `playQueueItem`, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**.
4. Build modular queue drawer components in `src/components/queue/` (`QueueDrawer.tsx`, `QueueNowPlayingCard.tsx`, `QueueTrackList.tsx`, `QueueTrackRow.tsx`, `EmptyQueueState.tsx`) with native pointer drag reordering and track actions, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**.
5. Build modular lyrics modal components in `src/components/lyrics/` (`LyricsModal.tsx`, `LyricsLineRow.tsx`, `EmptyLyricsState.tsx`) with smooth centered auto scroll, click to seek, and manual scroll detection, satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**.
6. Build modular audio preferences settings components in `src/components/settings/` (`SettingsModal.tsx`, `AudioDeviceSelector.tsx`, `CrossfadeSlider.tsx`, `VisualizerPicker.tsx`) with interactive selection controls and reset to defaults action, satisfies **AC-12**.
7. Update `PlayerFooter.tsx` with queue and lyrics toggle buttons, and update `App.tsx` sidebar with settings gear trigger, overlay container portals, escape key listener, and backdrop click handling, satisfies **AC-1**, **AC-2**, **AC-8**, **AC-12**, **AC-13**.
8. Implement comprehensive unit and component test suite in `src/test/overlays.test.tsx` verifying queue reordering, lyrics auto scrolling, seek to lyric clicks, settings local storage persistence, and modal dismissal, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-12**, **AC-13**.

## Consequences

**Positive**:

- Gives listeners immediate access to upcoming queue curation, synchronised lyrics, and audio customization without disrupting active browsing.
- Follows Clean Architecture by isolating overlay visibility in `useOverlayStore`, audio preferences in `useSettingsStore`, and queue manipulation in `usePlayerStore`.
- Implements smooth drag reordering without adding bulky third party dependencies to the bundle.
- Prepares audio device contracts and preferences schema for direct integration with Rodio and native Tauri v2 audio engine in Phase 2.

**Negative**:

- Adding live auto scroll and drag reorder increases presentation layer component surface area.
- Synchronising time based lyrics requires continuous alignment with the simulated or native playback clock.

## Follow-up

- [ ] Connect `useSettingsStore` audio output device selection and volume normalisation to native Rust Rodio sink configuration when Phase 2 audio engine lands.
- [ ] Connect `useLyricsStore` to local LRC file parser and embedded Lofty ID3 USLT / SYLT tag extraction in Phase 2 local library scanner.
- [ ] Implement global media hotkeys for toggling queue and lyrics overlays directly via Tauri global shortcut plugin.
