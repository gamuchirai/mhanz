# Verify: Queue, lyrics, and settings overlays (spec 0010, updated 2026-10-23)
_Steps derived from spec 0010 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Inspect PlayerFooter and sidebar → PlayerFooter displays lyrics toggle button and queue toggle button on the right side next to volume slider, and sidebar bottom displays audio preferences gear button → AC-1
- [ ] Click queue button in PlayerFooter → Slide in queue drawer animates smoothly open from the right side of the screen over main view without unmounting active page → AC-2
- [ ] Inspect Now Playing card in queue drawer → Prominently renders active track artwork, title, artist, live audio visualizer animation indicator, and remaining duration → AC-3
- [ ] Inspect Upcoming queue list → Upcoming songs render with unique identifiers, drag handles, track title, artist name, duration, and remove button → AC-4
- [ ] Drag an upcoming song row in the queue drawer → Reorders upcoming queue sequence immediately using native drag events, updating playback order in `usePlayerStore` → AC-5
- [ ] Click any track row in the upcoming queue → Playback jumps directly to that song immediately, updating Now Playing card and preserving remaining queue → AC-6
- [ ] Click Clear Queue action in queue drawer → Removes all upcoming songs while preserving currently playing track, and renders empty state illustration with working Queue Recommended Songs action button → AC-7
- [ ] Click lyrics button in PlayerFooter → Opens immersive lyrics modal with atmospheric frosted backdrop, displaying song title, artist, and large typography lyrics → AC-8
- [ ] Observe playback of song with synchronised lyrics → Active lyric line highlights with glowing accent color and automatically scrolls smoothly into vertical center view as track plays → AC-9
- [ ] Click any timestamped lyric line in lyrics modal → Audio playback in `usePlayerStore` immediately seeks to that timestamp, debouncing auto scroll and resuming tracking → AC-10
- [ ] Scroll lyrics list manually using mouse wheel or trackpad → Auto scroll pauses for 3 seconds of scroll inactivity before resuming smooth centering, and songs without timed lyrics show fallback card with plain text or notice → AC-11
- [ ] Click audio settings gear button in sidebar → Opens Audio Preferences modal displaying mock audio output devices with active selection, volume normalisation toggle, crossfade duration slider (0 to 12s), visualizer picker (bars, wave, glow, off), and desktop notification toggle with local storage persistence → AC-12
- [ ] Press Escape key on keyboard or click overlay backdrop → Closes open drawer or modal overlay immediately while audio playback continues smoothly → AC-13

## Commands
- [ ] `npm test` → All 89 tests in Vitest suite pass cleanly without regressions across all modules → AC-1 through AC-13
- [ ] `npx tsc --noEmit` → TypeScript strictly compiles with zero type errors → AC-1 through AC-13
- [ ] `npm run build` → Production bundle builds cleanly in under 2 seconds → AC-1 through AC-13
- [ ] `npm run lint` → ESLint checks pass with zero errors across all codebase files → AC-1 through AC-13

## Acceptance criteria coverage
- AC-1: PlayerFooter queue and lyrics buttons plus sidebar gear button covered by UI step 1 and `npm test`
- AC-2: Slide in queue drawer animation and toggle covered by UI step 2 and `npm test`
- AC-3: Now playing card with artwork, visualizer bars, and remaining time covered by UI step 3 and `npm test`
- AC-4: Upcoming queue cards with drag handles and track remove button covered by UI step 4 and `npm test`
- AC-5: Drag reordering of upcoming queue sequence covered by UI step 5 and `npm test`
- AC-6: Jump to queue track playback covered by UI step 6 and `npm test`
- AC-7: Clear upcoming queue and empty state illustration covered by UI step 7 and `npm test`
- AC-8: Immersive lyrics modal with frosted backdrop covered by UI step 8 and `npm test`
- AC-9: Synchronised glowing active lyric line auto scroll covered by UI step 9 and `npm test`
- AC-10: Click to seek to lyric line timestamp covered by UI step 10 and `npm test`
- AC-11: Manual scroll 3 second pause and unsynced lyric fallback covered by UI step 11 and `npm test`
- AC-12: Audio preferences modal with device select, crossfade, visualizer style, and local storage covered by UI step 12 and `npm test`
- AC-13: Escape key and backdrop overlay dismissal covered by UI step 13 and `npm test`
