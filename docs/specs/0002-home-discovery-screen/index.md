# 0002. Home and discovery screen

**Date**: 2026-10-22
**Status**: Accepted

## Summary

This specification defines the architecture and folder structure for the Home and discovery screen in Mutinhimira. It modularizes the raw discovery elements currently sitting in the prototype App.tsx into a clean feature folder structure under src/components/home/ and src/pages/Home.tsx. Following the Facade build approach, this screen refines the visual styling, adds smooth hover states and marquee text, and connects interactive cards and tables to a shared Zustand store, transforming static mock elements into a polished, complete desktop music player experience.

## Decision

**Chosen option**: Option 2: Feature folder architecture with Zustand discovery store

Implement the Home and discovery screen as a modular feature inside `src/components/home/` driven by a dedicated Zustand player and discovery store with TypeScript models.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener opening Mutinhimira, I want an inviting home view with featured releases, curated playlists, and recent tracks so that I can quickly jump into music.
- As a listener browsing popular songs, I want to double click a row or click its play button so that playback starts immediately with the remaining tracks queued.
- As a listener exploring cards and lists, I want long song titles to marquee on hover and missing artwork to fall back gracefully so that the interface always looks polished.
- As a new listener without local music scanned yet, I want helpful empty state prompts so that I understand how to add music or preview sample tracks.

**Acceptance criteria**:

- **AC-1**: Navigating to Home displays the hero banner, curated playlist cards grid, recently played carousel, and popular tracks table using Midnight theme tokens.
- **AC-2**: Clicking quick play on the hero showcase or any curated card replaces the current playback queue, starts playing the first track, and updates the player footer bar with title, artist, artwork, and active play state.
- **AC-3**: Clicking the play button or double clicking any track row in the popular tracks table sets the queue to the popular tracks list, plays the selected track, and highlights the active row.
- **AC-4**: Clicking the heart icon on any track row or hero banner toggles its liked state immediately in the store.
- **AC-5**: Hovering over a track title or artist name that exceeds container width activates a smooth auto scrolling marquee animation.
- **AC-6**: When recent play history or library items are empty, the view displays gentle placeholder cards with actionable buttons to scan music folders or load sample tracks.
- **AC-7**: If any card or track image fails to load over the network, a smooth CSS gradient fallback card renders without layout shifting.
- **AC-8**: During playback in this prototype phase, the player footer simulates progress ticking second by second, allowing seeking, volume adjusting, and play pause toggling.

## Feature design

**Data model sketch**:

```typescript
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath?: string;
  genre?: string;
}

export interface ShowcaseItem {
  id: string;
  headline: string;
  subtitle: string;
  badge: string;
  bannerImageUrl: string;
  actionType: "play_track" | "play_playlist" | "navigate";
  targetId: string;
  track?: Track;
}

export interface CuratedCard {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  trackCount: number;
  type: "playlist" | "album";
  tracks: Track[];
  accentGradient?: string;
}

export interface PlayHistoryItem {
  id: string;
  trackId: string;
  track: Track;
  playedAtTimestamp: number;
  contextTitle: string;
}
```

**State transitions**:

```
PlaybackState:
[Stopped] -- playTrack() --> [Playing]
[Playing] -- togglePlayPause() --> [Paused]
[Paused]  -- togglePlayPause() --> [Playing]
[Playing] -- nextTrack() --> [Playing new track]
[Playing] -- seek(seconds) --> [Playing at new offset]
```

**API surface**:

In this Facade phase, the UI calls store actions. These actions define the surface that Phase 2 Tauri IPC commands will later back:

| Store Action      | Key inputs                             | Key outputs                           | Auth         | Key errors                |
| ----------------- | -------------------------------------- | ------------------------------------- | ------------ | ------------------------- |
| `playTrack`       | `track: Track, queue?: Track[]`        | updates active track and queue        | Public local | Missing audio path        |
| `togglePlayPause` | none                                   | toggles `isPlaying` boolean           | Public local | No active track loaded    |
| `seekTo`          | `seconds: number`                      | updates `currentTime` position        | Public local | Position exceeds duration |
| `toggleLike`      | `trackId: string`                      | toggles boolean `isLiked`             | Public local | Track not found           |
| `playCollection`  | `tracks: Track[], startIndex?: number` | loads tracklist and starts first song | Public local | Empty collection          |

**Value sourcing**:

| Action                   | Value produced / displayed                          | Source                                                                  |
| ------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Render hero banner       | Headline, badge, cover image                        | Fixture in `src/data/homeFixtures.ts`                                   |
| Render curated card      | Title, subtitle, cover art, track count             | CuratedCard fixture list                                                |
| Render recent carousel   | Track title, artist, played context                 | PlayHistoryItem list in Zustand store                                   |
| Render popular track row | Track number, title, artist, album, duration, plays | Popular track fixture list                                              |
| Quick play card          | New queue array, current track index 0              | Card `tracks` property                                                  |
| Hover track title        | Auto scrolling marquee text offset                  | CSS animation triggered on hover when scroll width exceeds client width |
| Empty history fallback   | Friendly prompt and scan folder button              | Static fallback component rendered when `recentPlays.length === 0`      |
| Image load error         | Warm CSS gradient background                        | React `onError` state handler falling back to CSS tokens                |

**Key invariants**:

- The active track must always belong to the active playback queue when a queue exists.
- Current playback time cannot exceed total track duration seconds.
- Liking a track updates all visible instances of that track across hero, carousel, and table simultaneously via the shared store.
- Missing or malformed image URLs must never break card geometry or cause white flashes.

**Security model**:

- All data resides locally on the user machine.
- No remote credentials or private user authentication tokens are processed on this screen.
- External artwork URLs from Unsplash are loaded over standard HTTPS.

**Critical test scenarios**:

- Happy path: Clicking quick play on the hero banner loads the showcase playlist into the queue, begins playback simulation, and reflects track details in the footer bar, verifies **AC-1**, **AC-2**.
- Popular tracks play: Double clicking track three in the popular tracks table sets the queue to all popular tracks and starts playing track three, verifies **AC-3**.
- Favorite toggle: Clicking the heart button on a popular track toggles its filled state and updates the liked state in the store, verifies **AC-4**.
- Marquee text on overflow: Hovering over a long track title activates the marquee CSS animation, verifies **AC-5**.
- Empty library fallback: Clearing recent history displays the empty state placeholder card with an actionable scan button, verifies **AC-6**.
- Artwork error handling: Passing an invalid image URL renders the styled CSS gradient placeholder smoothly, verifies **AC-7**.
- Simulated playback ticker: Starting playback increments the footer timer second by second and allows seeking, verifies **AC-8**.

## Build plan

Following the project Facade build approach, the implementation starts with data contracts and store infrastructure, advances through modular UI components, and connects the assembled screen into the application shell.

1. [x] Create TypeScript interfaces for Track, ShowcaseItem, CuratedCard, and PlayHistoryItem in `src/types/discovery.ts`, satisfies **AC-1**.
2. [x] Create rich mock data fixtures for hero showcase, curated playlists, recently played tracks, and popular songs in `src/data/homeFixtures.ts`, satisfies **AC-1**, **AC-6**.
3. [x] Implement the Zustand playback and discovery store in `src/store/usePlayerStore.ts` supporting queue replacement, simulated playback ticker, seeking, and like toggling, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-8**.
4. [x] Build `HeroBanner` with play action button and responsive visual layout in `src/components/home/HeroBanner.tsx`, satisfies **AC-1**, **AC-2**, **AC-4**.
5. [x] Build `CuratedGrid` presenting playlist cards with hover quick play trigger and artwork fallback in `src/components/home/CuratedGrid.tsx`, satisfies **AC-1**, **AC-2**, **AC-7**.
6. [x] Build `RecentCarousel` with horizontal scrolling, play trigger, and empty state placeholder in `src/components/home/RecentCarousel.tsx`, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**.
7. [x] Build `TrackTable` rendering ranked popular songs with duration formatting, double click playback, heart toggle, and hover marquee text in `src/components/home/TrackTable.tsx`, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**.
8. [x] Assemble all sections in `src/pages/Home.tsx` and integrate the view into `src/App.tsx` navigation with the active player footer, satisfies **AC-1**, **AC-2**, **AC-8**.
9. [x] Add unit and component test suites in `src/components/home/__tests__/Home.test.tsx` validating queue updates, play pause interactions, and like toggles, satisfies **AC-2**, **AC-3**, **AC-4**.

## Consequences

**Positive**:

- Deconstructs the monolithic `App.tsx` mockup into maintainable, modular feature components.
- Delivers an immediate, interactive discovery experience on launch.
- Provides a clean Zustand store interface ready to connect to Tauri Rust commands in Phase 2.

**Negative / tradeoffs**:

- Audio playback in this phase is simulated via JavaScript timers until the Rust Rodio audio thread is wired in Phase 2.
- Mock data fixtures require maintenance until SQLite migrations and local tag scanning are active.

**Neutral**:

- Team members working on Search, Library, and Playlists can reuse the newly established `Track`, `CuratedCard`, and `usePlayerStore` contracts.

## Follow-up

- [ ] Connect `usePlayerStore` to Rust Tauri commands (`play_file`, `pause_audio`, `seek_audio`) once feature 13 (Core audio playback engine) is specced and implemented.
- [ ] Replace mock fixtures with SQLite queries once feature 12 (Data model & SQLite storage) is implemented.
