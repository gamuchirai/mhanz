# Process analysis: Unlinked UI and Backend Flows

**Date**: 2026-10-27
**Procedure**: The front end and backend to find what is in the ui that hasn't been linked to the backend to make it functional or at least captured in the scope document.
**Scope feature(s)**: 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17
**Spec(s)**: docs/specs/0002-home-discovery-screen/, docs/specs/0004-search-explore-screen/, docs/specs/0005-your-library-folder-browser/, docs/specs/0008-albums-album-detail/, docs/specs/0009-artists-artist-profile/, docs/specs/0010-queue-lyrics-settings-overlays/, docs/specs/0011-now-playing-fullscreen-view/, docs/specs/0012-data-model-sqlite-storage/, docs/specs/0014-fast-local-library-search-indexing/, docs/specs/0016-local-library-scanner-metadata/
**Method**: code review (no browser available)

## Step map

1. **User opens Home discovery view** → Views hero banner, curated cards, listening history carousel, popular songs, and header actions → Header buttons click with no effect, and displayed songs use static mock data.
   Code: `src/pages/Home.tsx:26`

2. **User explores Home recent plays and popular songs** → Expects recently played tracks and popular tracks from the local SQLite database → UI shows mock data fixtures from in memory player state.
   Code: `src/pages/Home.tsx:83`, `src/store/usePlayerStore.ts:140`

3. **User opens Search view and enters query** → Enters title, artist, album, or genre query → Results filter an in memory mock catalog without querying indexed SQLite tracks.
   Code: `src/pages/Search.tsx:1`, `src/store/useSearchStore.ts:22`

4. **User opens Albums view and clicks an album** → Browses albums catalog and selects album details → Screen shows initial mock albums and never queries SQLite database for scanned local albums.
   Code: `src/pages/Albums.tsx:1`, `src/store/useAlbumStore.ts:36`

5. **User opens Artists view and inspects artist profile** → Explores artist discography, popular songs, and bio → Screen shows static mock artist fixtures and does not load scanned artists from SQLite.
   Code: `src/pages/Artists.tsx:1`, `src/store/useArtistStore.ts:50`

6. **User opens Settings overlay from sidebar** → Adjusts output device, volume normalization, crossfade, and visual preferences → Settings save to browser local storage instead of SQLite, while audio device selection and DSP sliders have no backend effect.
   Code: `src/components/settings/SettingsModal.tsx:1`, `src/store/useSettingsStore.ts:82`

7. **User opens Lyrics overlay or Fullscreen lyrics during playback** → Inspects timed lyrics for the active song → Lyrics are hard coded in a mock fixture file with no local LRC or audio tag extraction.
   Code: `src/components/lyrics/LyricsModal.tsx:23`, `src/components/fullscreen/FullscreenLyricsView.tsx:28`

8. **User switches to Fullscreen visualizer view** → Watches reactive music animation → Canvas paints simulated mathematical sine curves rather than real frequency analysis from Rodio.
   Code: `src/components/fullscreen/FullscreenVisualizer.tsx:50`

9. **User opens Your Library folder manager to add a folder** → Clicks Add Music Folder to select an audio folder on disk → Modal provides only mock preset folders or a text box requiring manual path entry, fabricating simulated track entries without a native file picker.
   Code: `src/components/library/FolderSelectionModal.tsx:35`

## Findings

### Finding F-1: Native folder picker missing in library screen · critical · bug

When you want to add music from your computer, the folder modal does not open a native system folder dialog. You are presented with preset mock folders or forced to manually type a file path into a text input, which creates fake simulated tracks. The application lacks the Tauri dialog plugin, preventing you from choosing real folders through your desktop file explorer.

**Step(s)**: 9
**Evidence**: `src/components/library/FolderSelectionModal.tsx:35` creates dummy tracks (`custom-track-${Date.now()}-1`) upon submitting the form. `package.json:20` and `src-tauri/Cargo.toml` do not include `@tauri-apps/plugin-dialog` or `tauri-plugin-dialog`.
**Recommendation**: Install and register the Tauri dialog plugin, then connect the folder selection button to open the native system directory picker.
**Next step**: `/develop your library & folder browser`

### Finding F-2: Albums catalog and detail views not hydrated from SQLite · major · scope

The Albums page displays hard coded mock albums from test fixtures instead of your scanned music. Even though the Rust backend already provides `db_get_albums` and `db_get_album_details` commands, the album store never invokes them. Furthermore, liking an album only updates a local in memory list and does not persist across restarts.

**Step(s)**: 4
**Evidence**: `src/store/useAlbumStore.ts:36` initializes with `initialAlbums` and never imports `dbService`. `src-tauri/src/commands/db.rs:163` contains complete `db_get_albums` and `db_get_album_details` implementations that are unused by the front end. In `docs/scope/scope.md`, feature 9 covers only the clickable prototype.
**Recommendation**: Enroll a scope feature for albums persistence to hydrate albums and album tracks from SQLite, and record favorite album states.
**Next step**: `/scope albums and album detail persistence`

### Finding F-3: Artists catalog and profile views not hydrated from SQLite · major · scope

The Artists view presents hard coded artist profiles and mock discographies rather than artists discovered by the folder scanner. The backend has `db_get_artists` and `db_get_artist_profile` implemented, but the artist store never calls these database commands. Following an artist is also kept strictly in memory with no database persistence.

**Step(s)**: 5
**Evidence**: `src/store/useArtistStore.ts:50` initializes state from `initialArtists` in `src/data/artistFixtures.ts`. Backend commands in `src-tauri/src/commands/db.rs:188` are never called from `useArtistStore.ts`. In `docs/scope/scope.md`, feature 10 covers only the prototype screen with no database wiring feature planned in phase 2.
**Recommendation**: Enroll a scope feature to wire the artists store and profile view to SQLite, loading discovered artists, releases, and persistence for followed artists.
**Next step**: `/scope artists and artist profile persistence`

### Finding F-4: Search interface filters mock data instead of indexed library · major · scope

Typing a query in the search bar only filters static mock arrays for tracks, albums, artists, and genres. The local library tracks stored in your SQLite database are never searched. Feature 17 in the scope document specifies fast local library search indexing with a full text search design, but implementation has not started.

**Step(s)**: 3
**Evidence**: `src/store/useSearchStore.ts:22` runs `performFiltering` against `searchTracksPool` from `src/data/searchFixtures.ts`. In `docs/scope/scope.md:292`, feature 17 is marked in progress with the design done but all build milestones unchecked.
**Recommendation**: Implement the build tasks for feature 17 in scope by wiring the search store to the backend SQLite search index.
**Next step**: `/develop fast local library search indexing`

### Finding F-5: Home header action buttons are dead clicks · minor · ux

In the top header of the Home screen, the back, forward, notifications, and recommendation buttons do nothing when you click them. They have no event handlers attached and provide no user feedback or navigation history.

**Step(s)**: 1
**Evidence**: `src/pages/Home.tsx:26-72` declares button elements for back, forward, notifications, and recommendations without `onClick` properties.
**Recommendation**: Wire the back and forward buttons to browser or app navigation history, and either connect or hide the notifications and recommendation buttons until those features exist.
**Next step**: `/develop home & discovery screen`

### Finding F-6: Home recent plays and popular songs ignore database play stats · minor · scope

The Home screen features a recently played carousel and a popular tracks list, but both rely on static mock fixtures. When songs are played, the player store records history in volatile in memory state only. The SQLite database tracks table records play count and last played timestamps, but no query exists to load real listening history or popular tracks on boot.

**Step(s)**: 2
**Evidence**: `src/pages/Home.tsx:14` reads `useRecentPlays` and `usePopularTracks`, which default to `initialRecentPlays` and `popularTracksList` in `src/store/usePlayerStore.ts:140`. The SQLite schema in `src-tauri/migrations/V001__initial_schema.sql:51` maintains `play_count` and `last_played_at`, but has no dedicated history table or query endpoints for Home widgets.
**Recommendation**: Design a lightweight bridge to populate the Home screen recent plays and popular tracks from SQLite tracks sorted by last played timestamp and play count.
**Next step**: `/architect home & discovery screen: wire listening history and popular tracks to SQLite`

### Finding F-7: Settings bypass SQLite persistence and audio device controls are simulated · major · bug

The settings modal stores user preferences inside browser local storage under key `mumhanzi:settings:v1`. The SQLite database already contains a `player_settings` table with registered commands `db_get_setting` and `db_set_setting`, but the settings store ignores them. Additionally, the audio output device selector offers fake mock devices, while volume normalization and crossfade sliders do not connect to the Rodio audio engine.

**Step(s)**: 6
**Evidence**: `src/store/useSettingsStore.ts:10` persists to `window.localStorage`. Backend commands `db_get_setting` and `db_set_setting` exist in `src-tauri/src/commands/db.rs:242` but are unused. `mockAudioDevices` in `src/data/mockAudioDevices.ts` supplies dummy device names. `src-tauri/src/audio/` does not implement device selection, crossfade, or normalization.
**Recommendation**: Migrate settings persistence from local storage to the existing SQLite `player_settings` table, and clarify or hide unimplemented audio DSP controls.
**Next step**: `/develop queue, lyrics & settings overlays`

### Finding F-8: Lyrics overlay is hard coded with no local file or tag parser · major · scope

The lyrics modal and fullscreen lyrics views only display lyrics if the current track matches mock text in `mockLyrics.ts`. The local library scanner does not parse embedded USLT or SYLT tags, nor does it look for companion `.lrc` files in your music folders. In the scope document, lyrics appear only as a deferred item for online fetching, leaving local offline lyrics completely absent from scope.

**Step(s)**: 7
**Evidence**: `src/components/lyrics/LyricsModal.tsx:5` calls `getLyricsForTrack` from `mockLyrics.ts`. `src-tauri/src/scanner/metadata.rs:37` extracts title, artist, album, and duration via lofty, but ignores lyrics tags. `docs/scope/scope.md:311` lists only online lyrics fetch in deferred.
**Recommendation**: Enroll a new scope feature for local lyrics extraction, covering embedded audio tags and local `.lrc` files.
**Next step**: `/scope local file lyrics parser and metadata extraction`

### Finding F-9: Audio visualizer displays simulated animation rather than real frequency data · minor · scope

The fullscreen visualizer animates using mathematical sine wave equations whenever music is marked as playing. It does not connect to an actual audio fast Fourier transform analyzer or receive real time frequency buffers from the Rodio audio stream.

**Step(s)**: 8
**Evidence**: `src/components/fullscreen/FullscreenVisualizer.tsx:60` computes bar heights with `Math.sin(phase + i * 0.25)`. `src-tauri/src/audio/engine.rs` contains no audio spectrum analyzer or waveform sampling channel.
**Recommendation**: Consider scoping an audio spectrum analyzer stream in the audio engine if real frequency reactive visualization is desired, or keep the simulated visualizer documented as aesthetic facade.
**Next step**: `/architect now playing fullscreen view: audio frequency analyzer stream`

## Summary

This analysis examined nine user steps across the player interface and identified nine findings (one critical, four major, and four minor). Four findings point to scope omissions where screens exist as prototypes without planned backend persistence, two represent bugs where existing backend capabilities are bypassed, two are UX polish issues on header controls, and one is an architectural decision regarding audio visualization. The single top recommendation is to install the native folder dialog plugin and wire the Albums, Artists, and Search stores to their corresponding SQLite backend services so your real local music replaces mock fixtures throughout the app.

**Quick actions** (copy and run):
- `/develop your library & folder browser`: install Tauri dialog plugin and connect native system folder picker
- `/develop fast local library search indexing`: build SQLite search query indexing and wire to search store
- `/develop queue, lyrics & settings overlays`: switch settings store from local storage to SQLite and clean up simulated audio controls
- `/develop home & discovery screen`: add click handlers to header buttons or hide unlinked controls
- `/scope albums and album detail persistence`: enroll Phase 2 SQLite persistence feature for albums catalog and detail views
- `/scope artists and artist profile persistence`: enroll Phase 2 SQLite persistence feature for artists catalog and profile views
- `/scope local file lyrics parser and metadata extraction`: enroll local audio tag and companion LRC file lyrics extraction
- `/architect home & discovery screen: wire listening history and popular tracks to SQLite`: design query bridge for real play stats on Home screen
- `/architect now playing fullscreen view: audio frequency analyzer stream`: decide between real time audio FFT pipeline and lightweight simulated visualizer
