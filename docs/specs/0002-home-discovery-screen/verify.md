# Verify: home and discovery screen · spec 0002 · updated 2026-10-23
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Navigating to Home displays the hero banner, curated playlist cards grid, recently played carousel, and popular tracks table using Midnight theme tokens → AC-1
- [ ] Clicking quick play on the hero showcase or any curated card replaces the current playback queue, starts playing the first track, and updates the player footer bar with title, artist, artwork, and active play state → AC-2
- [ ] Clicking the play button or double clicking any track row in the popular tracks table sets the queue to the popular tracks list, plays the selected track, and highlights the active row → AC-3
- [ ] Clicking the heart icon on any track row or hero banner toggles its liked state immediately in the store → AC-4
- [ ] Hovering over a track title or artist name that exceeds container width activates a smooth auto scrolling marquee animation → AC-5
- [ ] When recent play history or library items are empty, the view displays gentle placeholder cards with actionable buttons to scan music folders or load sample tracks → AC-6
- [ ] If any card or track image fails to load over the network, a smooth CSS gradient fallback card renders without layout shifting → AC-7
- [ ] During playback, the player footer simulates progress ticking second by second, allowing seeking, volume adjusting, and play pause toggling → AC-8

## Commands
- [ ] `npm test` → all 6 component and playback unit tests pass cleanly → AC-1, AC-2, AC-3, AC-4, AC-6, AC-8
- [ ] `npm run build` → TypeScript compiler and Vite production build pass without errors → AC-1

## Acceptance-criteria coverage
- AC-1 covered by UI manual step and Home unit tests
- AC-2 covered by UI manual step and quick play unit test
- AC-3 covered by UI manual step and popular track row unit test
- AC-4 covered by UI manual step and heart like toggle unit test
- AC-5 covered by UI manual step and MarqueeText component
- AC-6 covered by UI manual step and empty state restore unit test
- AC-7 covered by UI manual step and CSS fallback cards
- AC-8 covered by UI manual step and seeking timer unit test
