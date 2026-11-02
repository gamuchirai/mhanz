# Process analysis: UI Hydration Gaps and App Improvements

**Date**: 2026-11-02
**Procedure**: Find any aspects of the UI that still need hydration, and anything that can make the app work better or needs improvements.
**Scope feature(s)**: 11 (queue, lyrics, settings overlays), 22 (local file lyrics parser), 24 (universal album and artist navigation links)
**Spec(s)**: docs/specs/0010-queue-lyrics-settings-overlays/, docs/specs/0020-local-file-lyrics-parser-metadata-extraction/, none for feature 24
**Method**: code review (no browser available)

## Step map

1. **User opens the app for the first time or restarts it** → App.tsx boot effect runs, calling `initializePlaylists`, `initializeLikedSongs`, `initializeAlbums`, and `initializeArtists` on load → Library track data is not hydrated at this point; it waits until the user navigates to Your Library. The player footer shows a placeholder track from mock fixtures until the user interacts.
   Code: `src/App.tsx:55-70`

2. **User opens Your Library** → `Library.tsx` mounts and calls `initScanner()`, which subscribes to scanner events and calls `refreshFromDatabase()` → Folders and tracks load from SQLite and replace the initial mock data. This is the first and only moment real library data appears.
   Code: `src/pages/Library.tsx:28-38`, `src/store/useLibraryStore.ts:354-386`

3. **User opens Settings from the sidebar gear button** → `SettingsModal` opens showing audio output device, volume normalization toggle, crossfade slider, and visualizer picker → All device options come from a hardcoded `mockAudioDevices` array. The visualizer picker and crossfade slider show and save correctly to `localStorage`, but the audio engine never reads these settings at runtime.
   Code: `src/store/useSettingsStore.ts:8`, `src/data/mockAudioDevices.ts`, `src-tauri/src/audio/engine.rs`

4. **User changes the audio output device in Settings** → Dropdown selection saved to `localStorage` under `Mutinhimira:settings:v1` → The Rust audio engine continues playing through the system default output device. The `db_get_setting` and `db_set_setting` IPC commands exist in the backend and the TypeScript client has `dbGetSetting` and `dbSetSetting` helpers, but `useSettingsStore` never calls either.
   Code: `src/store/useSettingsStore.ts:117-132`, `src/services/db.ts:213-224`, `src-tauri/src/commands/db.rs`

5. **User opens the Lyrics overlay during playback** → `LyricsModal` renders and calls `getLyricsForTrack` from `mockLyrics.ts` using the current track's ID → Only the handful of tracks that match mock fixture IDs show any lyrics. Every other real local track shows the empty lyrics state. Feature 22 has a fully approved spec but none of its build milestones have been started.
   Code: `src/components/lyrics/LyricsModal.tsx:5`, `src/components/fullscreen/FullscreenLyricsView.tsx:3`, `src/data/mockLyrics.ts`

6. **User clicks the artist name text in the player footer while a song plays** → The artist name is rendered as a plain `div` with no interaction → The user is stuck on whatever page they were on. The same is true throughout: artist names in the queue drawer rows, the liked songs table, the library song table, and the search results are all non-interactive plain text. Album names across the same surfaces behave identically.
   Code: `src/components/player/PlayerFooter.tsx:105`, `src/components/queue/QueueTrackRow.tsx`, `src/components/liked/LikedSongTable.tsx`

7. **User visits the Home discovery screen and sees the "Made for you" curated grid** → The `CuratedGrid` renders mock playlist cards with hardcoded fixture data → The "See all" link above the grid calls `e.preventDefault()` and navigates nowhere. Clicking a curated card plays its embedded mock track list rather than any user library playlist.
   Code: `src/components/home/CuratedGrid.tsx:30-36`

8. **User opens the Fullscreen view and switches to the Visualizer tab** → `FullscreenVisualizer` animates bars and waves using a `Math.sin` loop → The animation is aesthetic only; it reads no frequency data from the audio engine. This was previously logged as Finding F-9 (open, minor).
   Code: `src/components/fullscreen/FullscreenVisualizer.tsx:60`

9. **User restarts the app after changing crossfade or normalization settings** → Settings reload correctly from `localStorage` into the store → The Rust audio engine boots with default hardcoded values regardless, so the user's preferences have zero effect on playback even though they appear correct in the UI.
   Code: `src/store/useSettingsStore.ts:69-86`, `src-tauri/src/audio/engine.rs`

10. **User plays a track from Search results and sees the artist name in the result card** → The artist label is displayed as a plain string, with no click handler → The user cannot navigate to the artist's profile from Search. The same is true for album name labels in search result tracks.
    Code: `src/components/search/CategorizedResults.tsx`

## Findings

### Finding F-1: Lyrics overlay and fullscreen lyrics still hardwired to mock fixture · major · bug

When you open the Lyrics overlay or switch the Fullscreen view to lyrics mode, the app calls `getLyricsForTrack` from `mockLyrics.ts` for every track. Your real local audio files, whether they carry embedded lyrics tags or a companion `.lrc` file in the same folder, are never read. Only the three or four mock tracks embedded in the fixture file show any text; every other real track shows the empty state. Feature 22 has a full approved spec and a migration design, but none of its build milestones have been ticked.

**Step(s)**: 5
**Evidence**: `src/components/lyrics/LyricsModal.tsx:5` imports `getLyricsForTrack` from `../../data/mockLyrics`. `src/components/fullscreen/FullscreenLyricsView.tsx:3` makes the same import. The spec at `docs/specs/0020-local-file-lyrics-parser-metadata-extraction/index.md` lists five unchecked build milestones. `docs/scope/scope.md:386` shows feature 22 status as `in-progress` but no build tasks are ticked.
**Recommendation**: Build feature 22 in full: the Rust LRC parser, SQLite migration, Tauri IPC commands, `useLyricsStore`, and the wiring of both lyrics overlay components to the new store, removing the mock import.
**Next step**: `/develop local file lyrics parser and metadata extraction`

### Finding F-2: Settings store never reads or writes SQLite, so preferences have no backend effect · major · bug

The Settings modal writes every preference to `localStorage`. The Rust backend has a `player_settings` table and the TypeScript service already exposes `dbGetSetting` and `dbSetSetting` helpers that are never called. More critically, the audio engine starts up with hardcoded values regardless of what is in `localStorage`, so crossfade and volume normalization settings survive restarts only as UI decoration. The audio device selector lists six hardcoded fake device names; the actual OS audio output device is never changed.

**Step(s)**: 3, 4, 9
**Evidence**: `src/store/useSettingsStore.ts:8` imports only from `../data/mockAudioDevices`. The `SETTINGS_STORAGE_KEY = "Mutinhimira:settings:v1"` is `localStorage` only. `src/services/db.ts:213-224` exposes `dbGetSetting`/`dbSetSetting` but neither is imported in the settings store. No `db_get_setting` call exists in any frontend module besides the db service itself. `src-tauri/src/audio/engine.rs` has no crossfade or normalization initialization that reads stored settings.
**Recommendation**: Migrate settings persistence from `localStorage` to `dbGetSetting`/`dbSetSetting` on boot and on change. Hide or label the audio device selector as "coming soon" until a real OS device enumeration command is added to the Rust backend.
**Next step**: `/develop queue, lyrics & settings overlays`

### Finding F-3: Library tracks are not hydrated until the user navigates to Your Library · major · bug

On app boot, `App.tsx` initializes playlists, liked songs, albums, and artists from SQLite, but it does not call `initScanner`. The library track list stays filled with mock fixture data until the user visits the Your Library page, which triggers `initScanner` and `refreshFromDatabase`. This means other surfaces that depend on library track data (the search pool, the Add Songs drawer in playlists, the player queue when playing from library context) may present stale or mock data if the user never opens the Library page.

**Step(s)**: 1, 2
**Evidence**: `src/App.tsx:55-70` calls four store initializers but not `useLibraryStore.getState().initScanner()`. `src/pages/Library.tsx:28-38` is the only place `initScanner` is called. `src/store/useLibraryStore.ts:113` initializes with `initialMusicFolders` and `initialLibraryTracks` from fixtures. `src/store/useLibraryStore.ts:354` shows `initScanner` calls `refreshFromDatabase()` only when run.
**Recommendation**: Call `useLibraryStore.getState().initScanner()` in the App boot effect alongside the other store initializers, storing the cleanup unsubscribe function and calling it on unmount.
**Next step**: `/develop your library & folder browser`

### Finding F-4: Artist and album names across all track tables are plain text with no navigation · major · scope

Every track row throughout the app (player footer, queue drawer, liked songs table, library song table, search results, home popular tracks table) shows artist and album names as non-interactive text. There is no way to click an artist name and reach their profile page, or click an album name and open its detail view. Feature 24 in scope captures this exactly but is currently listed as "needs a decision" with only a design task open.

**Step(s)**: 6, 10
**Evidence**: `src/components/player/PlayerFooter.tsx:105` renders `{currentTrack?.artist ?? "Mutinhimira"}` as a plain `div`. `src/components/queue/QueueTrackRow.tsx` renders artist and album as plain strings with no click handler. `src/components/liked/LikedSongTable.tsx` renders track rows with artist and album as display-only text. `src/components/library/SongTable.tsx` is similar. Feature 24 in `docs/scope/scope.md:412` has only one open task: `/architect universal album and artist navigation links`.
**Recommendation**: Run the architect step for feature 24 to decide the interaction model (how to navigate without triggering row playback, how to close open overlays), then build universal clickable artist and album name links across all these surfaces.
**Next step**: `/architect universal album and artist navigation links`

### Finding F-5: "See all" link on Home curated grid is a dead click · minor · ux

The curated grid section header on the Home screen includes a "See all" anchor tag. That anchor calls `e.preventDefault()` and has no navigation logic behind it. You cannot reach a full curated collections view or any related screen by clicking it.

**Step(s)**: 7
**Evidence**: `src/components/home/CuratedGrid.tsx:30-36` renders `<a href="#" onClick={(e) => e.preventDefault()}>See all</a>` with no other handler. No route or navigation target exists for a curated collections overview view.
**Recommendation**: Either remove the "See all" link until a curated collections screen is in scope, or route it to the Playlists view as the closest equivalent. Leaving a dead interactive element confuses users.
**Next step**: `/develop home & discovery screen`

### Finding F-6: Home curated grid shows hardcoded mock playlists unrelated to user library · minor · scope

The "Made for you" curated grid in the Home view displays four or five preset mock playlists from `homeFixtures.ts`. These are never replaced by the user's actual playlists, albums, or listening behavior, even after library scanning completes. A user with one hundred local albums still sees the same mock cards every time.

**Step(s)**: 7
**Evidence**: `src/store/usePlayerStore.ts:15` imports `curatedPlaylists` from `../data/homeFixtures`. `src/pages/Home.tsx:9` reads `useCuratedCollections()` which returns this fixture array. No scan completion hook or SQLite query populates `curatedCollections` with real data. The home spec (`docs/specs/0002-home-discovery-screen/index.md`) does not define real-data curation logic.
**Recommendation**: Design a lightweight curation algorithm: the most played album, the most recently added folder, and the first available playlist from the user's library can fill these cards automatically from existing SQLite queries. Consider adding this to the home listening history and popular tracks persistence feature or enrolling a new scope item.
**Next step**: `/architect home & discovery screen: dynamic curated grid from real library data`

### Finding F-7: Audio visualizer shows simulated sine waves rather than real frequency data · minor · scope

The fullscreen visualizer draws animated bars using a `Math.sin` loop on every animation frame. No audio frequency analysis is performed. This was tracked previously as Finding F-9 from report process-0001 and is still open.

**Step(s)**: 8
**Evidence**: `src/components/fullscreen/FullscreenVisualizer.tsx:60` computes bar heights with `Math.sin(phase + i * 0.25)`. The audio engine at `src-tauri/src/audio/engine.rs` has no spectrum analyzer or waveform channel. Finding F-9 in `docs/reviews/README.md` remains `action-required`.
**Recommendation**: Decide whether a real FFT analyzer from the Rodio pipeline is in scope. If yes, enroll and architect it. If no, document the simulated visualizer as deliberate and close F-9.
**Next step**: `/architect now playing fullscreen view: audio frequency analyzer stream`

## Summary

This analysis examined ten steps through the current app and identified seven findings: two are bugs where existing SQLite backend capabilities are bypassed by the frontend (settings persistence and library hydration timing), one is a bug where mock data is still the only source for the lyrics overlay, one is a scope gap where clickable navigation links are absent across all track surfaces, and three are minor UX polish items (dead "See all" link, mock curated grid cards, and the simulated visualizer). The single change that would make the biggest immediate difference is building feature 22, the local file lyrics parser, because it is the last major screen that shows mock data exclusively and has a fully approved spec ready to build from.

**Quick actions** (copy and run):
- `/develop local file lyrics parser and metadata extraction`: build the Rust LRC parser, SQLite cache, and useLyricsStore to replace mock lyrics in both overlay and fullscreen
- `/develop queue, lyrics & settings overlays`: migrate settings persistence from localStorage to SQLite and hide or fix unimplemented audio device and DSP controls
- `/develop your library & folder browser`: move initScanner into the App boot effect so library tracks hydrate on startup not on page visit
- `/architect universal album and artist navigation links`: decide the click model for navigable artist and album names then build feature 24
- `/develop home & discovery screen`: remove or wire the dead "See all" link in CuratedGrid
- `/architect home & discovery screen: dynamic curated grid from real library data`: design a lightweight algorithm to fill curated cards from real SQLite data
- `/architect now playing fullscreen view: audio frequency analyzer stream`: decide if real FFT visualization is in scope or close the deferred finding
