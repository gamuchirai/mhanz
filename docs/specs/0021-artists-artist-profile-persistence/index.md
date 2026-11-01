# 0021. Artists and artist profile persistence

**Date**: 2026-10-31
**Status**: In Progress

## Summary

This specification defines the persistence architecture connecting the Mutinhimira Artists catalog and Artist Profile views to the local SQLite database. Following the Facade build approach, it transitions the existing user interface from mock fixtures to real scanned music data using Tauri inter process communication commands. The Rust backend catalog repository is updated to calculate real total play counts, hydrating scanned artists into a reactive Zustand store with instant search and multi criteria sorting. Opening an artist profile lazily loads top played tracks and discography releases from the database with an explicit loading state to prevent false missing artist alerts. In alignment with local offline music playback, legacy streaming follower buttons and simulated listener counts are retired in favor of real local library metrics like album counts, track counts, and play history.

## Requirements

**User stories**:

- As a listener browsing my local music collection, I want the Artists screen to show real recording artists scanned from my audio files so that my library reflects my actual music on disk.
- As a listener searching for specific artists, I want to filter artists by name and sort them by popularity, name, or album count so that I can locate creators quickly.
- As a listener opening an artist profile, I want to see their top played songs and discography albums loaded from SQLite with smooth loading feedback so that I can explore their music catalog seamlessly.
- As a listener playing music from an artist profile, I want clicking Play Artist Top Tracks or selecting a popular song to queue real audio files immediately in the playback engine.
- As a user with an empty library before scanning, I want a friendly empty state card directing me to add music folders in Your Library so that I understand how to populate my collection.
- As a user when the background library scanner finishes indexing new music, I want the artist catalog to refresh automatically without restarting the application.

**Acceptance criteria**:

- **AC-1**: When navigating to the Artists overview screen in desktop mode, `useArtistStore` initializes by querying SQLite via `dbGetArtists`, hydrating scanned artists with name, track count, album count, total plays, and formatted cover or avatar art path.
- **AC-2**: When running in a web browser environment without Tauri runtime, `useArtistStore` falls back smoothly to `initialArtists` fixtures, preserving the interactive clickable facade for development and previewing.
- **AC-3**: When SQLite contains zero scanned artists, the Artists overview screen renders a Midnight theme empty state card with an icon and clear guidance prompting the listener to add a music directory in Your Library.
- **AC-4**: Typing into the search input or changing sort options (popularity sorted by total plays, artist name alphabetical, or album count) reorders and filters the hydrated artists list instantly in local store memory.
- **AC-5**: Followed artist state, follow toggle buttons, and simulated online follower counts are removed from `ArtistCard`, `ArtistProfileBanner`, and `useArtistStore` in favor of real local library metrics (album count, track count, total plays).
- **AC-6**: Selecting any artist card from the overview grid sets `activeArtistId` and triggers `loadArtistProfile`, setting `isLoadingProfile` to true and invoking `dbGetArtistProfile` to lazily fetch top played songs and discography albums for that artist.
- **AC-7**: The Artist Profile view renders the artist name, biographical notes (or a subtle fallback notice when local tags lack a biography), cover avatar, aggregated track and album counts, top 5 played tracks (expandable to 10 tracks), and discography albums sequenced by release year descending.
- **AC-8**: Clicking Play Artist Top Tracks or clicking an individual popular track queues the real audio file tracks in `usePlayerStore` with artist context and begins audio playback.
- **AC-9**: Clicking any album card in the artist discography switches navigation to the Albums screen with that album active, preserving fluid cross view exploration.
- **AC-10**: The discography release categorization maps albums with 1 track as singles, albums with 2 to 3 tracks as extended play releases, and albums with 4 or more tracks as full albums.
- **AC-11**: When the music library scanner completes indexing new folders, `useArtistStore` automatically invalidates and refreshes its artist catalog from SQLite while preserving any active artist profile view.
- **AC-12**: Clicking the back button in the Artist Profile view returns to the Artists overview grid, preserving the search query, sort settings, and scroll position by retaining the artist grid in the document tree with conditional visibility.

## Decision

**Chosen option**: Option 1: On demand SQLite profile hydration via expanded Tauri IPC commands with real play statistics, retired streaming follower concept, and automatic scanner catalog sync

Connect the existing `useArtistStore` to SQLite through expanded `db_get_artists` and `db_get_artist_profile` Tauri IPC commands. The Rust backend repository queries `COALESCE(SUM(t.play_count), 0)` to provide accurate library play statistics without requiring schema migrations. The artists overview grid hydrates on store initialization during application boot or screen mount, with browser fallback support. Opening an artist profile lazily queries SQLite for top tracks (ranked by `play_count` descending) and discography albums (ordered by `year` descending), caching profile results in store state and using an `isLoadingProfile` flag to avoid premature missing artist notices. The legacy streaming follow mechanism is retired because Mutinhimira is a local desktop application managing personal music files, replacing simulated follower numbers with real library metrics. The store subscribes to scanner completion events to keep the catalog synchronized automatically after folder scans.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

The local SQLite schema already provides full relational support for artists, albums, and tracks in tables created during initial migration V001. No new database migration is required.

```sql
-- Existing V001 schema definitions utilized by this feature

-- Artists table: primary catalog entity
CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    bio TEXT,
    avatar_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Albums table: linked to artists via artist_id foreign key
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    artist_name TEXT NOT NULL,
    year INTEGER,
    genre TEXT,
    cover_art_path TEXT,
    total_discs INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tracks table: linked to artists and albums with play counts
CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    artist_name TEXT NOT NULL,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    album_name TEXT,
    duration REAL NOT NULL,
    year INTEGER,
    genre TEXT,
    play_count INTEGER NOT NULL DEFAULT 0,
    cover_art_path TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

**Rust and TypeScript Contract Refinements**:

In `src-tauri/src/db/models.rs` and `catalog_repo.rs`, `ArtistDto` is updated to include total play counts aggregated from track records:

```rust
pub struct ArtistDto {
    pub id: String,
    pub name: String,
    pub bio: Option<String>,
    pub avatar_path: Option<String>,
    pub track_count: u32,
    pub album_count: u32,
    pub total_plays: u64,
    pub created_at: i64,
    pub updated_at: i64,
}
```

In `src/types/artists.ts`, the frontend domain model is refined to represent desktop library realities:

```typescript
export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  heroBannerUrl?: string;
  bio?: string;
  trackCount: number;
  albumCount: number;
  totalPlays: number;
  genres: string[];
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
  duration: number; // in seconds
  isLiked?: boolean;
  audioUrl?: string;
}

export interface ArtistRelease {
  id: string;
  artistId: string;
  title: string;
  coverUrl: string;
  releaseYear: number;
  type: "album" | "single" | "ep";
  trackCount: number;
}

export type ArtistSortOption = "popularity" | "name" | "albumCount";
export type SortDirection = "asc" | "desc";
export type DiscographyFilter = "all" | "album" | "single";
```

**State transitions**:

- Catalog loading: `isLoaded: false, isLoading: true` -> `db_get_artists` resolves -> `isLoaded: true, isLoading: false, artists: [ArtistDto]`.
- Empty catalog: `artists.length === 0 && isLoaded: true` -> displays empty library notice.
- Active artist selection: `activeArtistId: null` (Overview grid) <-> `activeArtistId: "artist-uuid"` (Profile view).
- Profile fetch in flight: `isLoadingProfile: true` -> displays loading skeleton; prevents false "Artist Not Found" error.
- Profile fetch resolved: `isLoadingProfile: false, artistPopularTracks[id]: [...], artistReleases[id]: [...]`.
- Popular tracks expansion: `isPopularExpanded: false` (Top 5 tracks) <-> `isPopularExpanded: true` (Top 10 tracks).
- Discography category filter: `'all'` <-> `'album'` <-> `'single'`.

**API surface**:

| Function or Command | Layer | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| db_get_artists | Tauri IPC (Rust) | none | Vec\<ArtistDto\> | local desktop | query failed |
| db_get_artist_profile | Tauri IPC (Rust) | id: String | Option\<ArtistProfileDto\> | local desktop | query failed |
| dbGetArtists | Service client (TS) | none | Promise\<ArtistDto[]\> | public | ipc invocation error |
| dbGetArtistProfile | Service client (TS) | id: string | Promise\<ArtistProfileDto \| null\> | public | ipc invocation error |
| initializeArtists | Presentation store | none | Promise\<void\> | public | logged, sets isLoaded |
| loadArtistProfile | Presentation store | id: string | Promise\<void\> | public | profile not found |
| setActiveArtistId | Presentation store | id: string \| null | updates state, triggers load | public | none |
| playArtistTopTracks | Presentation store | id: string, startIndex?: number | pushes tracks to usePlayerStore | public | no tracks for artist |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| View artist overview grid | Artist cards with name, album count, track count, total plays | `ArtistDto` records returned by `db_get_artists` |
| View artist avatar photo | Image source URL or initials fallback | `avatar_path` formatted via `formatCoverArtUrl`, or procedural initials |
| Open artist profile | Hero title, biographical summary or fallback notice, stats | `ArtistDto` fields in `ArtistProfileDto` from `db_get_artist_profile` |
| Render popular tracks | Song title, album name, play count, duration | `TrackDto` items in `ArtistProfileDto.top_tracks` |
| Render discography | Album cards with cover art, release year, tracks, type | `AlbumDto` items in `ArtistProfileDto.albums` with type mapped from track count |
| Filter discography releases | Grouped albums versus singles | Evaluated from `track_count < 4` on `AlbumDto` records |
| Play artist top tracks | Playback queue and audio file paths | `top_tracks` mapped to `Track` items with `file_path` |
| Navigate to album detail | Selected album and detail view | Dispatched to `useAlbumStore.setActiveAlbumId` |

**Key invariants**:

- In desktop mode, `useArtistStore` must never overwrite SQLite data with mock fixtures when database queries succeed.
- Popular tracks in an artist profile must always be ordered by `play_count` descending, with secondary ordering by `title` ascending.
- When `isPopularExpanded` is false, exactly 5 tracks are displayed (or fewer if total library songs for this artist is under 5); when true, up to 10 tracks are shown.
- Missing avatar paths or missing album cover paths must gracefully render procedural gradient placeholders with initials without broken image icons.
- All disk art paths must be normalized through `formatCoverArtUrl` to avoid webview asset protocol loading errors.
- If an artist record has zero associated tracks or albums in SQLite, opening their profile must display a clean empty tracks message rather than crashing or throwing errors.
- Discography release cards must correctly deep link to `useAlbumStore.setActiveAlbumId` and transition the active tab to Albums.

**Security model**:

- Client side local desktop execution strictly inside the Tauri v2 desktop sandbox.
- SQLite operations use localized rusqlite prepared statements with parameterized inputs, preventing structured query injection.
- No network requests, external telemetry, or unvetted credentials are required.

**Configuration required**:

- No new environment variables, secret keys, or feature flags are required.

**Critical test scenarios**:

- Happy path: Opening the Artists tab in desktop mode queries SQLite via `dbGetArtists`, rendering artist cards with real track counts and album counts; clicking an artist opens their profile view with top tracks and discography albums, verifies **AC-1**, **AC-6**, **AC-7**.
- Empty library notice: Launching the app with an empty SQLite database renders the Midnight theme empty state card with guidance to scan music folders in Your Library, verifies **AC-3**.
- Search and sort filtering: Entering search text filters visible artists instantly by name; changing sort option orders artists by popularity, name, or album count correctly in memory, verifies **AC-4**.
- Audio playback dispatch: Clicking Play Artist Top Tracks or clicking an individual track row invokes `usePlayerStore.playCollection` with the artist audio files, verifies **AC-8**.
- Cross view album navigation: Clicking an album card in the artist discography opens the Albums screen with that album active, verifies **AC-9**.
- Release categorization: Filtering by album displays releases with four or more tracks, while filtering by single isolates releases with fewer than four tracks, verifies **AC-10**.
- Scanner event refresh: Triggering a library scan completion event causes `useArtistStore` to refresh its artist list from SQLite automatically while keeping the active profile loaded, verifies **AC-11**.
- Web browser fallback: In an environment where Tauri runtime is not detected, `useArtistStore` hydrates from `initialArtists` fixtures smoothly, verifies **AC-2**.
- Loading feedback: Selecting an artist triggers `isLoadingProfile`, rendering loading state rather than flashing a false missing artist notice, verifies **AC-6**.

## Build plan

1. [x] Rust backend play count aggregation: Update `catalog_repo.rs` and `models.rs` so `ArtistDto` includes `total_plays: u64` queried via `COALESCE(SUM(t.play_count), 0)`, satisfies **AC-1**, **AC-4**.
2. [x] TypeScript domain types and store contracts: Update `src/types/artists.ts` and `src/types/database.ts` to reflect scalar counts (`albumCount`, `trackCount`, `totalPlays`), removing obsolete follow flags and simulated stream stats, satisfies **AC-1**, **AC-5**.
3. [x] Service client and IPC wiring: Verify and integrate `dbGetArtists` and `dbGetArtistProfile` client calls in `src/services/db.ts` with error handling, fallback detection, and asset URL formatting via `formatCoverArtUrl`, satisfies **AC-1**, **AC-2**, **AC-6**.
4. [x] Zustand store persistence: Enhance `src/store/useArtistStore.ts` with `initializeArtists`, `loadArtistProfile`, `isLoadingProfile`, scanner event subscription, and in memory search and sort over hydrated SQLite records, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**, **AC-11**.
5. [x] UI component updates: Update `ArtistCard`, `ArtistProfileBanner`, `ArtistPopularTracks`, `ArtistDiscography`, and `ArtistBioCard` under `src/components/artists/` to render local library metrics, display biography fallback notices, handle empty tracks, and remove legacy follow buttons, satisfies **AC-3**, **AC-5**, **AC-7**, **AC-10**.
6. [x] Navigation and playback integration: Wire `src/pages/Artists.tsx` page container to trigger catalog hydration on mount, keep the grid mounted with CSS visibility for scroll preservation, render profile loading skeletons, connect top tracks playback to `usePlayerStore`, and maintain cross screen navigation with `useAlbumStore`, satisfies **AC-6**, **AC-8**, **AC-9**, **AC-12**.
7. [x] Unit and integration test suite: Add tests covering SQLite artist hydration, empty state rendering, profile lazy loading, top tracks playback dispatch, scanner event refresh, and browser fallback behavior, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Real library data from scanned local files replaces static placeholder fixtures across all artist views.
- Eliminates conceptual dissonance by removing simulated streaming followers and artificial monthly listener counts in a local desktop music player.
- Reuses existing tested Rust backend IPC commands without requiring database schema migrations or connection pool changes.
- Automatic refresh on scanner completion ensures the artist view stays up to date when the user adds new music folders.
- Loading states and DOM retention provide smooth, flicker free navigation and preserve scroll position naturally.

**Negative / tradeoffs**:

- Local audio tags rarely contain artist biographical notes or dedicated artist portrait photos, meaning most artists will display procedural initials avatars until an external metadata scraper is introduced.
- Top tracks popularity is determined solely by local play counts, so newly added artists will initially have unranked popular tracks until played.

**Neutral**:

- Retires `toggleFollowArtist`, `followedArtistIds`, and `isFollowed` from state and components, simplifying the store architecture.

## Follow-up

- [ ] Complete Feature 20 (Albums and album detail persistence) to complement artist discography navigation with persisted album detail views.
- [ ] In a future phase, consider an optional local artist image downloader or music tag scraper to enrich artist photos and biographies automatically.
