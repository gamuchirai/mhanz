# 0011. Now playing fullscreen view: Rationale and Decision Record

## Context

Mutinhimira is designed as a desktop music player where listeners can immerse themselves in their local music collection. While the compact PlayerFooter bar provides convenient continuous controls during routine navigation across library, search, and playlists, listeners frequently want a lean back immersion mode where album art, synchronized lyrics, and dynamic visual rhythms take center stage across the entire screen.

Several forces shape this decision:

1. **Immersion versus clutter**: The standard desktop interface dedicates significant screen space to the left navigation sidebar and bottom player bar. For relaxed listening, background audio display, or party playback, users need all secondary interface elements to yield entirely to the active song visuals.

2. **Performance and battery conservation**: Dynamic visualizers and blurred backdrop filters can consume noticeable CPU and GPU power on laptops and portable computers. Rendering high frame rate graphics must be balanced with battery conservation, avoiding unconstrained 4K drawing buffers while keeping animations fluid.

3. **Multi mode flexibility**: Different listeners prioritize different visual elements during playback. Some desire large high fidelity artwork covers, others desire scrolling synchronized lyrics to sing along, and others prefer animated waveform bars moving to the rhythm. The interface must transition seamlessly between these modes without reloading or losing playback state.

4. **Desktop ergonomics**: Desktop users expect responsive keyboard control (such as Space for pause, Arrow keys for seek, and Escape for exit), clean mouse auto hide behavior during inactivity, and accessible focus management that restores focus to the player bar upon returning.

## Options considered

### Option 1: Dedicated native Tauri secondary window

Spawn a distinct native desktop window using Tauri windowing APIs, hosting a separate webview instance dedicated to full screen visuals.

**Pros**:
- Allows moving the full screen immersion view to a secondary monitor or projector while keeping the main library window open.
- Isolates rendering overhead into an independent OS window process.

**Cons**:
- Significantly increases IPC message traffic across windows to keep track progress, volume, lyrics, and transport states synchronized.
- Window management across multiple platforms (Windows, macOS, Linux) introduces window positioning and focus quirks.
- Slower launch latency compared to an in page overlay transition.

### Option 2: Route navigation state replacing root application grid

Treat full screen now playing as a standard navigation page in `activeNav`, conditionally hiding the sidebar and player bar in the root grid layout.

**Pros**:
- Reuses existing page navigation state without introducing new overlay concepts.
- Simple conceptual model where full screen is just another page component.

**Cons**:
- Unmounts or displaces the previous active page (such as a search query, playlist scroll position, or album detail view), losing user scroll context upon return.
- Alters the root CSS grid layout definitions dynamically, risking visual jumps and layout recalculation stutter.

### Option 3: Dedicated full viewport overlay layer with ambient gradient mesh, multi mode center stage, and inactivity auto hide (Chosen)

Mount a fixed top level overlay layer within `App.tsx` governed by `useOverlayStore`, smoothly covering the root grid, sidebar, and player footer without unmounting background pages.

**Pros**:
- Preserves the underlying active page and scroll position completely, enabling instant, flicker free return navigation.
- Smooth CSS opacity transitions create a cinematic immersion entrance and exit.
- Unifies artwork cover, synchronized lyrics, and canvas visualizer into a responsive multi mode center stage.
- Built in four second inactivity timer provides auto hide for controls and cursor, maximizing visual cleanliness.
- Drawing buffer clamped to 720p maintains smooth 60fps rendering while preventing excessive battery drain.

**Cons**:
- Requires coordinating keyboard event listeners to ensure full screen shortcuts take precedence over background page shortcuts while active.

## Rationale

Option 3 was chosen because it delivers the optimal combination of visual immersion, desktop responsiveness, and architectural simplicity. 

By implementing the view as an overlay managed through `useOverlayStore`, Mutinhimira avoids the heavy IPC synchronization overhead of multi window architectures (Option 1) while solving the navigation state loss and layout disruption caused by page level swapping (Option 2). The underlying page (whether browsing an artist discography or viewing a filtered library list) remains mounted in place, allowing the listener to enter full screen and return with zero loss of context.

The multi mode center stage addresses diverse listener habits: users who appreciate album cover aesthetics can enjoy an enlarged presentation with ambient glow, lyric enthusiasts can follow glowing synchronized text with instant seek capability, and visualizer fans can watch animated waveform bars. Capping the canvas visualizer buffer at 720p resolves the battery conservation force by ensuring crisp 60fps rendering without taxing laptop GPUs. Finally, auto hiding controls after four seconds of inactivity creates a true ambient display suitable for desk listening and home entertainment setups.
