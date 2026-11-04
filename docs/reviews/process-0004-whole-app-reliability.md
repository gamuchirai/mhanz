# Process analysis: Whole app reliability

**Date**: 2026-11-03
**Procedure**: Analyse the whole app and document things that are not working. Do not suggest new ideas, list things to fix.
**Scope feature(s)**: 4, 6, 14, 17, 25
**Spec(s)**: docs/specs/0005-your-library-folder-browser/, docs/specs/0013-core-audio-playback-engine/, docs/specs/0014-fast-local-library-search-indexing/, docs/specs/0023-audio-file-metadata-tag-editor/
**Method**: code review only (no live app URL provided). Automated checks: 299 frontend tests and 38 Rust tests passed. The build and lint checks failed. Existing open findings in the review index were not duplicated.

## Step map

1. **You build the app before using it** → TypeScript checks run before the Vite production build → The build stops on type errors. The test suite passes, but that does not make the app buildable.
   Code: `package.json:9`

2. **You open Home and press Play before selecting a local song** → The player starts with a demo track and demo queue, even in the desktop app → The playback control changes to playing, but the native engine rejects the demo file path and the error is hidden.
   Code: `src/store/usePlayerStore.ts:143`, `src/store/usePlayerStore.ts:205`

3. **You open Your Library** → The app loads monitored folders and tracks from SQLite → When the database has no folders, the store does not replace its initial demo folders and tracks, so the empty library state is not shown.
   Code: `src/pages/Library.tsx:30`, `src/store/useLibraryStore.ts:331`

4. **You add, rescan, or remove a music folder** → Folder changes use the native picker and scanner, then refresh library data → Removing the last folder leaves its old folder and tracks in the view because an empty database result is ignored.
   Code: `src/store/useLibraryStore.ts:244-267`, `src/store/useLibraryStore.ts:331`

5. **You browse your tracks or search for a track** → The library requests a page of tracks, while Search asks SQLite for matching records → The library never requests another page after the first 500 tracks. If SQLite search fails in the desktop app, Search displays demo matches instead of an error.
   Code: `src/store/useLibraryStore.ts:331`, `src/store/useSearchStore.ts:88`

6. **You use the other screens and edit track information** → App navigation opens playlists, liked songs, albums, artists, lyrics, settings, fullscreen playback, and the tag editor → Previously recorded issues on some of these screens remain in the review index and are not repeated here.
   Code: `src/App.tsx:1-9`

## Findings

### Finding F-1: Current checkout cannot build · major · bug

You cannot produce a production build from the current checkout. `npm run build` stops during TypeScript checking with five errors: `ArtistPopularTrackRow` reads a `filePath` property that its track type does not define, four imports and one event parameter are unused. The affected files have local edits, so this describes the current working tree and may be unfinished work.

**Step(s)**: 1
**Evidence**: Running `npm run build` reported `TS2339` at `src/components/artists/ArtistPopularTrackRow.tsx:390`, four `TS6133` errors for imports at `src/services/tagger.ts:18-21`, and `TS6133` at `src/store/useArtistStore.ts:460`. `git status` shows local edits in all three files.
**Recommendation**: Resolve the reported type and unused symbol errors in the edited files before treating this checkout as buildable.
**Next step**: `/debug npm run build fails with TypeScript errors in the current checkout`

### Finding F-2: Lint check fails · minor · bug

You cannot pass the project lint check. `npm run lint` reports three errors, two in `ArtistLink` and one in `HeroBanner`, so the documented pre commit lint gate cannot complete.

**Step(s)**: 1
**Evidence**: The lint run reports an unnecessary escape and a reassigned render variable at `src/components/common/ArtistLink.tsx:13,131`, plus a synchronous state update inside an effect at `src/components/home/HeroBanner.tsx:29`.
**Recommendation**: Address these three reported lint errors so the existing lint command can pass.
**Next step**: `/debug npm run lint fails in ArtistLink and HeroBanner`

### Finding F-3: Failed desktop searches show demo results · major · bug

When SQLite search fails in the desktop app, you see results from the local demo fixtures instead of a failure state. Those results may look valid but do not describe your library, and there is no visible indication that the database search failed.

**Step(s)**: 5
**Evidence**: `src/store/useSearchStore.ts:88-107` catches every search error and calls `performLocalFallbackSearch`, even when the app is running in Tauri. That fallback searches `searchTracksPool`, `mockAlbums`, and `mockArtists`.
**Recommendation**: Keep fixture fallback limited to browser preview and tests, and show the native search failure instead of presenting unrelated results.
**Next step**: `/debug native Search shows demo fixture results when SQLite search fails`

### Finding F-4: Play reports success for a demo file that cannot play · major · bug

When you first open the desktop app and press Play before choosing a scanned track, the player marks its demo track as playing even though the audio engine cannot open it. The playback request error is discarded, so the control remains in a playing state without sound.

**Step(s)**: 2
**Evidence**: `src/store/usePlayerStore.ts:143` initializes the current track and queue from demo fixtures in every runtime. `src/store/usePlayerStore.ts:198-223` sets `isPlaying` before requesting playback and ignores a rejected request. The native engine validates the path at `src-tauri/src/audio/engine.rs:133-136,201-203`.
**Recommendation**: Do not start native playback with a demo path, and keep the player state accurate when a native playback request fails.
**Next step**: `/debug pressing Play on the initial desktop player shows playing without audio`

### Finding F-5: Empty library refresh keeps old folders and tracks · major · bug

When you open a desktop library with no registered folders, the screen keeps showing the initial demo folders and songs instead of its empty state. Removing the last real folder has the same result, so the view can continue to show tracks that are no longer in the database.

**Step(s)**: 3, 4
**Evidence**: `src/store/useLibraryStore.ts:108-109` initializes the store with fixture folders and tracks. `src/store/useLibraryStore.ts:331-349` only updates state when `foldersDto.length > 0`, and `confirmRemoveFolder` calls this refresh after successful removal at `src/store/useLibraryStore.ts:244-267`.
**Recommendation**: Apply successful database refresh results even when the folder list is empty, clearing the stale fixture or removed data.
**Next step**: `/debug opening an empty library or removing its last folder leaves demo data visible`

### Finding F-6: Library never loads tracks after the first 500 · major · bug

If your library contains more than 500 tracks, the Your Library table only receives the first 500. There is no follow up request for the remaining pages, so later tracks cannot be browsed or played from that screen.

**Step(s)**: 5
**Evidence**: `src/store/useLibraryStore.ts:331` always requests page zero with a limit of 500 and only maps `tracksRes.items`. The backend returns a paginated result with a total count and applies a 500 item page limit at `src-tauri/src/db/track_repo.rs:62-67,207-212`.
**Recommendation**: Load the remaining database pages so the library view contains every indexed track.
**Next step**: `/debug Your Library only loads the first 500 SQLite tracks`

## Summary

The review found six fixable issues, all in the bug category. Five are major and one is minor. The frontend and Rust tests pass, but the current checkout fails both its production build and lint check. The first recommended fix is to resolve the build errors so you can produce and test the app.

**Quick actions** (copy and run):
- `/debug npm run build fails with TypeScript errors in the current checkout`: restore the production build.
- `/debug pressing Play on the initial desktop player shows playing without audio`: keep playback state accurate.
- `/debug opening an empty library or removing its last folder leaves demo data visible`: clear stale library content.
- `/debug Your Library only loads the first 500 SQLite tracks`: show the full library.
- `/debug native Search shows demo fixture results when SQLite search fails`: stop displaying unrelated search results.
- `/debug npm run lint fails in ArtistLink and HeroBanner`: restore the lint gate.
