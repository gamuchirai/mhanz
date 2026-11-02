# Verify: universal album and artist navigation links · spec 0024 · updated 2026-11-02
_Steps derived from spec 0024 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Click artist name in player footer -> active overlay closes and application navigates to Artist profile page -> AC-1, AC-3, AC-7
- [x] Click album title in fullscreen artwork view -> fullscreen view closes and application navigates to Album detail page -> AC-2, AC-4, AC-7
- [x] Click artist name in queue drawer -> queue drawer slides closed and application navigates to Artist profile page -> AC-1, AC-3, AC-7
- [x] Click album name in Your Library song table -> application navigates to Album detail view without starting track playback -> AC-2, AC-4, AC-6
- [x] Click artist name in Liked Songs table -> application navigates to Artist profile view without toggling heart or playing track -> AC-1, AC-3, AC-6
- [x] Click album with identical title across different artists ("Greatest Hits") -> resolves to correct artist album through disambiguation -> AC-4
- [x] Click unknown artist or album not present in local collection -> navigates to Search view with search query populated -> AC-5
- [x] Click multi artist track with collaboration ("Amina V feat. Kundai Chitepo") -> renders two separate links with preserved delimiter -> AC-8
- [x] Click band with commas or ampersands in catalog ("Earth, Wind & Fire") -> renders as a single link without accidental splitting -> AC-8
- [x] View track with "Unknown Artist", "Unknown Album", or "-" -> renders as plain inert text without pointer cursor or link role -> AC-9
- [x] Navigate to artist or album link with keyboard Tab and press Enter or Space -> navigates to target entity view -> AC-10

## Commands
- [x] `npm test src/test/navigationLinks.test.tsx` -> all 10 unit tests pass -> AC-1 through AC-10
- [x] `npm test` -> all 22 test files and 270 tests pass -> AC-1 through AC-10
- [x] `npm run build` -> TypeScript and Vite production bundle compiles cleanly with zero warnings -> AC-1 through AC-10

## Acceptance-criteria coverage
- AC-1 covered by footer, fullscreen, queue, tables, and test suite
- AC-2 covered by fullscreen, library, liked, search, and test suite
- AC-3 covered by artist link navigation and store synchronization
- AC-4 covered by album link navigation and artist name disambiguation
- AC-5 covered by search query fallback and route history synchronization
- AC-6 covered by click and double click stop propagation isolation
- AC-7 covered by unconditional overlay closure across all navigation triggers
- AC-8 covered by band name memory store check and collaboration splitting
- AC-9 covered by generic placeholder inert rendering
- AC-10 covered by keyboard activation and aria labeling
