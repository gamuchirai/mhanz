# 0019. Design system and navigation shell: Rationale

## Context

Mutinhimira is a lightweight modern desktop music player inspired by Windows Groove Music and the Midnight visual layout. The application shell and navigation layout initially evolved through rapid prototype development and subsequent feature enhancements like desktop responsiveness and brand logo integration. As screens proliferated across Home, Search, Library, Playlists, Albums, and Artists, view switching remained controlled by a simple local state variable inside the top level App component.

This arrangement introduces three distinct architectural bottlenecks. First, desktop users expect native history navigation with back and forward controls, mouse side buttons, and keyboard shortcuts. When navigating through a deep hierarchy such as Home to Albums to a specific Album detail and onward to an Artist profile, users cannot step back to previous screens. Instead, they must manually reselect items in the sidebar, which resets context.

Second, entity parameters like active playlist IDs, album IDs, and artist IDs are scattered across separate independent stores without a unified route model. When a user switches views, past selection state is either lost or out of sync with what view is visible on screen.

Third, the Midnight design system styling relies on a mix of Tailwind classes and hardcoded hexadecimal values scattered across component files. While core colors exist in CSS variables, the codebase lacks reusable UI primitives for buttons, icon buttons, badges, inputs, and cards. Establishing an official design system foundation ensures visual consistency and accelerates future development.

## Options considered

### Option 1: Dedicated Zustand navigation store with AppShell layout and Tailwind CSS v4 design tokens

Implement a centralized in memory Zustand navigation store providing a capped history stack, route parameters, and back and forward traversal. Extract layout responsibilities from App into a modular AppShell with a top navigation bar. Formalize Midnight design tokens in Tailwind CSS v4 and export core UI primitives.

**Pros**:
- Native desktop navigation experience with back and forward history buttons and keyboard shortcuts.
- Retains route parameters so jumping backward restores open albums and playlists accurately.
- Clean architectural separation between layout containers, view routing, and screen contents.
- Low overhead with zero external routing dependencies and minimal bundle size.

**Cons**:
- Requires writing custom navigation store logic instead of using an off the shelf web router.

### Option 2: Browser client router like TanStack Router or React Router

Integrate a standard browser client router with hash or memory history to handle view navigation and route matching.

**Pros**:
- Standard routing patterns familiar to web developers.
- Built in support for nested routes, loaders, and URL synchronization.

**Cons**:
- Unnecessary conceptual overhead and bundle weight for a single window desktop music player.
- Requires artificial URL or hash path synchronization inside a native webview without browser location bar.
- Less natural integration with custom desktop window chrome and Tauri desktop events.

### Option 3: Retain status quo monolithic App component with local state

Keep view switching inside App via local state, and avoid introducing a new store or shell component.

**Pros**:
- Zero immediate refactoring effort required.

**Cons**:
- Users continue to lack back and forward navigation history.
- Navigation state remains scattered and cannot easily support deep links or breadcrumbs.
- Design token sprawl and styling duplication persist across existing and upcoming screens.

## Rationale

Option 1 is selected because it directly solves desktop user navigation expectations while honoring the lightweight, local first architecture of Mutinhimira. A native music player feels incomplete without back and forward navigation controls, especially when browsing through nested album, artist, and playlist screens.

A specialized Zustand navigation store fits the project's existing state architecture cleanly. Zustand is already used across discovery, playlist, album, and artist features. Adding a lightweight navigation store with a history stack capped at 50 entries provides predictable memory bounds and instant state updates without the bloat or synchronization quirks of full web routers.

Extracting the AppShell layout and formalizing Tailwind CSS v4 design tokens eliminates ad hoc hexadecimal values and scattered layout logic. This provides a solid foundation for both Phase 1 prototype completion and upcoming Phase 2 persistence work.

