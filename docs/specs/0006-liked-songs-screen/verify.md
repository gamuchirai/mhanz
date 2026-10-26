# Verify: Liked songs screen · spec 0006 · updated 2026-10-23
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Click "Liked Songs" in the sidebar → Liked Songs screen mounts displaying illuminated heart hero banner, total stats, filter bar, and songs table → AC-1
- [ ] Check the hero banner track stats → displays total count (8 songs) and formatted duration (28 mins) → AC-2
- [ ] Click "Play All" button in the hero banner → starts playback of first track (Perfect), populates queue in player footer bar, and begins progress timer → AC-3
- [ ] Click "Shuffle" button in the hero banner → shuffles visible songs, enables player shuffle mode, and begins playback → AC-4
- [ ] Enter "Rema" into the filter search box → table immediately displays "Calm Down" and filters out non matching songs → AC-5
- [ ] Enter non existent query "xyz123" into filter box → table shows inline notice "No liked songs matching..." with Clear search button while hero banner stays visible → AC-6
- [ ] Click "Clear search" button → restores all 8 songs into the table view → AC-6
- [ ] Click "Title" column header → sorts songs ascending alphabetically; click again → sorts descending → AC-7
- [ ] Click "Date Liked" column header → toggles sort order by favorited timestamp → AC-7
- [ ] Click heart icon on "Perfect" row → heart changes to outline icon, row remains visible with muted opacity, hero banner count updates to 7 songs, and player state updates → AC-8
- [ ] Re click the outline heart icon on "Perfect" → heart restores to filled accent color and hero banner count returns to 8 songs → AC-9
- [ ] Double click any song row or click its hover play button → queues current table list and starts immediate playback of selected song → AC-10
- [ ] Unlike all songs and navigate away to "Home" then back to "Liked Songs" → screen renders glowing heart empty state with "Explore Music" button → AC-11, AC-12
- [ ] Click "Explore Music" button in empty state → navigates to Search and explore screen → AC-11

## Commands
- [ ] `npm test` → all tests in `src/test/liked.test.tsx` and full suite pass cleanly → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- [ ] `npm run build` → TypeScript compiler and Vite production bundle succeed without errors → AC-1

## Acceptance-criteria coverage
- AC-1 covered by UI step 1 and Commands step 1
- AC-2 covered by UI step 2 and Commands step 1
- AC-3 covered by UI step 3 and Commands step 1
- AC-4 covered by UI step 4 and Commands step 1
- AC-5 covered by UI step 5 and Commands step 1
- AC-6 covered by UI steps 6, 7 and Commands step 1
- AC-7 covered by UI steps 8, 9 and Commands step 1
- AC-8 covered by UI step 10 and Commands step 1
- AC-9 covered by UI step 11 and Commands step 1
- AC-10 covered by UI step 12 and Commands step 1
- AC-11 covered by UI steps 13, 14 and Commands step 1
- AC-12 covered by UI step 13 and Commands step 1
