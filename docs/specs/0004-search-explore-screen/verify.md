# Verify: search and explore screen · spec 0004 · updated 2026-10-23

_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Navigating to Search in the sidebar opens the Search and explore view with Midnight styling, showing the search bar, category pills (All, Songs, Albums, Artists, Genres), and recent search chips → AC-1
- [ ] When the search bar is empty, the screen displays the Explore view showcasing a grid of colorful genre and mood cards with gradient styling and track counts → AC-2
- [ ] Clicking any Explore genre card populates the search input with the genre name, sets the category pill to Genres, and filters matching songs and albums → AC-3
- [ ] Typing in the search input debounces by 150 milliseconds and filters items by song title, artist, album, or genre across all categories in real time → AC-4
- [ ] In the All category view, results display in grouped sections for Top Results, Songs, Albums, Artists, and Genres → AC-5
- [ ] Clicking a category pill (Songs, Albums, Artists, or Genres) isolates the view to show only results for that category with an expanded layout → AC-6
- [ ] Clicking quick play on any song card or double clicking a song row queues the current search results and starts playback immediately in the PlayerFooter → AC-7
- [ ] Clicking the clear button or pressing the Escape key clears the search input, refocuses the search bar, and restores the initial Explore genre grid → AC-8
- [ ] When a query yields zero matches across all categories, a friendly empty state renders displaying the searched term in quotes, spelling tips, and quick jump buttons to top genres → AC-9
- [ ] Successfully entered search queries are remembered in recent search chips up to a maximum of six entries, and clicking any recent chip re applies that search term → AC-10

## Value sourcing verification

- [ ] Typing song title "Perfect" → displays Aiden Vale in filtered songs from search fixtures → AC-4
- [ ] Typing artist "Hollow Coves" → displays artist card and album Wanderlust from search fixtures → AC-4, AC-5
- [ ] Typing album "Midnight Sessions" → displays album card and associated tracks from search fixtures → AC-4, AC-5
- [ ] Typing genre "Synthwave" → matches Synthwave card and tracks with Synthwave genre tag → AC-3, AC-4
- [ ] Switching between category pills → preserves active query string across tabs → AC-6

## Commands

- [ ] `npm test` → all 15 unit and component tests pass cleanly → AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10
- [ ] `npx tsc --noEmit` → TypeScript check passes with zero errors → AC-1
- [ ] `npx eslint src/` → ESLint code standards check passes with zero warnings → AC-1
- [ ] `npm run build` → Vite production build bundles client application successfully → AC-1

## Acceptance-criteria coverage

- AC-1 covered by UI manual step, App navigation, and SearchBar tests
- AC-2 covered by UI manual step and ExploreGenresGrid component tests
- AC-3 covered by UI manual step and genre card click handler tests
- AC-4 covered by UI manual step and debounced search filtering tests
- AC-5 covered by UI manual step and CategorizedResults grouped view tests
- AC-6 covered by UI manual step and FilterPills category isolation tests
- AC-7 covered by UI manual step and player queue playback integration tests
- AC-8 covered by UI manual step and clear button / escape key tests
- AC-9 covered by UI manual step and EmptySearchState component tests
- AC-10 covered by UI manual step and recent searches store persistence tests
