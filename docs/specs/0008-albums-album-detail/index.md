# 0008. Albums and album detail

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user interface, and state management for the Albums overview grid and dedicated Album Detail screens in Mutinhimira. It introduces a dedicated feature module under src/components/albums/, a page container at src/pages/Albums.tsx, and a reactive store at src/store/useAlbumStore.ts. Following the Facade build approach, this feature delivers a visual collection grid of albums with search filtering and multi criteria sorting, high impact hero headers with vinyl placeholder fallbacks, conditional disc section grouping for multi disc releases, full album playback queueing, and cross view deep linking from Home and Search screens.

## Decision

**Chosen option**: Option 2: Dedicated album store and modular views with multi disc grouping and cross screen navigation

Implement the Albums collection and Album Detail views as an independent feature governed by `useAlbumStore`, coordinating playback with `usePlayerStore` and track likes with `useLikedSongsStore`. The collection grid provides fast search filtering and sorting by title, artist, year, or track count. The detail view presents a glowing hero banner, artist profile navigation link, album level favorite toggling, clean disc headers for multi disc albums, and full album queueing in chronological track order.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener browsing my music library, I want a dedicated Albums screen showing all albums in a visual grid so that I can explore and enjoy complete artistic works.
- As a listener looking for specific music, I want to filter albums by search text and sort them by title, artist, release year, or track count so that I can locate albums quickly.
- As a listener opening an album, I want a dedicated detail view with high impact cover art, total track count, total calculated duration, release year, record label, and Play All and Shuffle actions so that I can immerse myself in the release.
- As a listener enjoying double albums or box sets, I want tracks divided into Disc 1 and Disc 2 sections with proper numbering so that the album structure is preserved accurately.
- As a listener navigating the player, I want to click an album from Home or Search and arrive directly on its detail page with a working back button to return to the album grid.
- As a listener discovering artists, I want to click an artist name link in the album header to navigate to that artist profile seamlessly.

**Acceptance criteria**:

- **AC-1**: Navigating to Albums in the sidebar renders the Albums overview screen using Midnight theme styling, displaying a header with album count, search input, sort selector (title, artist, release year, track count), and a responsive visual grid of album cards with artwork, title, artist name, release year, and hover play triggers.
- **AC-2**: Typing into the search input filters albums instantly by title or artist name; if no albums match, an inviting empty state card appears with a clear search button.
- **AC-3**: Selecting a sort option reorders the album grid by title ascending or descending, artist name, release year, or track count.
- **AC-4**: Clicking any album card in the overview grid opens the Album Detail view, rendering a top bar with a back button, a hero banner with large album art, title, clickable artist name link, release year badge, genre tag, track count, total calculated duration, and action controls for Play All, Shuffle, Favorite Album toggle, and options menu.
- **AC-5**: Clicking the back button in the Album Detail header navigates back to the Albums overview grid, preserving the search query, sort settings, and scroll position.
- **AC-6**: Clicking the artist name link in the Album Detail hero banner navigates to the Artists view with that artist focused, supporting cross feature exploration.
- **AC-7**: Clicking Play All or Shuffle queues all album tracks in `usePlayerStore` in correct track sequence starting from track 1 or shuffled, begins playback immediately, and sets player context to the album title.
- **AC-8**: In the Album Detail view, albums containing tracks across multiple discs render distinct disc separator headers (such as Disc 1, Disc 2) with track numbers numbered sequentially per disc. Single disc albums hide the disc header and display a seamless numbered tracklist.
- **AC-9**: Each track row displays track number, hover play trigger, track title, explicit badge if applicable, artist name (when distinct from album artist on compilations or features), track duration, favorite like toggle, and context options menu.
- **AC-10**: Clicking the Heart icon on the album detail hero banner toggles the favorite status of the album in `useAlbumStore`, updating the visual heart state and reflecting in favorite filters.
- **AC-11**: When an album image URL is missing or fails to load, a procedural vinyl placeholder with subtle groove gradient styling and the album title initial renders smoothly without broken image icons.
- **AC-12**: Clicking an album card from another screen (such as Home Discovery or Search results) sets the active album in `useAlbumStore` and switches navigation to the Albums tab, opening the Album Detail view directly with full back navigation to the Albums grid.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```typescript
export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
  totalDuration: number;
  label?: string;
  description?: string;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface AlbumTrack {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId: string;
  discNumber: number;
  trackNumber: number;
  duration: number;
  coverUrl?: string;
  audioUrl?: string;
  isLiked?: boolean;
  isExplicit?: boolean;
}

export type AlbumSortOption = 'title' | 'artist' | 'releaseYear' | 'trackCount';
export type SortDirection = 'asc' | 'desc';

export interface AlbumState {
  albums: Album[];
  activeAlbumId: string | null;
  searchQuery: string;
  sortBy: AlbumSortOption;
  sortDirection: SortDirection;
  favoriteAlbumIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveAlbumId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: AlbumSortOption, direction?: SortDirection) => void;
  toggleFavoriteAlbum: (id: string) => void;
  playAlbum: (albumId: string, startTrackId?: string) => void;
  shuffleAlbum: (albumId: string) => void;
  getAlbumById: (id: string) => Album | undefined;
  getTracksForAlbum: (albumId: string) => AlbumTrack[];
}
```

**State transitions**:

```text
[Albums Overview Grid]
  |
  +-- User clicks album card / deep links from Home/Search --> [Album Detail View]
  |                                                                 |
  +-- User clicks back button --------------------------------------+
  |
  +-- User enters search query --> [Filtered Album Grid] (or [Empty Search State])
  |
  +-- User toggles sort dropdown --> [Sorted Album Grid]
```

**API surface**:

| Action or Selector | Method or Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| setActiveAlbumId | store action | id: string or null | void | local | none |
| setSearchQuery | store action | query: string | void | local | none |
| setSort | store action | sortBy: AlbumSortOption, direction?: SortDirection | void | local | none |
| toggleFavoriteAlbum | store action | id: string | void | local | album not found |
| playAlbum | store action | albumId: string, startTrackId?: string | void | local | album has no tracks |
| shuffleAlbum | store action | albumId: string | void | local | album has no tracks |
| getAlbumById | store selector | id: string | Album or undefined | local | none |
| getTracksForAlbum | store selector | albumId: string | AlbumTrack[] | local | none |

**Value sourcing**:

| Action or Read Path | Value produced or displayed | Source |
|---|---|---|
| Albums overview header | Total album count number | Derived from albums array length in useAlbumStore |
| Albums grid cards | Album cover art image | Album.coverUrl or procedural vinyl placeholder if missing |
| Albums grid cards | Title, artist, release year | Album.title, Album.artistName, Album.releaseYear |
| Album detail banner | High resolution artwork | Album.coverUrl or vinyl placeholder component |
| Album detail banner | Album title and artist link | Album.title, Album.artistName, Album.artistId |
| Album detail banner | Total duration string | Derived by summing track durations for this album in seconds |
| Album detail banner | Total tracks label | Derived from album tracks array length |
| Album detail banner | Favorite heart status | Derived from favoriteAlbumIds array containing album.id |
| Album detail tracklist | Disc separator headers | Derived from unique discNumber values when max discNumber > 1 |
| Album detail track row | Track number badge | Track.trackNumber |
| Album detail track row | Track title and explicit tag | Track.title, Track.isExplicit |
| Album detail track row | Featured artist credit | Track.artist displayed when Track.artist !== Album.artistName |
| Album detail track row | Track duration | Track.duration formatted as mm:ss |
| Album detail track row | Track liked heart | Track.isLiked or synchronized with useLikedSongsStore |

**Key invariants**:

- Active album tracks must always be ordered primarily by discNumber ascending, then trackNumber ascending.
- Disc separator headers must be omitted entirely if all tracks in an album belong to disc 1.
- In single disc mode, track numbers run from 1 to total tracks without interruption.
- Clicking Play All on an album must queue all album tracks in correct sequence and initiate playback starting at track 1.
- When an album image URL is empty, invalid, or fails to load, the visual layout must fall back to the procedural vinyl placeholder without showing broken image glyphs.
- Back navigation from Album Detail must return to the exact search, sort, and scroll state of the Albums overview grid.

**Security model**:

Local desktop client execution only. Album catalog browsing, search filtering, and favorite tracking run completely in memory within Zustand during Phase 1 Facade. No network credentials, external API keys, or remote authentication tokens are required.

**Configuration required**:

None. No new environment variables or secret keys are required.

**Critical test scenarios**:

- Happy path: Navigating to Albums displays the grid of album cards, clicking an album opens the Album Detail view with cover art, release metadata, and numbered tracklist, and clicking Play All starts playback, verifies **AC-1**, **AC-4**, **AC-7**.
- Filter and sorting: Entering a search term filters the albums list in real time, and changing sort order reorders the album cards correctly, verifies **AC-2**, **AC-3**.
- Multi disc grouping: Viewing a multi disc album displays distinct Disc 1 and Disc 2 section headers, whereas viewing a single disc album hides disc headers completely, verifies **AC-8**.
- Cross view navigation: Clicking an album card on the Home screen or Search screen navigates into the Album Detail view with activeAlbumId set, and clicking back returns smoothly to the album grid, verifies **AC-5**, **AC-12**.
- Image fallback and favorites: Rendering an album with missing artwork displays the procedural vinyl placeholder, and clicking the album heart icon toggles its favorite status in the store, verifies **AC-10**, **AC-11**.

## Build plan

- [x] 1. Album types, interfaces, and mock album fixture data with multi disc entries and realistic artwork in `src/types/album.ts` and `src/data/mockAlbums.ts`, satisfies **AC-1**, **AC-8**, **AC-11**
- [x] 2. Zustand album store (`src/store/useAlbumStore.ts`) managing albums list, search filtering, sorting, active album selection, favorite album toggling, and playback queue coordination with `usePlayerStore`, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-10**, **AC-12**
- [x] 3. Modular UI components in `src/components/albums/`: `AlbumHeader`, `AlbumGrid`, `AlbumCard`, `AlbumDetailBanner`, `AlbumTrackList`, `AlbumDiscHeader`, `AlbumTrackRow`, `AlbumVinylPlaceholder`, and `AlbumEmptyState`, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-8**, **AC-9**, **AC-10**, **AC-11**
- [x] 4. Page assembly in `src/pages/Albums.tsx`, application shell navigation wiring in `src/App.tsx`, and deep linking from Home and Search screens, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-12**
- [x] 5. Comprehensive unit and component test suite covering album filtering, sorting, multi disc grouping, playback queueing, favorite toggling, and back navigation, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:

- Gives listeners a dedicated destination to explore and enjoy complete album releases.
- Preserves the artistic structure of double albums and box sets through clean disc grouping.
- Deep links seamlessly from existing album cards across Home and Search screens.
- Reuses established Midnight visual design tokens, glassmorphism headers, and player queue coordination.

**Negative / tradeoffs**:

- Adds a new Zustand store file and mock data set that must be maintained until Phase 2 SQLite persistence.
- Requires coordinating navigation state between top level tabs and deep album selection.

**Neutral**:

- Prepares seamless artist profile navigation ahead of scope feature 10 (Artists and artist profile).

## Follow-up

- [ ] Connect album catalog loading to SQLite queries when Phase 2 milestone 12 (Data model and SQLite storage) and milestone 14 (Local library scanner) are implemented.
- [ ] Implement artist profile routing when milestone 10 (Artists and artist profile) is designed and built.
