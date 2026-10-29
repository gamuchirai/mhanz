# 0017. Desktop UI Responsiveness: Rationale

## Context

Mutinhimira is designed as a lightweight modern desktop music player built with Tauri v2, React 19, and Tailwind CSS v4. Desktop users expect fluid window management, including full screen playback on 1080p or 4K monitors, half screen snapping via Windows Snap Assist at 960px, and compact floating windows down to 640px.

During earlier UI prototyping passes, many pages and components were implemented with hardcoded inline styles. The main layout shell locked the navigation sidebar to 232px, card grids used fixed column counts like `repeat(5, 1fr)`, track tables required seven columns regardless of available width, and the player footer used rigid margins. When users resized or snapped the desktop window, elements clipped, text truncated prematurely, and cards shrank into unreadable slivers.

In addition to layout flexibility, desktop applications must maintain smooth interaction performance. Local audio libraries easily scale to thousands of tracks. In unvirtualized tables, rendering thousands of simultaneous DOM elements degrades scrolling performance and causes window resize lag. At the same time, native audio playback progress emits position updates every 100 milliseconds. Broad store subscriptions cause full page component trees to re render continuously, consuming unnecessary CPU cycles. Establishing an enforceable responsiveness standard across layout and performance is essential to deliver a premium desktop music experience.

## Options considered

### Option 1: Unified three tier responsive layout shell with Tailwind CSS v4 classes, `@tanstack/react-virtual` table virtualization, and isolated playback timer selectors

Adopt a three tier layout standard that automatically collapses the sidebar to a 68px icon rail under 1024px and adjusts the player footer to a compact deck under 900px. Replace inline layout styles with Tailwind CSS v4 responsive classes. Integrate `@tanstack/react-virtual` for all song tables, and decouple high frequency playback progress updates using fine grained Zustand store selectors.

**Pros**:

- Smooth, fluid layout adaptation across all desktop window dimensions down to 640px.
- 60 frames per second scrolling and resizing regardless of song library size.
- Minimal CPU and memory footprint during continuous audio playback.
- Standardizes clean declarative styling across all components.

**Cons**:

- Introduces one lightweight external dependency (`@tanstack/react-virtual`).

### Option 2: Fixed layout with container overflow scrollbars and unvirtualized CSS content visibility

Maintain the current fixed layout dimensions and wrap page containers in horizontal scroll areas, using CSS `content-visibility: auto` to defer off screen row rendering.

**Pros**:

- Zero new npm dependencies.
- Requires minimal changes to existing grid column definitions.

**Cons**:

- Poor desktop user experience with awkward horizontal scrollbars.
- High DOM node overhead still causes resize lag and memory spikes with large collections.
- Does not isolate audio playback timer re renders.

### Option 3: Custom React window resize hook with dynamic inline style calculations

Keep inline styles and create a custom React hook that tracks window dimensions, calculating and injecting pixel widths dynamically across components.

**Pros**:

- Avoids migrating from inline styles to Tailwind classes.

**Cons**:

- High JavaScript overhead from window resize event listeners.
- Fragile and difficult to maintain across multiple pages and nested components.
- Fails to address table DOM bloat or playback timer re render cascades.

## Rationale

Option 1 is selected because it directly solves both desktop window layout adaptation and interaction performance. Desktop music listeners frequently snap player windows side by side with browsers, code editors, or documents. A rigid layout with horizontal scrollbars feels unpolished and breaks desktop expectations.

Migrating layout containers to Tailwind CSS v4 responsive utility classes eliminates brittle inline styles and enables declarative breakpoint tokens. Integrating `@tanstack/react-virtual` guarantees that track tables remain light and snappy, rendering only the twenty to thirty rows currently visible in the viewport. Finally, isolating the 100ms audio timer updates into dedicated Zustand selectors ensures that browsing music collections, viewing artist profiles, and navigating playlists remain instantaneous during music playback.
