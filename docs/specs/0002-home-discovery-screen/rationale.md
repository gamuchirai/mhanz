# 0002. Home and discovery screen: Rationale

## Context

Mumhanzi aims to provide a fast, elegant desktop music listening experience inspired by Windows Groove Music and the Midnight visual aesthetic. The initial proof of concept placed all visual components directly inside a single 800 line App.tsx file. While this established the visual look, the code lacks a structured component hierarchy, and the discovery elements need to be decoupled so other views can reuse common controls like track rows, cards, and player state.

This specification designs the migration of the existing home UI elements into clean, dedicated components with well defined props and store connections. It also elevates the visual polish: adding auto scrolling marquee text on hover, graceful gradient fallbacks for images, helpful empty state prompts, and continuous playback timer simulation in the player footer bar so the application looks and feels like a complete desktop music player.

## Options considered

### Option 1: Monolithic Home page with component local state

Keep all discovery logic, mock records, and interaction state inside a single Home component without extracting reusable parts or external stores.

**Pros**:
- Fastest to write initially with no file splitting overhead.

**Cons**:
- Creates tightly coupled code that is difficult to test, hard to maintain, and awkward to connect to the player footer.

### Option 2: Feature folder architecture with Zustand discovery store (Recommended)

Organize the screen into focused components under `src/components/home/` powered by a typed Zustand store and centralized data fixtures, matching the Facade delivery strategy.

**Pros**:
- High cohesion with clear separation between presentation and state.
- Direct alignment with the project Zustand conventions and Clean Architecture principles.
- Enables effortless transition to Rust Tauri commands and SQLite queries in Phase 2.

**Cons**:
- Requires creating several focused files and interfaces up front.

### Option 3: Context API with mock service layer

Use React Context providers wrapping the application root along with an asynchronous mock service simulating network delays.

**Pros**:
- Mimics remote web API fetching architectures closely.

**Cons**:
- Unnecessary boilerplate and re render performance overhead for a local desktop music player that reads directly from SQLite on the same machine.

## Rationale

A desktop music player requires immediate, glitch free responsiveness. Organizing Home components into modular units (`HeroBanner`, `CuratedGrid`, `RecentCarousel`, `TrackTable`) ensures each visual section can be independently rendered and tested. Zustand provides minimal boilerplate, selector based re render optimization, and simple state access from both the main content area and the persistent player footer. This cleanly fulfills our Facade build approach: the entire user journey works visually and interactively today, while the store actions provide the exact contract that later Tauri invoke calls will fulfill.
