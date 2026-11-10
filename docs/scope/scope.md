# Scope: Mutinhimira

A lightweight modern desktop music player inspired by Windows Groove Music and the Midnight visual layout, built with Tauri, Rust, Vite, and TypeScript.

**Build approach:** Facade (UI first clickable shell on placeholder data, then wire the backend).
**Workflow:** Beta (after /develop, /check verify on the running app, then /check review before merge). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                            | Phase      | Status      |
| --- | ---------------------------------- | ---------- | ----------- |
| 1   | Stack & architecture               | Foundation | done        |
| 2   | Coding standards & tooling         | Foundation | done        |
| 3   | Design system & navigation shell   | Foundation | done        |
| 4   | Home & discovery screen            | Phase 1    | done        |
| 5   | Search & explore screen            | Phase 1    | done        |
| 6   | Your library & folder browser      | Phase 1    | done        |
| 7   | Liked songs screen                 | Phase 1    | done        |
| 8   | Playlists & playlist detail        | Phase 1    | done        |
| 9   | Albums & album detail              | Phase 1    | done        |
| 10  | Artists & artist profile           | Phase 1    | done        |
| 11  | Queue, lyrics & settings overlays  | Phase 1    | done        |
| 12  | Now playing fullscreen view        | Phase 1    | done        |
| 13  | Data model & SQLite storage        | Phase 2    | done        |
| 14  | Core audio playback engine         | Phase 2    | done        |
| 15  | Local library scanner & metadata   | Phase 2    | done        |
| 16  | Playlists & favorites persistence  | Phase 2    | done        |
| 17  | Fast local library search indexing | Phase 2    | done        |
| 18  | Desktop UI responsiveness          | Foundation | done        |
| 19  | App branding & logo integration    | Foundation | done        |
| 20  | Albums and album detail persistence | Phase 2    | done |
| 21  | Artists and artist profile persistence | Phase 2    | done        |
| 22  | Local file lyrics parser and metadata extraction | Phase 2    | done        |
| 23  | Home listening history and popular tracks persistence | Phase 2    | done |
| 24  | Universal album and artist navigation links | Phase 2    | done        |
| 25  | Audio file metadata tag editor     | Phase 2    | done        |
| 26  | Operating system media keys and transport controls | Phase 3 | in-progress |
| 27  | Gapless track transitions          | Phase 2    | in-progress |
| 28  | Playlist and saved collection hydration | Phase 2 | done        |
| 29  | Home listening recommendations     | Phase 2    | in-progress |
| 30  | Live audio visualizer              | Phase 2    | done        |


## Foundations

### 1. Stack & architecture · done

Decide the Tauri, Rust, Vite, and TypeScript project structure, and scaffold a runnable desktop application shell.
**Done when:** the stack is recorded in a spec, Tauri boots a desktop window running the Vite dev server, and cargo build succeeds.
spec [0001](../specs/0001-stack-architecture/index.md) · code in src/ and src-tauri/

- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`

### 2. Coding standards & tooling · done

Capture conventions, then configure TypeScript checks, Rust clippy, formatting, and test commands from the scaffold.
**Done when:** root `AGENTS.md` reflects the project stack, and typecheck, lint, and formatting run clean.
spec [0003](../specs/0003-coding-standards-tooling/verify.md)

- [x] Capture conventions and tooling choices: `/audit`
- [x] Verify it: `/check verify coding standards & tooling`

### 3. Design system & navigation shell · done

Extract the Midnight styling tokens and build the application shell with sidebar navigation, view switching state, and player footer container.
**Done when:** the sidebar items switch the active view container, navigation buttons update, and the dark Midnight theme variables render consistently across all views.

spec [0019](../specs/0019-design-system-navigation-shell/index.md) · code in src/components/layout/, src/components/ui/, src/store/useNavigationStore.ts, src/App.tsx

- [x] Design it (spec): `/architect design system & navigation shell`
- [x] Build it: `/develop design system & navigation shell`
  - [x] Formalize Tailwind CSS v4 Midnight tokens and reusable UI primitives (AC-6, AC-7)
  - [x] Implement useNavigationStore with back/forward history and typed route params (AC-1, AC-2)
  - [x] Create TopNavBar with navigation buttons, breadcrumb, and desktop shortcut listeners (AC-3, AC-4, AC-5)
  - [x] Assemble modular AppShell and integrate App with clean scroll containment (AC-8)
- [x] Verify it: `/check verify design system & navigation shell`
- [x] Test it: `/test design system & navigation shell`

### 18. Desktop UI responsiveness · done

Standardize desktop window responsiveness and interaction performance across all pages and components with Tailwind CSS v4, collapsible navigation, virtualized tables, and isolated playback timer state.
**Done when:** the desktop window resizes fluidly down to 640px by 480px without layout breakage, sidebar collapses to a 68px icon rail under 1024px, player footer adapts below 900px, track tables virtualize smoothly at 60 FPS via @tanstack/react-virtual, and audio timer ticks do not trigger whole page re renders.
spec [0017](../specs/0017-desktop-ui-responsiveness/index.md)

- [x] Design it (spec): `/architect desktop UI responsiveness`
- [x] Build it: `/develop desktop UI responsiveness`
  - [x] Tauri window boundaries and responsive App shell with 68px icon rail navigation (AC-1, AC-2, AC-8, AC-9)
  - [x] Compact PlayerFooter deck with volume popover and isolated scrubber timer selectors (AC-3, AC-7, AC-8, AC-9)
  - [x] Progressive column hiding and virtualized song tables using @tanstack/react-virtual (AC-4, AC-6, AC-9)
  - [x] Fluid auto fill card grids and page container Tailwind v4 responsive styling (AC-5, AC-8, AC-9)
        code in `src/components/layout/`, `src/components/player/`, `src/components/library/`, `src/components/liked/`, `src/components/playlists/`, `src/test/responsive.test.tsx`, `src-tauri/tauri.conf.json`
- [x] Verify it: `/check verify desktop UI responsiveness`
- [x] Review it: `/check review desktop UI responsiveness` · findings in `docs/reviews/2026-10-26-feat-desktop-ui-responsiveness.md` · verdict: Approve with nits

### 19. App branding & logo integration · done

Incorporate official Mutinhimira logos across the sidebar navigation header, browser document favicon, and native desktop bundle icons.
**Done when:** the sidebar renders the Mutinhimira logo lockup in expanded mode and standalone symbol in collapsed mode, index.html links the new favicon, and Tauri bundle configuration includes generated platform icons.
spec [0018](../specs/0018-app-branding-logo-integration/index.md)

- [x] Design it (spec): `/architect app branding & logo integration`
- [x] Build it: `/develop app branding & logo integration`
  - [x] Asset normalization in public/logos with clean kebab case copies (AC-1)
  - [x] Navigation sidebar brand header integration with expanded and collapsed rail states (AC-2, AC-3)
  - [x] Web document favicon linkage in index.html (AC-4)
  - [x] Native desktop icon bundle generation via Tauri CLI from vector master (AC-5, AC-6)
  - [x] Responsive test suite update and brand verification (AC-7)
        code in `public/logos/`, `src/components/layout/NavigationSidebar.tsx`, `index.html`, `src-tauri/icons/`, `src/test/responsive.test.tsx`
- [x] Verify it: `/check verify app branding & logo integration`
- [x] Test it: `/test app branding & logo integration`

## Phase 1: Clickable UI prototype

### 4. Home & discovery screen · done

Build the home discovery view with hero showcase banner, playlist recommendation cards, recently played carousel, and popular tracks table.
**Done when:** clicking Home displays the hero card, curated playlist cards, recently played items, and popular track list with mock data and play button triggers.
spec [0002](../specs/0002-home-discovery-screen/index.md)

- [x] Design it (spec): `/architect home & discovery screen`
- [x] Build it: `/develop home & discovery screen`
  - [x] Discovery types and mock fixtures (AC-1, AC-6)
  - [x] Zustand discovery and playback store with simulated timer (AC-2, AC-3, AC-4, AC-8)
  - [x] Modular Home components HeroBanner, CuratedGrid, RecentCarousel, TrackTable with marquee and fallbacks (AC-1, AC-3, AC-5, AC-7)
  - [x] Page assembly in Home.tsx and App.tsx shell navigation integration (AC-1, AC-2, AC-8)
  - [x] Interactive unit and component tests (AC-2, AC-3, AC-4)
        code in `src/pages/Home.tsx`, `src/components/home/`, `src/store/usePlayerStore.ts`
- [x] Verify it: `/check verify home & discovery screen`

### 5. Search & explore screen · done

Create the search interface with instant query input, filter category pills, and categorized result cards for tracks, albums, and artists.
**Done when:** selecting Search opens the search screen, typing filters mock music items by title, artist, or genre, and category chips update visible cards.
spec [0004](../specs/0004-search-explore-screen/index.md)

- [x] Design it (spec): `/architect search & explore screen`
- [x] Build it: `/develop search & explore screen`
  - [x] Search types and mock data fixtures for genres, albums, and artists (AC-1, AC-2, AC-5)
  - [x] Zustand search store with debounced filtering, category switching, and recent queries (AC-3, AC-4, AC-6, AC-8, AC-10)
  - [x] Modular components SearchBar, FilterPills, ExploreGenresGrid, CategorizedResults, EmptySearchState (AC-1, AC-2, AC-5, AC-7, AC-8, AC-9)
  - [x] Search page assembly and App shell navigation wiring (AC-1, AC-3, AC-7)
  - [x] Unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-7, AC-8, AC-9)
        code in `src/pages/Search.tsx`, `src/components/search/`, `src/store/useSearchStore.ts`
- [x] Verify it: `/check verify search & explore screen`

### 6. Your library & folder browser · done

Construct the local library overview screen displaying indexed songs table, folder paths list, and folder picker action button.
**Done when:** selecting Your Library presents the song table with sortable columns, total track count, and a clickable add music folder action card.
spec [0005](../specs/0005-your-library-folder-browser/index.md)

- [x] Design it (spec): `/architect your library & folder browser`
- [x] Build it: `/develop your library & folder browser`
  - [x] Library types, sort contracts, and mock fixtures (AC-1, AC-2, AC-3)
  - [x] Zustand library store with folder management, rescan simulation, and sorting (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)
  - [x] Modular components LibraryHeader, FolderManagerPanel, FolderSelectionModal, FolderRemovalDialog, SongTable, and EmptyLibraryState (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10, AC-11)
  - [x] Library page assembly and App navigation shell wiring (AC-1, AC-9)
  - [x] Unit and component test suite (AC-1, AC-2, AC-4, AC-5, AC-7, AC-8, AC-10)
  - [x] Native system folder picker dialog integration and review finding F-1 resolution (Finding F-1)
        code in `src/pages/Library.tsx`, `src/components/library/`, `src/store/useLibraryStore.ts`, `src-tauri/Cargo.toml`, `src/test/libraryFolderPicker.test.tsx`
- [x] Verify it: `/check verify your library & folder browser`
- [x] Review it: `/check review your library & folder browser`, findings in `docs/reviews/2026-10-30-feat-your-library-folder-browser.md`, verdict: Approved (REV-1 and REV-2 resolved)

### 7. Liked songs screen · done

Assemble the liked tracks collection view with decorative header banner, track statistics, play all action, and favorited songs list.
**Done when:** navigating to Liked Songs shows the heart hero banner, total count and duration, with interactive heart buttons that toggle track like states.
spec [0006](../specs/0006-liked-songs-screen/index.md)

- [x] Design it (spec): `/architect liked songs screen`
- [x] Build it: `/develop liked songs screen`
  - [x] Liked songs types, sort contracts, and mock fixtures (AC-1, AC-7)
  - [x] Zustand liked songs store with unlike retention, filtering, and sorting (AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-12)
  - [x] Modular components LikedBanner, LikedFilterBar, LikedSongTable, and EmptyLikedState (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11)
  - [x] Page assembly in LikedSongs.tsx and App navigation shell wiring (AC-1, AC-11, AC-12)
  - [x] Comprehensive unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src/pages/LikedSongs.tsx`, `src/components/liked/`, `src/store/useLikedSongsStore.ts`
- [x] Verify it: `/check verify liked songs screen`

### 8. Playlists & playlist detail · done

Display user playlist cards grid, new playlist creation trigger, and dedicated playlist detail view with custom cover, tracklist, and action buttons.
**Done when:** clicking Playlists renders the playlist collection, clicking a playlist opens its detail view with track list, and new playlist opens a creation prompt.
spec [0007](../specs/0007-playlists-playlist-detail/index.md)

- [x] Design it (spec): `/architect playlists & playlist detail`
- [x] Build it: `/develop playlists & playlist detail`
  - [x] Playlist types, gradient presets, and mock playlist fixtures (AC-1, AC-2, AC-4)
  - [x] Zustand playlist store with CRUD, track curation, reordering, and playback queue coordination (AC-2, AC-3, AC-6, AC-7, AC-9, AC-10, AC-11, AC-12)
  - [x] Modular components PlaylistHeader, PlaylistGrid, PlaylistCard, PlaylistModal, PlaylistDetailBanner, PlaylistSongTable, PlaylistEmptyState, DeletePlaylistDialog, and AddSongsDrawer (AC-1, AC-2, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
  - [x] Page assembly in Playlists.tsx, App navigation shell wiring, and sidebar reactive playlists synchronization (AC-1, AC-3, AC-4, AC-5, AC-11, AC-12)
  - [x] Unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src/pages/Playlists.tsx`, `src/components/playlists/`, `src/store/usePlaylistStore.ts`
- [x] Verify it: `/check verify playlists & playlist detail`

### 9. Albums & album detail · done

Build the album collection grid with cover art, release year, and detailed album view featuring header metadata, artist link, and numbered tracklist.
**Done when:** selecting Albums displays the album grid, clicking an album navigates to the album detail layout showing all tracks, durations, and release year.
spec [0008](../specs/0008-albums-album-detail/index.md)

- [x] Design it (spec): `/architect albums & album detail`
- [x] Build it: `/develop albums & album detail`
  - [x] Album types and mock album fixtures with multi disc entries and fallback artwork (AC-1, AC-8, AC-11)
  - [x] Zustand album store with search, sort, active selection, favorite toggling, and playback queueing (AC-2, AC-3, AC-4, AC-5, AC-7, AC-10, AC-12)
  - [x] Modular components AlbumHeader, AlbumGrid, AlbumCard, AlbumDetailBanner, AlbumTrackList, AlbumDiscHeader, AlbumTrackRow, AlbumVinylPlaceholder, and AlbumEmptyState (AC-1, AC-2, AC-4, AC-8, AC-9, AC-10, AC-11)
  - [x] Page container Albums.tsx, App navigation shell wiring, and cross screen deep linking (AC-1, AC-4, AC-5, AC-6, AC-12)
  - [x] Comprehensive unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src/pages/Albums.tsx`, `src/components/albums/`, `src/store/useAlbumStore.ts`
- [x] Verify it: `/check verify albums & album detail`

### 10. Artists & artist profile · done

Present artists in a circular portrait grid with follower counts, along with an artist profile page showing hero banner, top tracks table, and album discography.
**Done when:** selecting Artists shows artist cards, clicking an artist opens their profile with popular tracks, discography releases, and about blurb.
spec [0009](../specs/0009-artists-artist-profile/index.md)

- [x] Design it (spec): `/architect artists & artist profile`
- [x] Build it: `/develop artists & artist profile`
  - [x] Artist domain types, procedural avatar helpers, and rich artist fixtures (AC-1, AC-8, AC-11)
  - [x] Zustand artist store with catalog search, sort, active selection, follow toggle, and discography filtering (AC-2, AC-3, AC-4, AC-7, AC-10, AC-12)
  - [x] Modular components ArtistHeader, ArtistGrid, ArtistCard, ArtistProfileBanner, ArtistPopularTracks, ArtistPopularTrackRow, ArtistDiscography, ArtistBioCard, and ArtistEmptyState (AC-1, AC-2, AC-4, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11)
  - [x] Page container Artists.tsx, App navigation shell wiring, and cross screen deep linking (AC-1, AC-4, AC-5, AC-6, AC-12)
  - [x] Comprehensive unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src/pages/Artists.tsx`, `src/components/artists/`, `src/store/useArtistStore.ts`
- [x] Verify it: `/check verify artists & artist profile`

### 11. Queue, lyrics & settings overlays · done

Build the slide out now playing queue drawer, timed lyrics overlay modal, and audio preferences settings panel.
**Done when:** clicking queue or lyrics in the player bar toggles their respective drawers or modals, and settings allows selecting mock audio devices and visualizer styles.
spec [0010](../specs/0010-queue-lyrics-settings-overlays/index.md)

- [x] Design it (spec): `/architect queue, lyrics & settings overlays`
- [x] Build it: `/develop queue, lyrics & settings overlays`
  - [x] Domain types and mock fixtures for queue, lyrics, and audio devices (AC-3, AC-8, AC-11, AC-12)
  - [x] Reactive Zustand overlay visibility and settings stores with local storage persistence (AC-1, AC-2, AC-12, AC-13)
  - [x] Player store queue extensions for reordering, adding, removing, and clearing upcoming tracks (AC-4, AC-5, AC-6, AC-7)
  - [x] Modular components for QueueDrawer, LyricsModal, and SettingsModal with smooth auto scroll and drag reordering (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
  - [x] PlayerFooter triggers, App sidebar gear trigger, escape key listener, and backdrop dismissal (AC-1, AC-2, AC-8, AC-12, AC-13)
  - [x] Comprehensive unit and component test suite (AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12, AC-13)
        code in `src/components/queue/`, `src/components/lyrics/`, `src/components/settings/`, `src/store/useOverlayStore.ts`, `src/store/useSettingsStore.ts`
- [x] Verify it: `/check verify queue, lyrics & settings overlays`

### 12. Now playing fullscreen view · done

Fullscreen immersion view for the active track with enlarged album artwork, full width timeline scrub bar, dedicated playback transport controls, and return navigation to the prior screen.
**Done when:** clicking the track thumbnail or song title in PlayerFooter opens the fullscreen now playing view without sidebar or bottom player bar, and clicking the return button restores the previous screen.
spec [0011](../specs/0011-now-playing-fullscreen-view/index.md)

- [x] Design it (spec): `/architect now playing fullscreen view`
- [x] Build it: `/develop now playing fullscreen view`
  - [x] Extended domain models, ambient color types, and persistent user settings (AC-5, AC-14)
  - [x] Reactive Zustand overlay store extensions and view mode selectors (AC-2, AC-14)
  - [x] Modular fullscreen subcomponents for header, artwork hero, synchronized lyrics, 720p visualizer, and bottom deck (AC-4, AC-6, AC-7, AC-8, AC-9, AC-10)
  - [x] NowPlayingFullscreen overlay container with auto hide timers, scoped keyboard listeners, and accessibility dialog trap (AC-2, AC-3, AC-5, AC-8, AC-11, AC-12, AC-13, AC-15)
  - [x] PlayerFooter entry triggers and root App integration (AC-1, AC-2, AC-13)
  - [x] Comprehensive unit and component test suite (AC-1, AC-2, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15)
        code in `src/components/fullscreen/`, `src/store/useOverlayStore.ts`, `src/types/discovery.ts`, `src/types/overlays.ts`
- [x] Verify it: `/check verify now playing fullscreen view`

## Phase 2: Backend wiring & persistence

### 13. Data model & SQLite storage · done

Define core Rust and TypeScript entities for Track, Album, Artist, Playlist, and PlaybackState, with SQLite schema migrations and connection pool.
**Done when:** database migrations create tables with indices for fast search, and Rust models serialize to TypeScript types cleanly.
spec [0012](../specs/0012-data-model-sqlite-storage/index.md)

- [x] Design it (spec): `/architect data model & SQLite storage`
- [x] Build it: `/develop data model & SQLite storage`
  - [x] Cargo dependencies, initial SQL migrations, and connection manager with WAL mode (AC-1, AC-2, AC-3, AC-4, AC-5, AC-11)
  - [x] Rust domain models, DTOs, and error serialization contracts (AC-2, AC-6)
  - [x] Folder, track, catalog, playlist, and settings repositories (AC-7, AC-8, AC-9, AC-10, AC-12)
  - [x] Tauri IPC command handlers, capabilities permissions, and app setup lifecycle (AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
  - [x] Frontend TypeScript database service and integration test suite (AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src-tauri/src/db/`, `src-tauri/src/commands/db.rs`, `src/services/db.ts`, `src/types/database.ts`
- [x] Verify it: `/check verify data model & SQLite storage`

### 14. Core audio playback engine · done

Connect the player bar through Tauri IPC to the Rodio audio engine on a dedicated audio thread.
**Done when:** clicking play loads local audio, sound plays through the output device, playback progress updates the UI bar in real time, and pause, resume, seek, and volume controls work.
spec [0013](../specs/0013-core-audio-playback-engine/index.md)

- [x] Design it (spec): `/architect core audio playback engine`
- [x] Build it: `/develop core audio playback engine`
  - [x] Cargo Rodio dependency, audio domain models, and thread safe AudioEngine container (AC-1, AC-2, AC-8)
  - [x] Format validation, audio playback, seeking, and transport control command handlers (AC-3, AC-4, AC-5, AC-6, AC-10)
  - [x] Background progress timer thread, track completion monitor, and SQLite play count milestone updates (AC-7, AC-9, AC-11)
  - [x] Frontend AudioService with browser mock fallback and usePlayerStore real time IPC integration (AC-12)
  - [x] Rust unit test suite and Vitest frontend integration tests (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src-tauri/src/audio/`, `src-tauri/src/commands/audio.rs`, `src/services/audio.ts`, `src/types/audio.ts`, `src/store/usePlayerStore.ts`
- [x] Verify it: `/check verify core audio playback engine`

### 15. Local library scanner & metadata · done

Scan music folders in a background worker thread, extract audio tags and embedded artwork with lofty, and persist records into SQLite.
**Done when:** selecting a music folder recursively finds audio files, saves track tags and album art into SQLite, and populates the library view with real local music.
spec [0016](../specs/0016-local-library-scanner-metadata/index.md)

- [x] Design it (spec): `/architect local library scanner & metadata`
- [x] Build it: `/develop local library scanner & metadata`
  - [x] Cargo dependencies lofty, walkdir, and rayon with recursive discovery and in memory differential check (AC-1, AC-2, AC-3, AC-9)
  - [x] Lofty metadata parsing, tag fallbacks, and SHA256 deduplicated cover art disk caching (AC-3, AC-4, AC-5, AC-10)
  - [x] Catalog reconciliation, atomic upsert persistence, chunked transactions, and cancellation safe pruning (AC-6, AC-7, AC-8)
  - [x] Scanner service coordinator with worker threads, busy rejection, and throttled Tauri progress events (AC-10, AC-11)
  - [x] Frontend scanner client service and useLibraryStore integration with live scanning feedback and track table refresh (AC-11, AC-12)
        code in `src-tauri/src/scanner/`, `src-tauri/src/commands/scanner.rs`, `src/services/scanner.ts`, `src/types/scanner.ts`, `src/store/useLibraryStore.ts`
- [x] Verify it: `/check verify local library scanner & metadata`
- [x] Review it: `/check review local library scanner & metadata` · findings in `docs/reviews/2026-10-26-feat-local-library-scanner-metadata.md` · verdict: Approve with nits

### 16. Playlists & favorites persistence · done

Wire playlist creation, editing, track reordering, and liking songs to immediate SQLite database persistence.
**Done when:** creating or editing playlists and clicking hearts updates SQLite records, and changes persist across application restarts.
spec [0015](../specs/0015-playlists-favorites-persistence/index.md)

- [x] Design it (spec): `/architect playlists & favorites persistence`
- [x] Build it: `/develop playlists & favorites persistence`
  - [x] Schema migration and Rust backend persistence: Migration V002 schema additions, updated repository methods, transactional container seeding, and Tauri IPC command contracts (AC-1, AC-2, AC-3, AC-4, AC-8)
  - [x] Centralized favorite synchronization: Shared coordinator service with in flight request serialization, instant SQLite persistence, and cross store heart state sync (AC-1, AC-9, AC-10, AC-11)
  - [x] Frontend playlist and liked songs stores: SQLite hydration on boot, lazy detail fetching, optimistic CRUD, and atomic drag reordering (AC-5, AC-6, AC-7, AC-8)
  - [x] Playback context coordination and test suite: Player store context cleanup on playlist deletion, optimistic rollback handling, and comprehensive unit and integration tests (AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
        code in `src-tauri/migrations/V002__playlists_and_favorites.sql`, `src-tauri/src/db/`, `src/services/favoritesSync.ts`, `src/store/usePlaylistStore.ts`, `src/store/useLikedSongsStore.ts`, `src/store/usePlayerStore.ts`, `src/test/playlistsPersistence.test.tsx`
- [x] Verify it: `/check verify playlists & favorites persistence`
- [x] Review it: `/check review playlists & favorites persistence` · findings in `docs/reviews/2026-10-27-feat-playlists-favorites-persistence.md` · verdict: Approve with nits

### 17. Fast local library search indexing · done

Filter the music collection by title, artist, or album using indexed SQLite queries with debounced UI input.
**Done when:** typing in the search box queries SQLite and updates visible tracks and albums with matching results in under fifty milliseconds.
spec [0014](../specs/0014-fast-local-library-search-indexing/index.md)

- [x] Design it (spec): `/architect fast local library search indexing`
- [x] Build it: `/develop fast local library search indexing`
  - [x] rusqlite full extension dependency and V003 search index migration with B Tree locator table and targeted triggers (AC-1, AC-2, AC-3, AC-4, AC-5)
  - [x] Rust search repository with query sanitization, tokenization, BM25 scoring, exact match boosting, and dynamic genre aggregation (AC-6, AC-7, AC-8, AC-9, AC-10)
  - [x] Tauri IPC command db_search_library, client service helper, and frontend model adapters (AC-7, AC-11, AC-17)
  - [x] Zustand search store wiring with debounced IPC queries, monotonic request tokens, and badge count preservation (AC-12, AC-13, AC-14, AC-16)
  - [x] Search UI playlist filter pill and playlist card grid integration with queue playback (AC-14, AC-15)
- [x] Verify it: `/check verify fast local library search indexing`

### 20. Albums and album detail persistence · done

Hydrate albums catalog and album detail views from SQLite, persist favorite album toggles across restarts, and synchronize with local library scanner updates.
**Done when:** navigating to Albums loads scanned music albums from the database, opening an album shows its real tracklist and metadata from SQLite, and favorite states persist across restarts.

spec [0020](../specs/0020-albums-album-detail-persistence/index.md)

- [x] Design it (spec): `/architect albums and album detail persistence`
- [x] Build it: `/develop albums and album detail persistence`
  - [x] Migration V004 for album favorites and repository duration aggregation (AC-1, AC-2, AC-3)
  - [x] Tauri IPC command db_toggle_album_favorite and batch favorites synchronization (AC-4, AC-5)
  - [x] Asynchronous useAlbumStore SQLite hydration and lazy tracklist loading (AC-6, AC-7, AC-11)
  - [x] Optimistic favorite toggling, derived 50 percent liked sync, and scanner refresh (AC-8, AC-9, AC-10)
  - [x] Playback queueing integration and persistence test suite (AC-11, AC-12)
        code in `src-tauri/migrations/V004__album_favorites.sql`, `src-tauri/src/db/`, `src-tauri/src/commands/db.rs`, `src/services/db.ts`, `src/services/favoritesSync.ts`, `src/store/useAlbumStore.ts`, `src/store/useLikedSongsStore.ts`, `src/test/albumsPersistence.test.tsx`
- [x] Verify it: `/check verify albums and album detail persistence`
- [x] Test it: `/test albums and album detail persistence`

### 21. Artists and artist profile persistence · done

Hydrate artists catalog and artist profile views from SQLite, persist real local library metrics across restarts, and coordinate discography releases with scanned library albums.
**Done when:** navigating to Artists loads scanned musical artists from SQLite with total play counts, opening an artist profile displays real popular tracks and discography releases from the database with smooth loading states, and discography releases deep link into albums.

spec [0021](../specs/0021-artists-artist-profile-persistence/index.md)

- [x] Design it (spec): /architect artists and artist profile persistence
- [x] Build it: /develop artists and artist profile persistence
  - [x] Rust catalog repository total plays aggregation and DTO contract updates (AC-1, AC-4)
  - [x] TypeScript domain models and client IPC integration with asset formatting (AC-1, AC-2, AC-5, AC-6)
  - [x] Zustand store SQLite hydration, on demand profile fetching, and scanner auto refresh (AC-1, AC-4, AC-6, AC-11)
  - [x] UI components local metrics rendering, biography fallback, and scroll preservation (AC-3, AC-5, AC-7, AC-10, AC-12)
  - [x] Top tracks audio playback queueing and cross view album navigation (AC-8, AC-9)
  code in src/store/useArtistStore.ts, src-tauri/src/db/catalog_repo.rs, src/pages/Artists.tsx
- [x] Verify it: /check verify artists and artist profile persistence
- [x] Test it: /test artists and artist profile persistence

### 22. Local file lyrics parser and metadata extraction · done

Parse embedded lyrics tags and local companion lrc sidecar files from scanned music tracks, save or cache synchronized lines in SQLite, and deliver real lyrics to the player overlays via Tauri IPC.
**Done when:** playing a local audio track with embedded tags or an adjacent lrc file displays synchronized or plain text lyrics in the lyrics modal and fullscreen view without mock data fallbacks.

spec [0020](../specs/0020-local-file-lyrics-parser-metadata-extraction/index.md)

- [x] Design it (spec): `/architect local file lyrics parser and metadata extraction`
- [x] Build it: `/develop local file lyrics parser and metadata extraction`
  - [x] Migration V004 track_lyrics schema and repository methods with offset preservation upsert (AC-4, AC-5)
  - [x] Native Rust lyrics parser module with companion lrc, header offset, and lofty tag extraction (AC-1, AC-2, AC-3, AC-10)
  - [x] Tauri IPC commands and DTO contracts for retrieval, offset persistence, and rescanning (AC-6)
  - [x] TypeScript lyrics client service and reactive Zustand useLyricsStore with local active line tracking (AC-7, AC-9)
  - [x] LyricsModal and FullscreenLyricsView integration with seeking arithmetic and offset controls (AC-8, AC-9, AC-10)
- [x] Verify it: `/check verify local file lyrics parser and metadata extraction`
- [x] Test it: `/test local file lyrics parser and metadata extraction`

### 23. Home listening history and popular tracks persistence · done

Connect the Home discovery screen to local SQLite listening history and popular track play counts, replacing static mock fixtures with real playback analytics and live event updates.
**Done when:** playing songs records listening history on audio milestones, the Home carousel displays deduplicated recent tracks from SQLite, popular tracks rank local music by play count with backfill, and clear history removes events while keeping track stats.

spec [0022](../specs/0022-home-listening-history-popular-tracks-persistence/index.md)

- [x] Design it (spec): `/architect home & discovery screen: wire listening history and popular tracks to SQLite`
- [x] Build it: `/develop home listening history and popular tracks persistence`
  - [x] Migration V005 schema and Rust backend history repository with batch pruning (AC-1, AC-2, AC-3, AC-4)
  - [x] Native audio engine context passing, milestone latch, and Tauri event emission (AC-5, AC-6, AC-7)
  - [x] TypeScript database client service and DTO adapters with artwork formatting (AC-8, AC-9)
  - [x] Zustand usePlayerStore SQLite hydration, event listener, and scanner sync (AC-10, AC-11, AC-14)
  - [x] Home UI components wiring with dynamic showcase, deduplicated carousel, and contextual empty states (AC-12, AC-13)
- [x] Verify it: `/check verify home listening history and popular tracks persistence`
- [x] Test it: `/test home listening history and popular tracks persistence`

### 24. Universal album and artist navigation links · done

Make every displayed album and artist name across the desktop app an interactive link that navigates to the respective album detail or artist profile page, preventing row click side effects and closing open overlays.
**Done when:** clicking any album name opens its album detail view, and clicking any artist name opens its artist profile view across all tables, cards, footer player, queue drawer, and fullscreen player, without triggering track playback or selection.

spec [0024](../specs/0024-universal-album-artist-navigation-links/index.md)

- [x] Design it (spec): `/architect universal album and artist navigation links`
- [x] Build it: `/develop universal album and artist navigation links`
  - [x] Implement useEntityNavigation application hook with overlay closing, entity resolution, and search query synchronization (AC-3, AC-4, AC-5, AC-7)
  - [x] Create reusable ArtistLink and AlbumLink components with compound band name protection, collaboration delimiter splitting, and event bubbling isolation (AC-6, AC-8, AC-9, AC-10)
  - [x] Integrate universal links across player footer, fullscreen views, and queue drawer (AC-1, AC-2, AC-6, AC-7)
  - [x] Integrate universal links across table views, search results, home showcase, and album/artist banners (AC-1, AC-2, AC-5, AC-6)
        code in `src/hooks/useEntityNavigation.ts`, `src/components/common/`, `src/test/navigationLinks.test.tsx`
- [x] Verify it: `/check verify universal album and artist navigation links`
- [x] Test it: `/test universal album and artist navigation links`
### 25. Audio file metadata tag editor · done

Allow users to edit physical audio tags on disk and sync changes to SQLite, with support for title, artist, album, genre, year, track number, disc number, and cover art.
**Done when:** users can open an edit modal from track context menus, save changes to file tags via Lofty, update the SQLite database atomically, and see immediate UI updates without playback lock conflicts.

spec [0023](../specs/0023-audio-file-metadata-tag-editor/index.md)

- [x] Design it (spec): `/architect audio file metadata tag editor`
- [x] Build it: `/develop audio file metadata tag editor`
  - [x] TypeScript DTO contracts, tag editor client service, and Zustand modal store (AC-1, AC-4)
  - [x] TagEditorModal and BatchTagEditorModal components with cover art picker, drag and drop, and Album Details integration (AC-2, AC-3, AC-4, AC-5)
  - [x] Native Rust Lofty probing, image normalization, and unique temporary file writer with Windows retry loop (AC-1, AC-5, AC-6)
  - [x] Rodio playback coordination with atomic reload guard to prevent file locks and premature track skips (AC-7)
  - [x] SQLite transaction repository for in place album updates, artist reconciliation, FTS5 sync, and Tauri event emission (AC-8, AC-9, AC-10, AC-11)
        code in `src/components/tagger/`, `src/store/useTagEditorStore.ts`, `src-tauri/src/tagger/`, `src-tauri/src/commands/tagger.rs`, `src-tauri/src/audio/engine.rs`
- [x] Verify it: `/check verify audio file metadata tag editor`
- [x] Test it: `/test audio file metadata tag editor`

### 28. Playlist and saved collection hydration · done

Connect playlist views and Home saved collections to local SQLite records with loading, empty, and retry states.
**Done when:** playlists show real data and detail entries from SQLite, Home shows up to six saved playlists and albums with balanced slots and See all navigation, independent data sources fail gracefully without hiding successful cards, and unsupported controls are disabled with accessible explanations.

spec [0027](../specs/0027-playlist-and-saved-collection-hydration/index.md)

- [x] Design it (spec): `/architect playlist and saved collection hydration`
- [x] Build it: `/develop playlist and saved collection hydration`
  - [x] Loading skeletons, empty guidance, inline error retry cards, and accessible explanations for unsupported controls (AC-1, AC-3, AC-5)
  - [x] Connect Home Your Collections section with sequential layout and six card balancing (AC-2)
  - [x] Wire See all navigation, album detail navigation, and playlist playback with async track hydration (AC-4)
  - [x] Store error states, fixture clearance on SQLite error, and unit test coverage (AC-1, AC-2, AC-3, AC-4, AC-5)
        code in `src/components/home/CuratedGrid.tsx`, `src/pages/Playlists.tsx`, `src/components/playlists/`, `src/store/usePlaylistStore.ts`, `src/store/useAlbumStore.ts`, `src/test/playlistCollectionHydration.test.tsx`
- [x] Verify it: `/check verify playlist and saved collection hydration`
- [x] Test it: `/test playlist and saved collection hydration`

### 29. Home listening recommendations · in-progress

Provide four dynamic recommendation collections on Home (Recently Added, Most Played, Best of an Artist, Trending Genre) based on SQLite history and library tracks.
**Done when:** Home shows the four generated collections with skeletons while loading, ranking rules and time cutoffs are computed via a single aggregate SQLite query, empty history falls back to library tracks with From your library labels, and listening history is pruned after 30 days by age.

spec [0028](../specs/0028-home-listening-recommendations/index.md)

- [x] Design it (spec): `/architect home listening recommendations`
- [x] Build it: `/develop home listening recommendations`
  - [x] Recommendation card shells, loading skeletons, retry states, and source labels (AC-1, AC-6, AC-10)
  - [x] Aggregate SQLite read query for the four rankings, formatted titles, and library fallback tracks (AC-2, AC-3, AC-4, AC-5, AC-6)
  - [x] 30 day history age pruning on history recording and startup maintenance (AC-5, AC-9)
  - [x] Home recommendation hydration and event driven refresh on history record, scan complete, and history clear (AC-8, AC-10)
  - [x] Queue replacement and playback context wiring on play and card clicks (AC-7)
        code in `src-tauri/src/db/history_repo.rs`, `src-tauri/src/commands/db.rs`, `src/services/db.ts`, `src/store/useRecommendationsStore.ts`, `src/components/home/RecommendationsGrid.tsx`, `src/pages/Home.tsx`, `src/test/homeRecommendations.test.tsx`
- [x] Verify it: `/check verify home listening recommendations`
- [ ] Test it: `/test home listening recommendations`

### 30. Live audio visualizer · done

Connect the fullscreen visualizer to live audio playback using frequency analysis in the native Rodio engine.
**Done when:** the fullscreen visualizer displays real frequency data across 32 normalized bands from the active audio output, analysis runs on a background Rust worker with RustFFT and streams via a Tauri Channel only while active, pause decays to baseline, and engine errors show a retry state without simulated fallback.

spec [0029](../specs/0029-live-audio-visualizer/index.md) · code in `src-tauri/src/audio/`, `src-tauri/src/commands/visualizer.rs`, `src/services/audio.ts`, `src/hooks/useSpectrumAnalysis.ts`, `src/components/fullscreen/`

- [x] Design it (spec): `/architect live audio visualizer`
- [x] Build it: `/develop live audio visualizer`
  - [x] Visualizer data state, error view, retry action, Artwork return navigation, and disabled control explanations (AC-4, AC-5)
  - [x] Nonallocating SpectrumTapSource wrapper, Rodio sample tap, and RustFFT background analysis worker (AC-1, AC-3, AC-6)
  - [x] Tauri Channel streaming command with cancellation token, transition watchdog guards, and TypeScript service (AC-2, AC-3, AC-5)
  - [x] Bars and wave visualizer style integration with 32 band frames and lifecycle teardown (AC-1, AC-2, AC-3, AC-5)
  - [x] Tests for low band interpolation, tone analysis, stream lifecycle, pause decay, and error recovery (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6)
- [x] Verify it: `/check verify live audio visualizer`
- [x] Test it: `/test live audio visualizer`



## Phase 3: Operating system integration

### 26. Operating system media keys and transport controls · in-progress · Journey

Let you control playback through Windows system media controls, media keys, and global shortcuts. Start with Windows, with other desktop platforms as a later expansion.
**Done when:** Windows media controls show the current track and playback state, and media keys and global shortcuts control play, pause, previous track, and next track while keeping playback state in sync.

spec [0025](../specs/0025-system-media-keys-transport-controls/index.md)

- [x] Design it (spec): `/architect operating system media keys and transport controls`
- [x] Build it: `/develop operating system media keys and transport controls`
  - [x] Native souvlaki integration, Windows SMTC bindings, and background message handling (AC-1, AC-2, AC-6)
  - [x] Track metadata synchronization, SQLite cover art resolution, and PNG fallback (AC-3, AC-4, AC-5)
  - [x] Hardware media keys capture, action dispatch mapping, and frontend queue synchronization (AC-7, AC-8, AC-9)
  - [x] UserSettings schema extension, SQLite persistence, and Playback settings toggle (AC-10, AC-11, AC-12)
        code in `src-tauri/src/media_controls/`, `src-tauri/src/commands/media_controls.rs`, `src/services/mediaControls.ts`, `src/hooks/useMediaControls.ts`, `src/components/settings/SystemMediaControlsToggle.tsx`, `src/test/mediaControls.test.tsx`
- [x] Verify it: `/check verify operating system media keys and transport controls`
- [x] Test it: `/test operating system media keys and transport controls`


### 27. Gapless track transitions · in-progress · Facade

Let songs flow straight into the next one with no audible silence, for albums, live recordings, and classical movements, including manual Next and Previous and repeat modes.
**Done when:** playing a continuous album shows no audible gap between tracks, a broken next file is skipped with a short notice, and repeat one and repeat all loop without a gap.

spec [0026](../specs/0026-gapless-track-transitions/index.md)

- [x] Design it (spec): `/architect core audio playback engine: seamless gapless track transitions`
- [x] Build it: `/develop gapless track transitions`
  - [x] Staged next track, queue generation counter, and output format conversion in the engine (AC-1, AC-3, AC-10)
  - [x] Boundary events, skip notice, monitor thread rework, and store wiring for the lookahead list (AC-2, AC-4, AC-5, AC-8)
  - [x] Seek restaging, manual navigation rules, repeat modes, and encoder delay trimming (AC-6, AC-7, AC-9)
        code in `src-tauri/src/audio/engine.rs`, `src-tauri/src/audio/models.rs`, `src-tauri/src/commands/audio.rs`, `src/services/audio.ts`, `src/store/usePlayerStore.ts`, `src/store/useToastStore.ts`, `src/components/common/ToastContainer.tsx`, `src/test/gaplessPlayback.test.tsx`, `src/test/toastContainer.test.tsx`
- [x] Verify it: `/check verify gapless track transitions`
- [x] Test it: `/test gapless track transitions`


## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Synchronized lyrics online fetch**: fetch and display timed lyrics from online lyrics providers · needs a decision
- **Audio equalizer**: multi band graphic equalizer and audio DSP filters in the Rodio pipeline · needs a decision
- **Mini player overlay**: compact picture in picture floating widget for background desktop listening · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State                        | Set by                                                                             | The feature shows                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planned` · needs a decision | `/scope`                                                                           | one box: `Design it (spec): /architect <feature>`                                                                                                                                                                                             |
| `in-progress` (designed)     | `/architect` at spec capture                                                       | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled                            |
| `in-progress` (building)     | `/develop`                                                                         | milestone sub boxes tick one by one; code pointer filled                                                                                                                                                                                      |
| `in-progress` (verified)     | `/check verify`                                                                    | `Build it` + milestones ticked; `Verify it` ticked                                                                                                                                                                                            |
| `done`                       | you, when you decide it is (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier last stage (`Prototype` -> after `/develop`; `Alpha` -> after `/check verify`; `Beta`/`GA` -> after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec ## Build plan, not here**: the scope carries only the milestone rollup.
- **Status** `planned` -> `in-progress` -> `done`, plus `existing` (predating workflow) and `dropped` (dropped from scope, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature rigor above or below the project default; no tag inherits the default. It decides the feature check boxes and each skill next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
