# Scope: Mumhanzi

A lightweight modern desktop music player inspired by Windows Groove Music and the Midnight visual layout, built with Tauri, Rust, Vite, and TypeScript.

**Build approach:** Facade (UI first clickable shell on placeholder data, then wire the backend).
**Workflow:** Alpha (after /develop, /check verify on the running app). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                            | Phase      | Status      |
| --- | ---------------------------------- | ---------- | ----------- |
| 1   | Stack & architecture               | Foundation | done        |
| 2   | Coding standards & tooling         | Foundation | in-progress |
| 3   | Design system & navigation shell   | Foundation | planned     |
| 4   | Home & discovery screen            | Phase 1    | in-progress |
| 5   | Search & explore screen            | Phase 1    | in-progress |
| 6   | Your library & folder browser      | Phase 1    | in-progress |
| 7   | Liked songs screen                 | Phase 1    | in-progress |
| 8   | Playlists & playlist detail        | Phase 1    | in-progress |
| 9   | Albums & album detail              | Phase 1    | in-progress |
| 10  | Artists & artist profile           | Phase 1    | in-progress |
| 11  | Queue, lyrics & settings overlays  | Phase 1    | in-progress |
| 12  | Data model & SQLite storage        | Phase 2    | planned     |
| 13  | Core audio playback engine         | Phase 2    | planned     |
| 14  | Local library scanner & metadata   | Phase 2    | planned     |
| 15  | Playlists & favorites persistence  | Phase 2    | planned     |
| 16  | Fast local library search indexing | Phase 2    | planned     |

## Foundations

### 1. Stack & architecture · done

Decide the Tauri, Rust, Vite, and TypeScript project structure, and scaffold a runnable desktop application shell.
**Done when:** the stack is recorded in a spec, Tauri boots a desktop window running the Vite dev server, and cargo build succeeds.
spec [0001](../specs/0001-stack-architecture/index.md) · code in src/ and src-tauri/

- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`

### 2. Coding standards & tooling · in-progress

Capture conventions, then configure TypeScript checks, Rust clippy, formatting, and test commands from the scaffold.
**Done when:** root `AGENTS.md` reflects the project stack, and typecheck, lint, and formatting run clean.
spec [0003](../specs/0003-coding-standards-tooling/verify.md)

- [x] Capture conventions and tooling choices: `/audit`
- [x] Verify it: `/check verify coding standards & tooling`

### 3. Design system & navigation shell · needs a decision

Extract the Midnight styling tokens and build the application shell with sidebar navigation, view switching state, and player footer container.
**Done when:** the sidebar items switch the active view container, navigation buttons update, and the dark Midnight theme variables render consistently across all views.

- [ ] Design it (spec): `/architect design system & navigation shell`

## Phase 1: Clickable UI prototype

### 4. Home & discovery screen · in-progress

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

### 5. Search & explore screen · in-progress

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
- [ ] Verify it: `/check verify search & explore screen`

### 6. Your library & folder browser · in-progress

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
        code in `src/pages/Library.tsx`, `src/components/library/`, `src/store/useLibraryStore.ts`
- [ ] Verify it: `/check verify your library & folder browser`

### 7. Liked songs screen · in-progress

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
- [ ] Verify it: `/check verify liked songs screen`

### 8. Playlists & playlist detail · in-progress

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
- [ ] Verify it: `/check verify playlists & playlist detail`

### 9. Albums & album detail · in-progress

Build the album collection grid with cover art, release year, and detailed album view featuring header metadata, artist link, and numbered tracklist.
**Done when:** selecting Albums displays the album grid, clicking an album navigates to the album detail layout showing all tracks, durations, and release year.
spec [0008](../specs/0008-albums-album-detail/index.md)

- [x] Design it (spec): `/architect albums & album detail`
- [ ] Build it: `/develop albums & album detail`
  - [ ] Album types and mock album fixtures with multi disc entries and fallback artwork (AC-1, AC-8, AC-11)
  - [ ] Zustand album store with search, sort, active selection, favorite toggling, and playback queueing (AC-2, AC-3, AC-4, AC-5, AC-7, AC-10, AC-12)
  - [ ] Modular components AlbumHeader, AlbumGrid, AlbumCard, AlbumDetailBanner, AlbumTrackList, AlbumDiscHeader, AlbumTrackRow, AlbumVinylPlaceholder, and AlbumEmptyState (AC-1, AC-2, AC-4, AC-8, AC-9, AC-10, AC-11)
  - [ ] Page container Albums.tsx, App navigation shell wiring, and cross screen deep linking (AC-1, AC-4, AC-5, AC-6, AC-12)
  - [ ] Comprehensive unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
- [ ] Verify it: `/check verify albums & album detail`

### 10. Artists & artist profile · in-progress

Present artists in a circular portrait grid with follower counts, along with an artist profile page showing hero banner, top tracks table, and album discography.
**Done when:** selecting Artists shows artist cards, clicking an artist opens their profile with popular tracks, discography releases, and about blurb.
spec [0009](../specs/0009-artists-artist-profile/index.md)

- [x] Design it (spec): `/architect artists & artist profile`
- [ ] Build it: `/develop artists & artist profile`
  - [ ] Artist domain types, procedural avatar helpers, and rich artist fixtures (AC-1, AC-8, AC-11)
  - [ ] Zustand artist store with catalog search, sort, active selection, follow toggle, and discography filtering (AC-2, AC-3, AC-4, AC-7, AC-10, AC-12)
  - [ ] Modular components ArtistHeader, ArtistGrid, ArtistCard, ArtistProfileBanner, ArtistPopularTracks, ArtistPopularTrackRow, ArtistDiscography, ArtistBioCard, and ArtistEmptyState (AC-1, AC-2, AC-4, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11)
  - [ ] Page container Artists.tsx, App navigation shell wiring, and cross screen deep linking (AC-1, AC-4, AC-5, AC-6, AC-12)
  - [ ] Comprehensive unit and component test suite (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
- [ ] Verify it: `/check verify artists & artist profile`

### 11. Queue, lyrics & settings overlays · in-progress

Build the slide out now playing queue drawer, timed lyrics overlay modal, and audio preferences settings panel.
**Done when:** clicking queue or lyrics in the player bar toggles their respective drawers or modals, and settings allows selecting mock audio devices and visualizer styles.
spec [0010](../specs/0010-queue-lyrics-settings-overlays/index.md)

- [x] Design it (spec): `/architect queue, lyrics & settings overlays`
- [ ] Build it: `/develop queue, lyrics & settings overlays`
  - [ ] Domain types and mock fixtures for queue, lyrics, and audio devices (AC-3, AC-8, AC-11, AC-12)
  - [ ] Reactive Zustand overlay visibility and settings stores with local storage persistence (AC-1, AC-2, AC-12, AC-13)
  - [ ] Player store queue extensions for reordering, adding, removing, and clearing upcoming tracks (AC-4, AC-5, AC-6, AC-7)
  - [ ] Modular components for QueueDrawer, LyricsModal, and SettingsModal with smooth auto scroll and drag reordering (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
  - [ ] PlayerFooter triggers, App sidebar gear trigger, escape key listener, and backdrop dismissal (AC-1, AC-2, AC-8, AC-12, AC-13)
  - [ ] Comprehensive unit and component test suite (AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12, AC-13)
- [ ] Verify it: `/check verify queue, lyrics & settings overlays`

## Phase 2: Backend wiring & persistence

### 12. Data model & SQLite storage · needs a decision

Define core Rust and TypeScript entities for Track, Album, Artist, Playlist, and PlaybackState, with SQLite schema migrations and connection pool.
**Done when:** database migrations create tables with indices for fast search, and Rust models serialize to TypeScript types cleanly.

- [ ] Design it (spec): `/architect data model & SQLite storage`

### 13. Core audio playback engine · needs a decision

Connect the player bar through Tauri IPC to the Rodio audio engine on a dedicated audio thread.
**Done when:** clicking play loads local audio, sound plays through the output device, playback progress updates the UI bar in real time, and pause, resume, seek, and volume controls work.

- [ ] Design it (spec): `/architect core audio playback engine`

### 14. Local library scanner & metadata · needs a decision

Scan music folders in a background worker thread, extract audio tags and embedded artwork with lofty, and persist records into SQLite.
**Done when:** selecting a music folder recursively finds audio files, saves track tags and album art into SQLite, and populates the library view with real local music.

- [ ] Design it (spec): `/architect local library scanner & metadata`

### 15. Playlists & favorites persistence · needs a decision

Wire playlist creation, editing, track reordering, and liking songs to immediate SQLite database persistence.
**Done when:** creating or editing playlists and clicking hearts updates SQLite records, and changes persist across application restarts.

- [ ] Design it (spec): `/architect playlists & favorites persistence`

### 16. Fast local library search indexing · needs a decision

Filter the music collection by title, artist, or album using indexed SQLite queries with debounced UI input.
**Done when:** typing in the search box queries SQLite and updates visible tracks and albums with matching results in under fifty milliseconds.

- [ ] Design it (spec): `/architect fast local library search indexing`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Synchronized lyrics online fetch**: fetch and display timed lyrics from online lyrics providers · needs a decision
- **Audio equalizer**: multi band graphic equalizer and audio DSP filters in the Rodio pipeline · needs a decision
- **Operating system media keys**: integrate Windows system media transport controls and global shortcut keys · needs a decision
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
