# Verify: Artists & artist profile · spec 0009 · updated 2026-10-23
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Navigate to Artists in the sidebar → Overview screen renders in Midnight theme with total artist count, search bar, sort selector, and circular artist portrait cards with verified badges and follower counts → AC-1
- [x] Type a search query (e.g. "Jazz" or "Amina") → Artists grid filters instantly; typing a nonexistent query displays the empty state card with a working "Clear search" button that restores the list → AC-2
- [x] Change sort option (Popularity, Name, Releases) and toggle direction button → Grid reorders by monthly listeners, alphabetical name, or release count in ascending or descending order → AC-3
- [x] Click any artist card (e.g. Amina V) → Artist Profile view opens with top bar back button, hero banner, verified badge, artist name, monthly listeners count, and action controls → AC-4
- [x] Click the "All Artists" back button in the Artist Profile header → Navigates back to the Artists overview grid with search query and sort preserved → AC-5
- [x] In the Artist Profile Discography section, click an album card (e.g. Timeless Vibrations) → Switches navigation directly to the Albums screen with that album active and details displayed → AC-6
- [x] Click the Play button on the artist hero banner → Queues the artist top tracks in sequence in `usePlayerStore`, begins playback immediately, and sets player track details → AC-7
- [x] In the Popular tracks table, view top 5 tracks with rank numbers, titles, stream counts formatted with commas, and durations → Click "Show More" to expand to 10 tracks, and click "Show Less" to collapse back to 5 → AC-8
- [x] In the Popular tracks table, hover over a track row to reveal the play trigger, double-click to play that specific track, and click the heart icon to toggle liked status → AC-9
- [x] Click Follow / Following button on the artist profile banner or card → Toggles follow status, increments or decrements follower count by 1, and updates button styling and label → AC-10
- [x] View an artist without an avatar image (e.g. The Obsidian Trio) → Procedural gradient avatar placeholder renders with artist initials, ambient glow, and microphone icon without broken image icons → AC-11
- [x] Search for an artist on Search screen and click their card, or click an artist link from Album Detail view → Deep links directly to Artist Profile view in Artists tab with working back button → AC-12

## Commands
- [x] `npm test` → All 76 tests in Vitest suite pass cleanly without regressions across all modules → AC-1 through AC-12
- [x] `npx tsc --noEmit` → TypeScript strictly compiles with zero type errors → AC-1 through AC-12
- [x] `npm run build` → Production bundle builds cleanly in under 1 second → AC-1 through AC-12

## Acceptance-criteria coverage
- AC-1: Artists overview grid, circular cards, header count, and search/sort controls covered by UI step 1 and `npm test`
- AC-2: Instant search filtering and empty state with clear button covered by UI step 2 and `npm test`
- AC-3: Multi-criteria sorting and direction inversion covered by UI step 3 and `npm test`
- AC-4: Profile hero banner and action controls covered by UI step 4 and `npm test`
- AC-5: Profile back button restoring overview grid state covered by UI step 5 and `npm test`
- AC-6: Discography album card cross-linking to Albums screen covered by UI step 6 and `npm test`
- AC-7: Hero play button queueing top tracks covered by UI step 7 and `npm test`
- AC-8: Popular tracks top 5 display and 10-track expansion covered by UI step 8 and `npm test`
- AC-9: Popular track row playback and like syncing covered by UI step 9 and `npm test`
- AC-10: Follow toggle and follower count increment/decrement covered by UI step 10 and `npm test`
- AC-11: Fallback procedural gradient avatar rendering covered by UI step 11 and `npm test`
- AC-12: Cross-screen deep linking from Search and Albums covered by UI step 12 and `npm test`
