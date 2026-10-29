# 0006. Liked songs screen

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user experience, and state management for the Liked Songs screen in Mutinhimira. It establishes a dedicated feature folder under src/components/liked/, a page container at src/pages/LikedSongs.tsx, and a reactive store at src/store/useLikedSongsStore.ts. Following the Facade build approach, this screen provides an expressive view featuring a glowing Midnight hero banner with total track counts and duration, quick action buttons for Play All and Shuffle, an inline search filter, and an interactive songs table with sortable columns, unlike retention, and playback integration with the player footer.

## Decision

**Chosen option**: Option 2: Dedicated liked songs store and modular components with temporary unliked retention

Implement the Liked Songs view as an independent screen powered by a dedicated `useLikedSongsStore` that coordinates with `usePlayerStore` and `useLibraryStore`, presenting a glowing hero banner, quick search filter bar, and a sortable songs table that retains unliked songs until navigation to prevent accidental loss.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener with favorite music, I want a dedicated Liked Songs screen so that I can quickly access all tracks I have favorited across the app in one place.
- As a listener wanting immediate playback, I want Play All and Shuffle buttons in the hero banner so that I can listen to my favorites without manually building a queue.
- As a listener managing my favorites, I want heart buttons on every row that toggle like status, with unliked songs remaining visible until I leave the view so that I can undo accidental clicks.
- As a listener searching within a large collection of favorites, I want a quick search filter and sortable column headers so that I can locate specific tracks effortlessly.
- As a listener with no liked songs yet, I want an inviting empty state with clear instructions and an explore action so that I know how to favorite music.

**Acceptance criteria**:

- **AC-1**: Navigating to Liked Songs in the sidebar renders the Liked Songs screen using Midnight theme styling, displaying a glowing hero banner with heart badge, total track count, total calculated duration, Play All and Shuffle buttons, search filter bar, and the liked songs table.
- **AC-2**: The hero banner displays the total count of liked tracks and their cumulative duration formatted in hours and minutes, updating dynamically whenever track like states change.
- **AC-3**: Clicking Play All queues all visible liked songs into `usePlayerStore`, starts playback from the first track, and updates the player footer bar.
- **AC-4**: Clicking Shuffle queues all visible liked songs in randomized order into `usePlayerStore`, starts playback immediately, and turns on shuffle mode in the player.
- **AC-5**: The search filter bar allows real time text filtering across song titles, artists, and album names, updating the visible songs table instantly.
- **AC-6**: When a search filter query matches zero songs, the view renders an inline notice stating no matching songs found with a Clear search button, keeping the hero banner visible.
- **AC-7**: The songs table renders sortable column headers for Number, Title, Artist, Album, Duration, and Date Liked, and clicking any header toggles ascending and descending sort order with visual arrow indicators.
- **AC-8**: Clicking the heart button on any song row unlikes the track, updates the heart icon to an outline, retains the row in place during the current session, and synchronizes the unliked state to `usePlayerStore` and `useLibraryStore`.
- **AC-9**: Re clicking an unliked heart icon while still on the screen restores the liked state and removes the track from pending unliked status.
- **AC-10**: Double clicking any track row or clicking its hover play button queues the current list into `usePlayerStore` and starts playback from that specific song.
- **AC-11**: When zero songs are liked (or all tracks are unliked after navigation), the view renders an expressive empty state with a glowing heart icon, guidance on how to like songs, and an Explore Music button that navigates to Search.
- **AC-12**: Navigating away from Liked Songs purges unliked tracks from the active liked collection so that returning to the screen presents a clean list.

## Feature design

**Data model sketch**:

```typescript
export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath: string;
  folderId?: string;
  dateAdded: string;
  dateLiked: string;
}

export type LikedSortColumn = "title" | "artist" | "album" | "durationSeconds" | "dateLiked";
export type SortDirection = "asc" | "desc";

export interface LikedSortState {
  column: LikedSortColumn;
  direction: SortDirection;
}

export interface LikedSongsState {
  tracks: LikedTrack[];
  unlikedPendingIds: string[];
  filterQuery: string;
  sortState: LikedSortState;

  toggleLikeTrack: (trackId: string) => void;
  setFilterQuery: (query: string) => void;
  setSortColumn: (column: LikedSortColumn) => void;
  cleanupUnlikedTracks: () => void;
  playAll: () => void;
  shuffleAll: () => void;
  playTrackAtIndex: (index: number) => void;
}
```

**State transitions**:

```
Liked Song Row:
[Liked] -- toggleLikeTrack(id) --> [Unliked Pending (outline heart)]
[Unliked Pending] -- toggleLikeTrack(id) --> [Liked (filled heart)]
[Unliked Pending] -- navigate away / cleanupUnlikedTracks() --> [Purged from list]

Search Filter:
[All Liked Songs] -- setFilterQuery(text) --> [Filtered Songs]
[Filtered Songs] -- clear filter --> [All Liked Songs]

Sorting:
[Default (dateLiked desc)] -- click column header --> [Column asc] -- click again --> [Column desc]
```

**API surface**:

In this Facade phase, the UI calls `useLikedSongsStore` actions which connect to `usePlayerStore` for playback:

| Store Action | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `toggleLikeTrack` | Store action | `trackId: string` | Toggles like status and updates unliked pending list | Public | Track not found |
| `setFilterQuery` | Store action | `query: string` | Updates search text filter | Public | None |
| `setSortColumn` | Store action | `column: LikedSortColumn` | Toggles or updates sort column and direction | Public | None |
| `cleanupUnlikedTracks` | Store action | None | Purges unliked pending tracks from collection | Public | None |
| `playAll` | UI helper | None | Queues visible songs in player store from index 0 | Public | Empty collection |
| `shuffleAll` | UI helper | None | Shuffles visible songs and queues into player store | Public | Empty collection |
| `playTrackAtIndex` | UI helper | `index: number` | Queues visible songs and plays selected index | Public | Invalid index |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render hero banner | Total count of liked songs | Derived from `tracks.filter(t => t.isLiked).length` |
| Render hero banner | Total cumulative duration | Sum of `durationSeconds` for liked tracks, formatted to hours and minutes |
| Render song row | Track index, artwork, title, artist, album, duration | Properties of `LikedTrack` formatted via helper utilities |
| Render song row | Date liked relative string | Formatted from `dateLiked` ISO string (for example Yesterday or 3 days ago) |
| Render song row | Heart icon fill state | Evaluated from `track.isLiked && !unlikedPendingIds.includes(track.id)` |
| Filter songs table | Visible tracks matching text | Matched against `title`, `artist`, or `album` from active tracks array |
| Sort songs table | Sorted rows with arrow indicators | Calculated via `sortState` comparing target column values |
| Zero state banner | Guidance text and explore trigger | Rendered when total liked songs count equals zero |

**Key invariants**:

- Unliking a track while viewing Liked Songs keeps its row visible with an unliked heart icon until navigation or manual cleanup, allowing immediate undo.
- Total count and total duration in the hero banner update immediately when a song is unliked or re liked.
- Secondary sorting always defaults to `dateLiked` descending to guarantee predictable row order when values match.
- Play All and Shuffle All queue only the songs currently visible after search filtering.
- Navigating away from Liked Songs executes cleanup, purging unliked tracks from the active collection.

**Security model**:

- Operates purely within local client memory and simulated fixtures in this phase.
- File system paths represent local directories and are rendered read only with no external transmission.
- No remote network requests or secret authentication tokens are required.

**Configuration required**:

- None required for this client side mock phase.

**Critical test scenarios**:

- Happy path: Navigating to Liked Songs renders the hero banner with total stats, clicking Play All queues tracks into player footer bar, verifies **AC-1**, **AC-2**, **AC-3**.
- Shuffle play: Clicking Shuffle randomizes visible liked tracks, starts playback, and enables player shuffle state, verifies **AC-4**.
- Text filtering: Typing in the search input filters rows across title, artist, and album in real time, verifies **AC-5**.
- Empty filter search: Entering a query with no matches displays the inline notice with Clear search button, verifies **AC-6**.
- Column sorting: Clicking column headers reorders rows ascending and descending with sort indicators, verifies **AC-7**.
- Unlike retention and undo: Clicking the heart button unlikes the track without removing the row, clicking it again restores the liked state, verifies **AC-8**, **AC-9**.
- Row selection playback: Double clicking a song row queues visible tracks and starts playback of that song, verifies **AC-10**.
- Zero state presentation: When no songs are liked, the screen renders the empty state with the Explore Music button, verifies **AC-11**.
- Unmount cleanup: Leaving the screen purges unliked tracks so returning displays only favorited songs, verifies **AC-12**.

## Build plan

Following the project Facade build approach, the implementation begins with TypeScript contracts and fixture data, builds the reactive Zustand store, constructs modular UI components, assembles the page, and verifies through unit and component tests.

- [x] 1. Create TypeScript interfaces for LikedTrack, LikedSortColumn, LikedSortState, and LikedSongsState in `src/types/liked.ts`, satisfies **AC-1**, **AC-7**.
- [x] 2. Create initial mock data fixtures for liked songs populated with dateLiked timestamps in `src/data/likedFixtures.ts`, satisfies **AC-1**, **AC-2**, **AC-7**.
- [x] 3. Implement the Zustand store in `src/store/useLikedSongsStore.ts` supporting unliked pending retention, filter query, column sorting, unmount cleanup, and player store queueing, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-12**.
- [x] 4. Build `LikedBanner` displaying the illuminated heart badge, title, dynamically computed track count, formatted duration, and Play All and Shuffle buttons in `src/components/liked/LikedBanner.tsx`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- [x] 5. Build `LikedFilterBar` providing real time text search input and sort selection controls in `src/components/liked/LikedFilterBar.tsx`, satisfies **AC-5**, **AC-7**.
- [x] 6. Build `LikedSongTable` with sortable columns, relative dateLiked formatting, row hover play, double click playback, and heart state toggling in `src/components/liked/LikedSongTable.tsx`, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**.
- [x] 7. Build `EmptyLikedState` with glowing heart icon, guidance message, and Explore Music button in `src/components/liked/EmptyLikedState.tsx`, satisfies **AC-11**.
- [x] 8. Assemble the complete view in `src/pages/LikedSongs.tsx` and wire navigation in `src/App.tsx` so selecting Liked Songs renders this screen, satisfies **AC-1**, **AC-11**, **AC-12**.
- [x] 9. Add comprehensive unit and component test suite in `src/test/liked.test.tsx` verifying banner stats, playback actions, filtering, sorting, unlike retention, and empty state, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Delivers a dedicated, responsive Liked Songs screen adhering to the Midnight visual theme.
- Retaining unliked tracks in place during the active session prevents accidental loss of context and lets listeners undo mistakes easily.
- Modular component structure under `src/components/liked/` keeps UI code clean, readable, and maintainable.
- Clear separation between liked track management in `useLikedSongsStore` and audio playback in `usePlayerStore` preserves single responsibility.
- Prepares exact data contracts ready to connect to SQLite favorites persistence in Phase 2.

**Negative / tradeoffs**:

- Adds temporary mock data fixtures that do not persist across application restarts during this prototype phase.
- Requires managing an unliked pending set to reconcile when the user navigates away.

**Neutral**:

- Requires updating `App.tsx` navigation mapping to mount `LikedSongs.tsx` when activeNav is Liked Songs.

## Follow-up

- [ ] Wire liked tracks to SQLite database persistence in Phase 2 feature 15 (Playlists and favorites persistence).
- [ ] Connect track favorites to local audio metadata ratings where supported.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
