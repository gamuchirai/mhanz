# 0009. Artists and artist profile

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user interface, and state management for the Artists collection overview and dedicated Artist Profile views in Mutinhimira. It introduces a dedicated feature module under src/components/artists/, a page container at src/pages/Artists.tsx, and a reactive store at src/store/useArtistStore.ts. Following the Facade build approach, this feature delivers a responsive circular portrait grid of artists with follower counts and search sorting, an atmospheric hero banner with live follow toggles, an expandable top tracks table with playback queueing, discography release category filters with deep links to album detail, and smooth cross screen navigation from Home, Search, and Album views.

## Decision

**Chosen option**: Option 2: Dedicated artist store and modular views with discography filtering, interactive following, and cross screen deep linking

Implement the Artists collection and Artist Profile views as an independent feature governed by `useArtistStore`, coordinating audio playback with `usePlayerStore` and track likes with `useLikedSongsStore`. The collection grid provides fast search filtering and sorting by popularity, artist name, or album release count. The profile view presents a glowing atmospheric hero banner with artist portrait and follow controls, an expandable top 5 to 10 popular tracks table, filtered discography release cards (all, albums, singles and EPs), an about biography card with listener statistics, and full back navigation to the artist grid.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener browsing my library, I want a dedicated Artists screen showing all artists in a clean visual grid of circular portraits so that I can explore my favourite musicians and creators.
- As a listener searching for specific artists, I want to filter artists by name or genre and sort them by popularity, alphabetical name, or album count so that I can locate creators quickly.
- As a listener opening an artist, I want an atmospheric profile page with a large hero banner, verified badge, listener count, bio blurb, and follow button so that I can connect with the creator persona.
- As a listener discovering an artist hits, I want to see their top popular songs with stream counts and duration, with an option to expand from top 5 to top 10, and a play button that queues them immediately.
- As a listener exploring an artist catalogue, I want a discography section with release filters for albums and singles so that I can navigate to their full album releases easily.
- As a listener navigating across the player, I want to click an artist name on Home, Search, or Album Detail views and arrive directly on their profile page with a working back button to return to the grid.

**Acceptance criteria**:

- **AC-1**: Navigating to Artists in the sidebar renders the Artists overview screen using Midnight theme styling, displaying a header with artist count, search input, sort selector (popularity, name ascending or descending, album count), and a responsive visual grid of circular artist cards with portrait images, verified badge, artist name, follower count, and follow button.
- **AC-2**: Typing into the search input filters artists instantly by name or genre; if no artists match, a Midnight styled empty state card appears with a clear search button.
- **AC-3**: Selecting a sort option reorders the artist grid by popularity (monthly listeners count), name ascending or descending, or album release count.
- **AC-4**: Clicking any artist card in the overview grid opens the Artist Profile view, rendering a top bar with a back button, an atmospheric hero banner with artist portrait, verified badge, artist name, monthly listener count, and action controls for Play Artist Top Tracks, Follow or Following toggle, and options menu.
- **AC-5**: Clicking the back button in the Artist Profile header navigates back to the Artists overview grid, preserving the search query, sort settings, and scroll position.
- **AC-6**: Clicking an album card in the artist discography section navigates directly to the Albums screen with that album active, supporting fluid cross feature exploration.
- **AC-7**: Clicking Play on the artist hero banner queues the artist top tracks in `usePlayerStore` in sequence, begins playback immediately, and sets the player context banner to the artist name.
- **AC-8**: In the Artist Profile view, the Popular Tracks section displays the artist top 5 songs with rank numbers (1 to 5), cover thumbnail, track title, stream count formatted with commas, track duration, like toggle, and a Show More button that expands the list to 10 tracks with a Show Less toggle.
- **AC-9**: Each popular track row supports hovering to reveal a play trigger, double clicking to play that specific track, clicking the heart button to sync with `useLikedSongsStore`, and opening an options menu.
- **AC-10**: Clicking the Follow or Following button on the artist profile banner or card toggles the follow status in `useArtistStore`, increments or decrements the follower count by 1, and updates the button label and visual accent styling.
- **AC-11**: When an artist avatar or hero banner image URL is missing or fails to load, a procedural gradient avatar placeholder with artist initials, microphone icon, and a deep ambient glow renders smoothly without broken image icons.
- **AC-12**: Clicking an artist link or card from any other screen (such as Home Discovery, Search results, or Album Detail artist link) sets `activeArtistId` in `useArtistStore` and switches navigation to the Artists tab, opening the Artist Profile view directly with a working back button to return to the Artists grid.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```typescript
export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  heroBannerUrl?: string;
  monthlyListeners: number;
  followerCount: number;
  isFollowed: boolean;
  verified: boolean;
  bio: string;
  genres: string[];
  popularTrackIds: string[];
  albumIds: string[];
  createdAt?: string;
}

export interface ArtistPopularTrack {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  albumId: string;
  albumTitle: string;
  coverUrl: string;
  playCount: number;
  duration: number;
  isLiked?: boolean;
  audioUrl?: string;
}

export interface ArtistRelease {
  id: string;
  artistId: string;
  title: string;
  coverUrl: string;
  releaseYear: number;
  type: 'album' | 'single' | 'ep';
  trackCount: number;
}

export type ArtistSortOption = 'popularity' | 'name' | 'albumCount';
export type SortDirection = 'asc' | 'desc';
export type DiscographyFilter = 'all' | 'album' | 'single';

export interface ArtistState {
  artists: Artist[];
  activeArtistId: string | null;
  searchQuery: string;
  sortBy: ArtistSortOption;
  sortDirection: SortDirection;
  discographyFilter: DiscographyFilter;
  followedArtistIds: string[];
  isPopularExpanded: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveArtistId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: ArtistSortOption) => void;
  toggleSortDirection: () => void;
  setDiscographyFilter: (filter: DiscographyFilter) => void;
  togglePopularExpanded: () => void;
  toggleFollowArtist: (artistId: string) => void;
  playArtistTopTracks: (artistId: string, startIndex?: number) => void;
  resetFilters: () => void;
}
```

**State transitions**:

- Active artist navigation: `activeArtistId = null` (Overview grid) <-> `activeArtistId = "art-1"` (Profile view).
- Popular tracks expansion: `isPopularExpanded = false` (Top 5 tracks displayed) <-> `isPopularExpanded = true` (Top 10 tracks displayed).
- Discography category filter: `'all'` <-> `'album'` <-> `'single'`.
- Follow status toggle: Unfollowed (`isFollowed = false`, follower count N) <-> Followed (`isFollowed = true`, follower count N + 1).

**API surface**:

| Function or Hook | Layer | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| useArtistStore | Presentation store | none | ArtistState reactive slice | public | none |
| setActiveArtistId | Presentation store | id: string \| null | updates activeArtistId in store | public | invalid id logged |
| toggleFollowArtist | Presentation store | artistId: string | toggles followed set, updates follower count | public | artist not found |
| playArtistTopTracks | Presentation store | artistId: string, startIndex?: number | pushes tracks to usePlayerStore | public | no tracks for artist |
| setDiscographyFilter | Presentation store | filter: DiscographyFilter | updates discographyFilter in store | public | none |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| View artist overview grid | Total artists count and list | Derived from `artists` array length and search sort filter |
| Display artist card | Avatar, name, followers, verified badge | Artist record fields in `useArtistStore` |
| View artist profile | Hero banner, monthly listeners, bio | Active Artist record looked up by `activeArtistId` |
| Render popular tracks | Rank 1 to 10, title, plays, duration | `ArtistPopularTrack` fixtures joined by `artistId` |
| Render discography | Release cards, year, release type | `ArtistRelease` fixtures filtered by `artistId` and `discographyFilter` |
| Toggle follow button | Followed status and incremented count | Mutated in `useArtistStore` by `toggleFollowArtist` |
| Play artist top tracks | Audio playback queue and player context | Pushed to `usePlayerStore.setQueue` with artist context |
| Cross view link to album | Active album in Album store | Dispatched to `useAlbumStore.setActiveAlbumId` and nav tab switched |

**Key invariants**:

- Follower count for an artist must never decrease below zero.
- Follow status in `followedArtistIds` must stay synchronized with the active artist `isFollowed` boolean flag.
- Popular tracks must always be ordered by `playCount` descending, with rank numbers starting at 1.
- When `isPopularExpanded` is false, exactly 5 popular tracks are shown (or fewer if total is less than 5); when true, up to 10 tracks are shown.
- An unknown or invalid `activeArtistId` must not crash the view; it must render a friendly fallback notice with a button to return to the artist grid.

**Security model**:

- Client side local desktop execution within the Tauri v2 desktop webview sandbox.
- State is managed entirely in memory through Zustand before Phase 2 SQLite integration.
- No external network access or unvetted credentials required.

**Configuration required**:

- No new environment variables or secret keys required.

**Critical test scenarios**:

- Happy path: Opening Artists renders circular avatar cards; clicking an artist opens their profile showing hero banner, popular tracks top 5, discography releases, and about bio; clicking follow toggles status and increments followers, verifies **AC-1**, **AC-4**, **AC-8**, **AC-10**.
- Search and sort: Typing a query filters artists by name or genre instantly; selecting sort reorders by monthly listeners or name; empty search shows empty state with reset button, verifies **AC-2**, **AC-3**.
- Discography and cross view deep link: Clicking release filter pills toggles between all releases and albums only; clicking an album navigates to Album Detail; clicking an artist from Home or Search opens that artist profile directly with working back navigation, verifies **AC-5**, **AC-6**, **AC-12**.
- Playback queueing: Clicking Play on hero banner or clicking a popular track queues tracks in `usePlayerStore` with artist context and starts playback, verifies **AC-7**, **AC-9**.
- Fallback placeholder: Missing avatar or hero image URLs render procedural gradient placeholders with initials and microphone icon without broken image icons, verifies **AC-11**.

## Build plan

1. Define artist domain types in src/types/artists.ts, procedural gradient avatar generator in src/utils/avatarUtils.ts, and rich artist fixtures with top tracks and releases in src/data/artistFixtures.ts, satisfies **AC-1**, **AC-8**, **AC-11**.
2. Create Zustand artist store in src/store/useArtistStore.ts supporting catalog search, multi criteria sorting, active artist navigation, follow toggling, popular track expansion, and discography filtering, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-10**, **AC-12**.
3. Build modular UI components under src/components/artists/ including ArtistHeader, ArtistGrid, ArtistCard, ArtistProfileBanner, ArtistPopularTracks, ArtistPopularTrackRow, ArtistDiscography, ArtistBioCard, and ArtistEmptyState, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.
4. Assemble top level page container in src/pages/Artists.tsx, connect navigation in App.tsx shell, and integrate cross screen deep linking from Home, Search, and Album Detail views, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-12**.
5. Implement unit and component test suite covering artist store mutations, search filtering, profile rendering, popular track expansion, follow toggling, and fallback rendering, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Delivers a polished, modern artist browsing and profile discovery experience matching Spotify and Windows Groove Music quality.
- Reuses established design tokens from the Midnight theme (dark copper glow, Outfit typography, glassmorphism blur) for complete aesthetic harmony.
- Connects seamlessly with existing player and album features via cross feature deep links and playback queue coordination.
- Clean separation of concern in `useArtistStore` ensures smooth future migration to Phase 2 SQLite tables.

**Negative / tradeoffs**:

- Adds mock fixture data and state management code that will need replacement when the native Rust audio metadata scanner and database layer are completed.
- Initial follower counts and stream stats are simulated fixtures rather than live streaming network statistics.

**Neutral**:

- Requires updating `App.tsx` navigation shell to mount the new `Artists` page container in place of the queued placeholder card.

## Follow-up

- [ ] Connect `Artists` navigation tab in `App.tsx` and wire deep linking callbacks from `Home.tsx`, `Search.tsx`, and `Albums.tsx`.
- [ ] During Phase 2 backend wiring, map `Artist`, `ArtistPopularTrack`, and `ArtistRelease` entities to SQLite relational tables.
