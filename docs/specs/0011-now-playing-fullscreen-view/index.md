# 0011. Now playing fullscreen view

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user interface, and state management for the full screen now playing immersion view in Mutinhimira. It introduces modular feature components under src/components/fullscreen/ along with extensions to src/store/useOverlayStore.ts, src/types/discovery.ts, and src/types/overlays.ts. Following the Facade build approach, this feature delivers a full viewport overlay that conceals the sidebar and bottom player bar, presenting an ambient gradient mesh, an enlarged album artwork stage, a synchronized lyrics stream with click to seek capability, an audio visualizer canvas capped at 720p for battery efficiency, full width timeline scrubbing, and an auto hide timer for controls during inactive listening.

## Decision

**Chosen option**: Option 3: Dedicated full viewport overlay layer with ambient gradient mesh, multi mode center stage, and inactivity auto hide

Implement the full screen immersion view as a top level overlay layer mounted in App.tsx and managed through `useOverlayStore`. This layer completely covers the root grid, sidebar, and PlayerFooter with a smooth opacity transition. The center stage offers three switchable modes (Artwork cover, Synchronized lyrics stream, and Canvas audio visualizer), while an auto hide timer clears chrome after four seconds of user inactivity.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener immersed in music, I want to expand the current track into a full screen view so that I can enjoy a distraction free visual and audio experience.
- As a listener admiring album visuals, I want to see enlarged cover art with dynamic ambient colors so that the visual presentation feels premium and alive.
- As a listener singing along, I want to switch the center stage to synchronized lyrics that scroll automatically and let me click any line to seek so that I can sing and practice comfortably.
- As a listener watching the beat, I want a 60fps audio visualizer rendered on canvas so that I can enjoy dynamic waveforms matching my preferred visualizer style without burning processor power.
- As a desktop user sitting back from the screen, I want playback controls and the mouse cursor to auto hide after four seconds of inactivity so that only the pure artwork or lyrics remain visible.
- As a keyboard user, I want familiar shortcuts such as Space, Arrow keys, Escape, L, V, and M to control playback and view modes so that navigation is quick and effortless.
- As an accessible desktop application user, I want focus trapped within the full screen dialog on opening and restored to the originating button on exit so that screen reader navigation is seamless.

**Acceptance criteria**:

- **AC-1**: PlayerFooter renders interactive click targets on the album artwork thumbnail, song title text, and a dedicated expand icon button with clear tooltips and aria labels.
- **AC-2**: Clicking any entry trigger in PlayerFooter when an active track is loaded opens the fullscreen now playing view as a fixed full viewport overlay (`activeOverlay === "fullscreen"`), smoothly covering the sidebar and player bar without reloading the active page.
- **AC-3**: Opening the view when `currentTrack` is null is prevented; if playback completes and the queue finishes with repeat disabled, the view renders an empty immersion slate with placeholder art and a return button.
- **AC-4**: The top utility bar renders a return button with tooltip, breadcrumb text with current track title and artist, and a three segment view switch allowing instant toggling between Artwork, Lyrics, and Visualizer modes.
- **AC-5**: The view backdrop renders an atmospheric ambient gradient mesh derived from `currentTrack.ambientColors` (primary, secondary, accent) over the deep obsidian `#0b0706` background, with graceful fallback gradients when ambient colors are omitted.
- **AC-6**: In Artwork view mode, the center stage presents an enlarged album artwork image with smooth rounded corners, glowing drop shadow, title, artist, album metadata, and a toggle heart like button synchronised with `usePlayerStore`.
- **AC-7**: In Lyrics view mode, the center stage presents a flowing stream of timestamped lyrics from `lyricsFixtures` where the active lyric line highlights in accent color and auto scrolls to vertical center, and clicking any lyric line immediately seeks track audio playback to that timestamp.
- **AC-8**: In Visualizer view mode, an HTML5 Canvas 2D element renders animated 60fps audio waveforms and frequency bars matching the active `visualizerStyle` in `useSettingsStore`, with drawing buffer dimensions capped at 720p resolution for processor and battery conservation.
- **AC-9**: The bottom playback deck features a full width interactive timeline scrubber with tabular numeric time indicators, supporting mouse dragging, mouse clicking, and Arrow key seeking.
- **AC-10**: Dedicated primary playback controls in the bottom deck include large central Play Pause toggle button, Previous track, Next track, Shuffle toggle, Repeat mode cycle (`off`, `all`, `one`), and Volume slider with mute button.
- **AC-11**: Top header bar, bottom playback deck, and mouse cursor automatically fade out smoothly after four seconds of user inactivity, reappearing immediately upon any mouse movement, touch interaction, or keypress.
- **AC-12**: Keyboard shortcuts are scoped to the active fullscreen view: Space toggles play pause, Left Arrow seeks back 5 seconds, Right Arrow seeks forward 5 seconds, Escape key exits the view, L toggles lyrics mode, V toggles visualizer mode, and M toggles mute.
- **AC-13**: Clicking the return button or pressing Escape dismisses the view, restoring the previous page view and focusing the originating trigger element in PlayerFooter.
- **AC-14**: Fullscreen preferences (`fullscreenDefaultView` and `fullscreenAutoHideChrome`) persist within `UserSettings` in local storage, restoring the user's preferred view mode on subsequent activations.
- **AC-15**: Screen reader accessibility is supported via `role="dialog"`, `aria-modal="true"`, and `aria-label="Now playing fullscreen view"`, with focus trapped within the overlay on mount and restored on dismissal.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```typescript
// Extended Track entity in src/types/discovery.ts
export interface AmbientColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl?: string;
  ambientColors?: AmbientColorPalette;
  isLiked?: boolean;
  playCount?: number;
  genre?: string;
}

// Extended UserSettings in src/types/overlays.ts
export type FullscreenViewMode = "artwork" | "lyrics" | "visualizer";

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
  updatedAt: number;
}

// Extended OverlayState in src/store/useOverlayStore.ts
export type OverlayType = "none" | "queue" | "lyrics" | "settings" | "fullscreen";

export interface OverlayState {
  activeOverlay: OverlayType;
  fullscreenViewMode: FullscreenViewMode;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
  toggleOverlay: (overlay: OverlayType) => void;
  setFullscreenViewMode: (mode: FullscreenViewMode) => void;
}
```

**State transitions**:

```
[Default App View]
      │
      │ User clicks thumbnail, title, or expand button in PlayerFooter
      ▼
[Fullscreen Overlay: Opening]
      │
      │ Mounts overlay, locks body scroll, initializes focus trap, reads user settings
      ▼
[Fullscreen Overlay: Active View]
      ├──────► Mode: Artwork (enlarged cover, metadata, like toggle)
      ├──────► Mode: Lyrics (synchronized auto scroll, click to seek)
      └──────► Mode: Visualizer (60fps canvas at 720p, responsive waves)
      │
      │ Inactivity timer (4s elapsed without mouse move or keypress)
      ▼
[Fullscreen Overlay: Chrome Hidden]
      │
      │ Mouse move, click, or keypress detected
      ▼
[Fullscreen Overlay: Chrome Restored]
      │
      │ User presses Escape or clicks return button
      ▼
[Default App View] (Focus restored to originating trigger button)
```

**API surface**:

| Function / Component | Surface | Key inputs | Key outputs | State binding | Key errors |
|---|---|---|---|---|---|
| `NowPlayingFullscreen` | Component | none | React portal / dialog element | `useOverlayStore`, `usePlayerStore`, `useSettingsStore` | Graceful fallback if `currentTrack` is missing |
| `openOverlay("fullscreen")` | Store action | `"fullscreen"` | Updates `activeOverlay` | `useOverlayStore` | Ignored if `currentTrack` is null |
| `setFullscreenViewMode` | Store action | mode: `FullscreenViewMode` | Updates `fullscreenViewMode` | `useOverlayStore`, syncs to `useSettingsStore` | Reverts to `"artwork"` if mode is invalid |
| `FullscreenArtwork` | Component | `track: Track`, `isLiked: boolean` | Cover art hero with details | `usePlayerStore.toggleLike` | Image error triggers disc icon fallback |
| `FullscreenLyricsView` | Component | `trackId: string`, `currentTime: number` | Scrolling synchronized lyric lines | `usePlayerStore.seekToLyricLine` | Displays plain notice if lyrics absent |
| `FullscreenVisualizer` | Component | `style: VisualizerStyle`, `isPlaying: boolean` | 720p canvas rendering at 60fps | `requestAnimationFrame` render loop | Graceful cleanup on unmount |
| `FullscreenDeck` | Component | Playback state props | Timeline scrubber, transport buttons | `usePlayerStore` transport actions | Tabular time clamping on seek |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Mount fullscreen view | Track title, artist, album name, artwork URL | `currentTrack` in `usePlayerStore` |
| Paint ambient backdrop | Primary, secondary, accent gradient colors | `currentTrack.ambientColors` or default obsidian gradient |
| Timeline scrubber | Current progress seconds and total duration | `currentTime` and `currentTrack.durationSeconds` in `usePlayerStore` |
| Artwork stage | Enlarged artwork image and like status | `currentTrack.artworkUrl` and `likedTrackIds` in `usePlayerStore` |
| Lyrics stage | Timestamped lyric lines and active highlighted line | `sampleLyricsMap[currentTrack.id]` in `lyricsFixtures.ts` and `currentTime` |
| Visualizer stage | Animated frequency bars and wave paths | `visualizerStyle` in `useSettingsStore` and Canvas render loop |
| Playback deck | Play pause state, shuffle, repeat, volume, mute | `isPlaying`, `isShuffle`, `repeatMode`, `volume`, `isMuted` in `usePlayerStore` |
| View mode tabs | Active view indicator (`artwork`, `lyrics`, `visualizer`) | `fullscreenViewMode` in `useOverlayStore` |
| Auto hide chrome | Opacity values for header, transport, and cursor | Local inactivity timer tracking `lastActivity` timestamp |
| Dismiss view | Restores previous active screen and focuses trigger | `closeOverlay()` in `useOverlayStore` and stored trigger button ref |

**Key invariants**:

- Fullscreen view cannot open when `currentTrack` is null; clicking entry triggers in that state is a no operation.
- The audio visualizer canvas drawing buffer is capped at a maximum width of 1280 pixels and height of 720 pixels regardless of screen pixel density.
- User mouse movement or keypress immediately cancels the auto hide timer and restores full opacity to all navigation and transport chrome.
- Keyboard shortcuts within the fullscreen view (Space, Escape, Arrow keys, L, V, M) intercept their events only while the view is active, preventing duplicate triggers in background pages.
- Dismissing the fullscreen view always restores keyboard focus to the element that triggered it.

**Security model**:

- Desktop application running entirely in client memory and local SQLite/browser context.
- No network requests, PII collection, or external credential requirements.
- Preferences are saved safely in `localStorage` under key `Mutinhimira_user_settings_v1`.

**Critical test scenarios**:

- Happy path: Opening fullscreen view from PlayerFooter, switching between Artwork, Lyrics, and Visualizer modes, scrubbing timeline, and exiting via return button or Escape key, verifies **AC-1**, **AC-2**, **AC-4**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-13**.
- Failure case: Opening fullscreen when `currentTrack` is null, or handling a track without artwork or lyrics, verifies **AC-3**, **AC-5**, **AC-6**, **AC-7**.
- Inactivity case: Waiting four seconds without cursor movement hides chrome and cursor, and moving cursor restores chrome immediately, verifies **AC-11**.
- Keyboard and accessibility: Pressing Space toggles playback, Arrow keys seek, L switches to lyrics, V switches to visualizer, M toggles mute, Escape closes view, and focus is trapped inside dialog, verifies **AC-12**, **AC-13**, **AC-15**.
- Settings persistence: Changing the default view mode persists in local storage across sessions, verifies **AC-14**.

## Build plan

- [x] 1. Extend domain types, ambient color interfaces, and user settings schema (`src/types/discovery.ts`, `src/types/overlays.ts`, `src/data/homeFixtures.ts`), satisfies **AC-5**, **AC-14**
- [x] 2. Extend `useOverlayStore` with `"fullscreen"` overlay type, `fullscreenViewMode` selector, and persistent default view loading in `useSettingsStore`, satisfies **AC-2**, **AC-14**
- [x] 3. Create modular fullscreen subcomponents under `src/components/fullscreen/` including `FullscreenHeader`, `FullscreenArtwork`, `FullscreenLyricsView`, `FullscreenVisualizer`, and `FullscreenDeck`, satisfies **AC-4**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**
- [x] 4. Build `NowPlayingFullscreen` parent container with 720p canvas rendering, ambient gradient mesh, auto hide inactivity timer, keyboard event listener, and dialog focus trap, satisfies **AC-2**, **AC-3**, **AC-5**, **AC-8**, **AC-11**, **AC-12**, **AC-13**, **AC-15**
- [x] 5. Integrate entry trigger buttons and tooltips in `PlayerFooter` and wire overlay rendering into root `App.tsx`, satisfies **AC-1**, **AC-2**, **AC-13**
- [x] 6. Implement comprehensive unit and component test suite covering view switching, transport controls, keyboard listeners, lyrics click to seek, and auto hide timers, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**

## Consequences

**Positive**:

- Delivers a lean back listening experience with enlarged album artwork and ambient visuals.
- Unifies artwork, synchronized lyrics, and real time audio visualization into a single coherent interface.
- Preserves battery and system resources on laptops by capping canvas buffer resolution to 720p.
- Provides accessible keyboard shortcuts and focus management for desktop users.

**Negative / tradeoffs**:

- Running canvas visualizer animations at 60fps increases GPU draw cycles slightly compared to static views.
- Auto hiding controls requires managing window event listeners and debounce timers.

**Neutral**:

- Requires small non breaking additions to `Track`, `OverlayType`, and `UserSettings` types.
- Integrates with existing `lyricsFixtures` and `usePlayerStore` without altering core audio state.

## Follow-up

- [ ] Connect live audio frequency spectrum data from the Rodio audio engine in Phase 2 to replace simulated canvas waveforms.
- [ ] Add smooth crossfade animations between ambient color mesh palette transitions when track changes during full screen playback.
