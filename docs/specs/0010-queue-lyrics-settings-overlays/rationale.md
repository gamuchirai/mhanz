# Rationale: 0010. Queue, lyrics, and settings overlays

## Context

Mumhanzi is a lightweight modern desktop music player inspired by Windows Groove Music and the dark Midnight visual layout. A complete listening experience requires secondary contextual surfaces that listeners can reach without navigating away from their active music exploration screens. While browsing home recommendations, albums, or playlists, listeners need immediate access to their upcoming queue, synchronised lyrics for the currently playing track, and audio preference configuration.

In preceding milestones, Mumhanzi established the project architecture, tooling standards, and clickable user interfaces for Home Discovery, Search Explore, Your Library, Liked Songs, Playlists, Albums, and Artists. The persistent PlayerFooter provides fundamental audio playback controls including play, pause, previous, next, shuffle, repeat, seeking, and volume adjustment. However, the player currently lacks an upcoming queue management interface, lyrics display, and audio output configuration.

Feature 11 in the project scope requires building the slide in now playing queue drawer, timed lyrics overlay modal, and audio preferences settings panel following the Facade build approach. The technical challenge is designing overlay surfaces that feel fluid, responsive, and lightweight on desktop windows, coordinating playback queue mutations without disrupting current tracks, keeping lyrics synchronised with playback time, and persisting user settings reliably across sessions, all while maintaining Clean Architecture before native SQLite and Rodio audio engine wiring in Phase 2.

## Options considered

### Option 1: Full page views replacing the main application view container

Render Queue, Lyrics, and Settings as top level navigation destinations alongside Home, Search, and Library, completely unmounting the active browsing view whenever a listener inspects lyrics or adjusts audio options.

**Pros**:

- Reuses existing main content container routing without creating popup drawers or modal backdrops.
- Simpler z index layout with zero overlay layering concerns.

**Cons**:

- Breaks listener navigation context by forcing them away from their current album, artist, or playlist view simply to view upcoming songs or check song words.
- Destroys scroll position and temporary state on previous browsing pages.
- Conflicts directly with scope feature 11 which explicitly requires a slide in drawer and modal overlay presentation.

### Option 2: Dedicated slide in drawer and modal overlays governed by modular stores, native pointer drag reorder, and local storage persistence

Build independent overlay components coordinating through dedicated Zustand stores. The queue slides in smoothly as a right side drawer over the main window, allowing listeners to view now playing track details, reorder upcoming tracks using zero dependency native HTML5 and pointer drag events, jump to tracks on click, and clear upcoming songs. The lyrics overlay opens as an atmospheric frosted modal displaying synchronised timestamped lines with smooth centered auto scroll, seek on click, and scroll pause detection. The settings overlay opens as a focused modal dialog allowing audio device selection, crossfade adjustment, and visualizer style selection with persistent local storage.

**Pros**:

- Preserves active browsing page state and scroll position while providing immediate access to queue, lyrics, and audio settings.
- Follows Clean Architecture by isolating overlay visibility in `useOverlayStore`, audio preferences in `useSettingsStore`, and queue operations in `usePlayerStore`.
- Implements smooth queue track reordering natively without adding heavy drag and drop packages to the bundle.
- Delivers an immersive singing along experience with responsive timestamped line tracking and click to seek.
- Validates settings persistence and audio contracts cleanly before Phase 2 Rodio integration.

**Cons**:

- Requires managing overlay backdrop clicks, keyboard Escape dismissal, and modal focus trapping.
- Requires coordinating lyrics auto scroll with manual user mouse wheel interaction.

### Option 3: Immediate native Rust Tauri commands and heavy external drag and lyrics packages

Immediately pull in external npm packages like dnd kit for drag reordering and virtualized list libraries for lyrics, while writing native Rust Tauri commands to query Windows core audio endpoints immediately.

**Pros**:

- Validates native Windows audio device enumeration immediately.
- Leverages community drag animation physics out of the box.

**Cons**:

- Violates the project Facade build methodology (UI first clickable shell on placeholder data, then wire the backend).
- Drastically increases bundle weight and component complexity for interactions that can be achieved cleanly with native web standards.
- Blocks rapid UI iteration and test coverage until Rust native audio bindings are configured and compiled.

## Rationale

Option 2 is the recommended architecture for Mumhanzi. It provides the optimal balance of user experience, bundle efficiency, and architectural cleanliness.

By implementing the queue as a right side drawer and lyrics and settings as focused modals, listeners retain their active page context while managing their music session. Separating overlay state into `useOverlayStore` prevents coupling presentation toggles to the core player playback state, while extending `usePlayerStore` with queue operations keeps playback coordination cohesive. Using native pointer drag events for queue reordering avoids heavy external dependencies, aligning with Mumhanzi philosophy of remaining lightweight and fast. Local storage persistence for user preferences guarantees that device selections and crossfade settings survive desktop restarts, establishing the exact schema that Phase 2 native Rodio audio services will consume.
