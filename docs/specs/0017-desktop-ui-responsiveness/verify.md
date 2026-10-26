# Verification Steps: Desktop UI Responsiveness

This document defines manual and automated verification steps for Spec 0017 (Desktop UI Responsiveness).

---

## Automated Verification

Run the test suite and quality gates from the repository root:

```bash
# 1. Run the dedicated responsiveness test suite
npm test src/test/responsive.test.tsx

# 2. Run the full unit and component test suite
npm test

# 3. Validate TypeScript type safety
npm run typecheck

# 4. Verify production bundle build
npm run build
```

### Expected Automated Outcomes
- `src/test/responsive.test.tsx` passes all 8 test cases validating window minimum bounds, sidebar rail collapsing, player footer compact layout, table column hiding, fluid auto-fill card grid layouts, time scrubber isolation, and transition styling.
- Full test run passes all 137 tests across 12 test suites.
- Typecheck completes with zero diagnostic errors.
- Production client bundle compiles cleanly.

---

## Manual UI Verification

Launch the desktop development environment:

```bash
npm run dev
# or for native window container testing:
npm run tauri dev
```

### 1. Minimum Window Bounds (AC-1)
1. Resize the application window horizontally and vertically toward the smallest size possible.
2. Verify the desktop window stops shrinking when reaching 640px width and 480px height.
3. Observe that no layout clipping, overflow collisions, or missing controls occur at 640px by 480px.

### 2. Navigation Sidebar Responsive Rail (AC-2)
1. Open the app on a wide desktop viewport (greater than 1024px).
2. Confirm the navigation sidebar shows full text labels ("Home", "Library", "Search", etc.) at a width of 232px.
3. Resize the window narrower than 1024px.
4. Confirm the sidebar smoothly collapses into a 68px icon rail: text labels hide, navigation icons remain centered, and hover tooltips appear when hovering over icons.
5. Verify keyboard navigation: focus rings remain visible and accessible via the Tab key in rail mode.

### 3. Player Footer Adaptive Deck (AC-3)
1. Play a track and expand the window wider than 900px.
2. Verify the player footer displays all primary and secondary controls (artwork, title, artist, like button, shuffle, previous, play/pause, next, repeat, scrubber timeline, lyrics toggle, queue toggle, volume slider).
3. Resize the window narrower than 900px.
4. Verify secondary controls (shuffle, repeat, lyrics, queue) disappear cleanly.
5. Verify the inline volume slider collapses into a compact volume button.
6. Click the volume button and confirm the floating volume popover dialog opens, allowing smooth volume adjustment before closing on blur or outside click.

### 4. Progressive Table Column Hiding (AC-4)
1. Navigate to the Library view, Liked Songs, or any Playlist with tracks.
2. At full desktop width (wider than 1150px), observe that all columns are visible: Index, Title, Artist, Album, Date Added, Duration, and Like.
3. Shrink the window width below 1150px: confirm the "Date Added" column disappears cleanly without table header misalignment.
4. Shrink the window width below 950px: confirm the "Album" column disappears cleanly.
5. At the minimum window width of 640px, confirm Index, Title, Artist, Duration, and the Like action button remain fully visible, aligned, and readable.

### 5. Fluid Grid Card Layouts (AC-5)
1. Navigate to Home, Albums, Artists, or Playlists.
2. Resize the window across diverse widths (from 640px up to full screen or ultrawide).
3. Observe that card grids adapt fluidly using auto-fill columns (`minmax(160px, 1fr)`), wrapping into more or fewer columns naturally without awkward trailing whitespace or squished cards.

### 6. Table Row Virtualization Performance (AC-6)
1. Open the Library table with 50 or more tracks.
2. Scroll rapidly up and down through the list.
3. Confirm that only visible rows plus overscan are mounted in the DOM, headers remain sticky at the top, and scrolling remains smooth at 60 FPS without frame drops or stuttering.

### 7. Playback Time Scrubber Isolation (AC-7)
1. Open React Developer Tools Profiler in the browser dev environment.
2. Start playing an audio track.
3. Record 3 to 5 seconds of playback while the 100ms time ticker runs.
4. Confirm in the profiler flamegraph that only `Scrubber` re-renders on time ticks, while `PlayerFooter`, track metadata containers, and navigation components remain unrendered during ticks.
