# Verify: Now playing fullscreen view (spec 0011, updated 2026-10-23)
_Steps derived from spec 0011 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Inspect PlayerFooter triggers -> PlayerFooter renders interactive click targets on the album artwork thumbnail, song title text, and expand icon button with clear tooltips -> AC-1
- [ ] Click any PlayerFooter trigger with an active track loaded -> Opens fullscreen view as a fixed full viewport overlay smoothly covering sidebar and player bar without page reload -> AC-2
- [ ] Attempt opening fullscreen view when no track is playing -> Opening is blocked; when queue completes with repeat off, an empty immersion slate renders with a Return button -> AC-3
- [ ] Inspect top utility bar in fullscreen view -> Renders return button with tooltip, title and artist breadcrumb, and a three segment view switch for Artwork, Lyrics, and Visualizer modes -> AC-4
- [ ] Observe view backdrop atmosphere -> Renders ambient gradient mesh derived from current track ambient colors over deep obsidian background with graceful fallback -> AC-5
- [ ] Switch to Artwork mode -> Center stage presents enlarged album artwork with rounded corners, glowing drop shadow, track metadata, and synchronised like heart button -> AC-6
- [ ] Switch to Lyrics mode -> Center stage presents scrolling timestamped lyrics with glowing active line, and clicking any line immediately seeks audio playback to that timestamp -> AC-7
- [ ] Switch to Visualizer mode -> HTML5 Canvas 2D element renders animated 60fps waveforms matching active visualizer style, with buffer clamped to 720p resolution -> AC-8
- [ ] Inspect bottom playback deck -> Displays full width interactive timeline scrub bar with tabular timestamps, supporting mouse dragging, clicking, and Arrow key seeking -> AC-9
- [ ] Test playback transport controls in bottom deck -> Large Play Pause toggle, Previous, Next, Shuffle, Repeat mode cycle, and Volume slider with mute button function smoothly -> AC-10
- [ ] Leave mouse stationary for four seconds -> Top bar, bottom deck, and cursor fade out smoothly, and reappear immediately upon mouse movement or keypress -> AC-11
- [ ] Test keyboard shortcuts while fullscreen is active -> Space toggles play pause, Left Arrow seeks back 5s, Right Arrow seeks forward 5s, L toggles lyrics, V toggles visualizer, M toggles mute -> AC-12
- [ ] Press Escape key or click return button -> Dismisses fullscreen view smoothly, restoring previous page view and focusing the originating trigger element -> AC-13
- [ ] Change default view mode in fullscreen view and reload application -> UserSettings in local storage restores the preferred view mode on subsequent fullscreen openings -> AC-14
- [ ] Test screen reader accessibility -> Dialog presents role="dialog" with aria-modal="true", traps focus within overlay, and announces track changes accurately -> AC-15

## Commands
- [ ] `npm test` -> Vitest suite passes cleanly with zero regressions across all modules -> AC-1 through AC-15
- [ ] `npx tsc --noEmit` -> TypeScript strictly compiles with zero type errors -> AC-1 through AC-15
- [ ] `npm run build` -> Production bundle compiles cleanly -> AC-1 through AC-15
- [ ] `npm run lint` -> ESLint checks pass with zero errors across all codebase files -> AC-1 through AC-15

## Acceptance criteria coverage
- AC-1: PlayerFooter entry click targets covered by UI step 1 and `npm test`
- AC-2: Fixed full viewport overlay opening covered by UI step 2 and `npm test`
- AC-3: Null track prevention and empty slate covered by UI step 3 and `npm test`
- AC-4: Top utility bar with return button and view switch covered by UI step 4 and `npm test`
- AC-5: Ambient gradient mesh backdrop covered by UI step 5 and `npm test`
- AC-6: Artwork center stage with metadata and like button covered by UI step 6 and `npm test`
- AC-7: Synchronized lyrics stream with click to seek covered by UI step 7 and `npm test`
- AC-8: 60fps canvas visualizer capped at 720p covered by UI step 8 and `npm test`
- AC-9: Full width interactive timeline scrubber covered by UI step 9 and `npm test`
- AC-10: Primary transport controls in bottom deck covered by UI step 10 and `npm test`
- AC-11: Four second inactivity chrome and cursor auto hide covered by UI step 11 and `npm test`
- AC-12: Scoped keyboard shortcuts covered by UI step 12 and `npm test`
- AC-13: Return button and Escape key dismissal with focus restoration covered by UI step 13 and `npm test`
- AC-14: Persistent user settings for fullscreen default view covered by UI step 14 and `npm test`
- AC-15: Accessibility role dialog and focus trap covered by UI step 15 and `npm test`
