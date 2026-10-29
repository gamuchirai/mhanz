# 0004. Search and explore screen: Rationale

## Context

Mutinhimira provides a desktop music player experience inspired by Windows Groove Music and the Midnight visual aesthetic. Finding music quickly through search and exploration is a core interaction loop for desktop listeners. The current application shell supports Home discovery and persistent player controls, but clicking Search in the navigation sidebar renders a placeholder holding message.

This specification designs the Search and explore screen to fulfill Feature 5 of Phase 1. Listeners need an instant search experience with debounced filtering across titles, artists, albums, and genres, category filter pills to narrow large result sets, and an Explore view featuring colorful genre cards when the search query is empty. The design must also connect directly to the persistent PlayerFooter for instant playback while keeping search state decoupled and maintainable.

## Options considered

### Option 1: Monolithic search page with local React state

Build the search interface entirely inside a single page component using React useState and local filtering logic without a dedicated Zustand store.

**Pros**:

- Quickest to draft initially with minimal file creation.

**Cons**:

- State does not persist across sidebar navigation tabs, causing searches to reset if the user visits Home and returns.
- Tightly couples UI rendering with filtering algorithms and recent search persistence, making unit testing difficult.

### Option 2: Feature folder architecture with dedicated search store (Recommended)

Organize the screen into modular components under `src/components/search/` driven by a dedicated `useSearchStore` that manages query text, active category, recent search chips, and debounced filtering, while coordinating playback with `usePlayerStore`.

**Pros**:

- High cohesion with clear separation between UI presentation, search logic, and audio playback.
- Search query and active category remain preserved when navigating between views.
- Aligns with Clean Architecture and existing project conventions established in Home and discovery.
- Smooth transition path to SQLite full text search indexing and Tauri IPC in Phase 2.

**Cons**:

- Requires creating dedicated component files and store interfaces up front.

### Option 3: Mock asynchronous backend service with artificial network delays

Introduce an artificial asynchronous service simulating remote web search APIs with network latency and spinner loading states.

**Pros**:

- Resembles remote streaming service architectures closely.

**Cons**:

- Unnecessary complexity and artificial sluggishness for a desktop music player that searches local memory fixtures now and local SQLite tables in Phase 2.

## Rationale

A desktop music player requires snappy, fluid responsiveness. Placing search logic in a dedicated `useSearchStore` ensures search queries and category states survive tab switches smoothly without polluting the player audio store. Breaking the view into modular components (`SearchBar`, `FilterPills`, `ExploreGenresGrid`, `CategorizedResults`, `EmptySearchState`) enables independent unit testing and clean maintainability. This directly fulfills our Facade build approach: listeners get a complete, interactive, and visually stunning search experience immediately, while the store interfaces define the exact contract that SQLite search indexing will fulfill in Phase 2.
