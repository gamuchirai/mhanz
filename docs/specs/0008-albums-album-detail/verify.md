# Verify: albums & album detail · spec 0008 · updated 2026-10-23
_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Click Albums in sidebar navigation → Albums overview screen displays with Midnight theme styling, showing releases count, search box, sort options, and responsive album cards grid → AC-1
- [ ] Type "Highveld" in search box → Album grid updates instantly to show "Echoes of the Highveld"; non matching albums disappear → AC-2
- [ ] Type a non matching term (such as "xyz") → Empty state card displays with "Clear search" button; clicking it resets input and restores grid → AC-2
- [ ] Select sort options (Title, Artist, Release Year, Track Count) and toggle order button → Grid reorders cards in expected order ascending and descending → AC-3
- [ ] Click an album card (such as "Timeless Vibrations") → Album Detail view opens, presenting top bar with back button, large album art with ambient glow, title, clickable artist name link, year badge, genre tag, track count, total calculated duration, Play All, Shuffle, and Heart button → AC-4
- [ ] Click "All Albums" back button in detail header → Navigates back to Albums overview grid, preserving the active search query, sort settings, and view state → AC-5
- [ ] In Album Detail header, click the artist name link → Navigates to Artists screen with that artist targeted → AC-6
- [ ] Click "Play All" on album detail banner → All album tracks queue in usePlayerStore in sequential track order, playback starts immediately from track 1, and player context reflects album title → AC-7
- [ ] Click "Shuffle" on album detail banner → All album tracks queue in randomized order, playback starts immediately, and player context reflects album title → AC-7
- [ ] Open multi disc album "Echoes of the Highveld" → Separate "Disc 1" and "Disc 2" section headers appear with track numbering starting at 1 per disc → AC-8
- [ ] Open single disc album "Timeless Vibrations" → Disc headers are hidden; numbered tracklist displays directly → AC-8
- [ ] Inspect track rows → Each track row renders track number, hover play trigger, track title, explicit badge when applicable, featured artist credit when distinct from album artist, track duration in mm:ss, and like heart toggle button → AC-9
- [ ] Click heart icon in Album Detail header banner → Album favorite status toggles in useAlbumStore and visual heart fills or un-fills immediately → AC-10
- [ ] Open or view album with missing artwork ("Midnight Resonance") → Procedural vinyl placeholder renders with dark vinyl grooves and album initial without broken image glyphs → AC-11
- [ ] From Search results or Home screen, click an album card → Switches active tab to Albums and directly opens Album Detail view with working back button to grid → AC-12

## Commands
- [ ] `npx tsc --noEmit` → TypeScript checks cleanly with 0 errors
- [ ] `npm test` → Vitest test suite executes all 63 unit and component tests cleanly with 100% pass rate
- [ ] `npm run build` → Production bundle compiles cleanly without warnings

## Acceptance-criteria coverage
- AC-1 covered by sidebar navigation, grid display, search, and sort controls
- AC-2 covered by instant search filtering and empty state clear action
- AC-3 covered by sort dropdown and asc/desc toggle button
- AC-4 covered by album card click, detail banner metadata, and action row
- AC-5 covered by "All Albums" back button preserving overview query and sort
- AC-6 covered by artist name link navigating to Artists tab
- AC-7 covered by Play All and Shuffle actions queueing tracks in usePlayerStore
- AC-8 covered by multi disc grouping and single disc header omission
- AC-9 covered by track row details, explicit badge, guest artist credit, and like toggle
- AC-10 covered by album detail favorite heart toggle
- AC-11 covered by procedural vinyl placeholder fallback
- AC-12 covered by cross screen deep linking from Search and Home screens
