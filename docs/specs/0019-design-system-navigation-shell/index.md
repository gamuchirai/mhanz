# 0019. Design system and navigation shell

**Date**: 2026-10-31
**Status**: In Progress

## Summary

This specification establishes the official design system tokens and navigation shell architecture for Mutinhimira. It introduces a dedicated Zustand navigation store with back and forward history traversal, route parameters, and desktop keyboard shortcuts. It also extracts a modular application shell layout component and formalizes reusable Midnight UI primitives styled with Tailwind CSS v4 theme variables.

## Requirements

**User stories**:

- As a listener exploring music, I want back and forward navigation buttons and shortcuts so that I can retrace my path between views, playlists, and albums.
- As a listener using a desktop app, I want keyboard shortcuts like Alt+Left and mouse back buttons to navigate seamlessly without reaching for the sidebar.
- As a developer extending views, I want standardized Midnight design tokens and reusable UI primitives so that every screen maintains consistent colors, typography, and interactive states.
- As a desktop user resizing the window, I want a robust application shell that keeps navigation, content, player controls, and modal overlays organized without visual glitches.

**Acceptance criteria**:

- **AC-1**: The application shell provides a dedicated `useNavigationStore` supporting active view selection (Home, Search, Your Library, Liked Songs, Playlists, Albums, Artists), route parameters, and a history stack capped at 50 entries.
- **AC-2**: Navigating to a new view pushes an entry to the navigation history stack, activates the corresponding content container, and clears any forward history.
- **AC-3**: Clicking the top bar back button or pressing `Alt+LeftArrow` (or mouse back button 4 via DOM mouseup with button index 3) steps back through previous navigation history entries and updates view and parameters.
- **AC-4**: Clicking the top bar forward button or pressing `Alt+RightArrow` (or mouse forward button 5 via DOM mouseup with button index 4) steps forward through navigation history entries up to the latest point.
- **AC-5**: The top navigation bar displays disabled visual states for back and forward buttons when respective history boundaries are reached.
- **AC-6**: The Midnight theme tokens (`--color-midnight-bg: #0b0706;`, `--color-midnight-surface: #110c0a;`, `--color-midnight-panel: #18110f;`, `--color-midnight-border: rgba(255, 255, 255, 0.08);`, `--color-midnight-text: #f4ebe4;`, `--color-midnight-muted: #a89b91;`, `--color-midnight-accent: #f0a982;`) are declared in Tailwind CSS v4 `@theme` and applied consistently across the shell.
- **AC-7**: Reusable UI component primitives (`Button`, `IconButton`, `Card`, `Badge`, `TextInput`) render with Midnight styling tokens and support primary, ghost, outline, and disabled states.
- **AC-8**: The modular `AppShell` component cleanly decouples navigation sidebar, top navigation control bar, scrollable main view container, persistent player footer deck, and overlay portals without layout shifts or double scrollbars across desktop window resize.

## Decision

**Chosen option**: Option 1: Dedicated Zustand navigation store with AppShell layout and Tailwind CSS v4 design tokens

Implement a centralized Zustand navigation store with history stack and route parameters, an extracted `AppShell` layout container with a top navigation bar, and standardized Midnight theme tokens with reusable UI primitives.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`)

## Feature design

**Data model sketch**:

```typescript
export type NavViewId =
  | "Home"
  | "Search"
  | "Your Library"
  | "Liked Songs"
  | "Playlists"
  | "Albums"
  | "Artists";

export interface NavRouteParams {
  playlistId?: string | null;
  albumId?: string | null;
  artistId?: string | null;
  searchQuery?: string;
  folderPath?: string;
}

export interface NavHistoryEntry {
  id: string; // crypto.randomUUID()
  view: NavViewId;
  params?: NavRouteParams;
  timestamp: number;
}

export interface NavigationState {
  current: NavHistoryEntry;
  history: NavHistoryEntry[];
  currentIndex: number;
  navigate: (view: NavViewId, params?: NavRouteParams) => void;
  goBack: () => void;
  goForward: () => void;
  replace: (view: NavViewId, params?: NavRouteParams) => void;
  reset: (view?: NavViewId) => void;
}

// Reactive selectors derived from state (avoiding stored boolean drift):
export const useActiveView = () => useNavigationStore((s) => s.current.view);
export const useRouteParams = () => useNavigationStore((s) => s.current.params);
export const useCanGoBack = () => useNavigationStore((s) => s.currentIndex > 0);
export const useCanGoForward = () => useNavigationStore((s) => s.currentIndex < s.history.length - 1);
```

**State transitions**:

```text
Initial Boot:
  entry = { id: crypto.randomUUID(), view: "Home", timestamp: Date.now() }
  history = [entry]
  current = entry
  currentIndex = 0

navigate(newView, newParams):
  if isDuplicate(current, newView, newParams) -> return
  sliced = history.slice(0, currentIndex + 1)
  entry = { id: crypto.randomUUID(), view: newView, params: newParams, timestamp: Date.now() }
  capped = [...sliced, entry].slice(-50) // maintain last 50 entries
  history = capped
  currentIndex = capped.length - 1
  current = entry

goBack():
  if currentIndex <= 0 -> return
  currentIndex = currentIndex - 1
  current = history[currentIndex]

goForward():
  if currentIndex >= history.length - 1 -> return
  currentIndex = currentIndex + 1
  current = history[currentIndex]

replace(newView, newParams):
  entry = { id: crypto.randomUUID(), view: newView, params: newParams, timestamp: Date.now() }
  history[currentIndex] = entry
  current = entry

reset(targetView = "Home"):
  entry = { id: crypto.randomUUID(), view: targetView, timestamp: Date.now() }
  history = [entry]
  current = entry
  currentIndex = 0
```

**Duplicate route suppression**:

A navigation request is suppressed if `current.view === targetView` and `shallowEqual(current.params, targetParams)`. Navigating from `Albums` with `{ albumId: "123" }` to `Albums` with no params is not suppressed, enabling transitions from detail views back to overview screens.

**Top bar title derivation**:

The `getNavTitle(entry: NavHistoryEntry)` helper resolves the title displayed in `TopNavBar`:
- If `params?.albumId` is present, resolve title via `useAlbumStore.getState().albums.find(a => a.id === params.albumId)?.title ?? "Album"`.
- If `params?.playlistId` is present, resolve title via `usePlaylistStore.getState().playlists.find(p => p.id === params.playlistId)?.name ?? "Playlist"`.
- If `params?.artistId` is present, resolve title via `useArtistStore.getState().artists.find(a => a.id === params.artistId)?.name ?? "Artist"`.
- Otherwise, use `entry.view`.

**API surface**:

| Component / Hook | Method / Signature | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `useNavigationStore` | `navigate(view, params?)` | `view: NavViewId`, `params?: NavRouteParams` | updates active view and history stack | public desktop | duplicate route suppressed |
| `useNavigationStore` | `goBack()` | void | steps backward in history stack | public desktop | no op when at beginning |
| `useNavigationStore` | `goForward()` | void | steps forward in history stack | public desktop | no op when at end |
| `useNavigationStore` | `replace(view, params?)` | `view: NavViewId`, `params?: NavRouteParams` | replaces current entry in place | public desktop | invalid view falls back to Home |
| `useNavigationStore` | `reset(view?)` | `view?: NavViewId` | resets stack to single entry | public desktop | none |
| `<TopNavBar />` | Component render | `onBack`, `onForward`, `canGoBack`, `canGoForward`, `title` | renders navigation controls, title, window drag zone | public desktop | none |
| `<AppShell />` | Container component | `sidebar: ReactNode`, `topNav: ReactNode`, `children: ReactNode`, `footer: ReactNode`, `overlays: ReactNode` | desktop layout with scroll containment | public desktop | none |
| `<Button />` | Component render | `variant: "primary" \| "ghost" \| "outline"`, `size: "sm" \| "md" \| "lg"`, `disabled?: boolean`, `onClick?: () => void`, `children: ReactNode` | styled interactive button | public desktop | none |
| `<IconButton />` | Component render | `icon: string`, `label: string`, `size?: "sm" \| "md" \| "lg"`, `disabled?: boolean`, `onClick?: () => void` | icon button with accessible tooltip and aria-label | public desktop | missing label warning |
| `<Card />` | Component render | `variant?: "panel" \| "subtle"`, `interactive?: boolean`, `onClick?: () => void`, `children: ReactNode` | styled container panel with hover state | public desktop | none |
| `<Badge />` | Component render | `variant?: "accent" \| "neutral" \| "subtle"`, `children: ReactNode` | pill badge for tag or metadata display | public desktop | none |
| `<TextInput />` | Component render | `value: string`, `onChange: (val: string) => void`, `placeholder?: string`, `icon?: string`, `autoFocus?: boolean` | styled search or text field with Midnight border | public desktop | none |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Navigation dispatch | Active view identifier | `current.view` in `useNavigationStore` |
| View parameter restoration | Entity route parameters (playlist, album, artist IDs) | `current.params` in `useNavigationStore` |
| History back step | Previous view and parameters | `history[currentIndex - 1]` in `useNavigationStore` |
| History forward step | Next view and parameters | `history[currentIndex + 1]` in `useNavigationStore` |
| Top bar button state | Back button disabled status | Derived from `currentIndex === 0` |
| Top bar button state | Forward button disabled status | Derived from `currentIndex === history.length - 1` |
| Top bar title display | Current view title or breadcrumb | `getNavTitle(current)` querying route params and store entities |
| Shell theme styling | Background, surface, border, and accent colors | CSS variables in `src/index.css` via Tailwind `@theme` |

**Key invariants**:

- Navigation history stack depth never exceeds 50 entries to guarantee bounded memory.
- Forward history entries are discarded immediately when a new navigation event occurs from an earlier history index.
- If an unrecognized view identifier is passed, navigation defaults safely to Home.
- Global keyboard and mouse shortcut listeners (Alt+Left, Alt+Right, mouse buttons 4 and 5) ignore events when active focus is inside `HTMLInputElement`, `HTMLTextAreaElement`, or any element with `isContentEditable`.
- Mouse back and forward navigation hooks listen to DOM `mouseup` and inspect `e.button === 3` (back) and `e.button === 4` (forward), calling `e.preventDefault()`.

**Layout and scroll containment**:

`AppShell` establishes a two column desktop layout (sidebar rail and main area) with a fixed player footer deck:
- Main column is a flex column: `<div className="flex flex-col h-full overflow-hidden">`.
- `TopNavBar` occupies a fixed height of 56px (`h-14`) at the top of the main column.
- View container occupies `flex-1 min-h-0 min-w-0 overflow-hidden`, passing layout containment to child pages.
- Individual child pages (`Home.tsx`, `Albums.tsx`, `Search.tsx`) retain their own `overflow-y-auto` scrollbars, preventing double scrollbar defects and ensuring proper virtual scroll measurements.

**Security model**:

Local desktop client application with zero remote network routing or authorization boundaries. All views, history records, and design tokens operate strictly client side in process.

**Configuration required**:

None. Zero new environment variables or secret keys required.

**Critical test scenarios**:

- Happy path: Navigating from Home to Albums to an Album detail and clicking Back restores the Albums overview view and parameters, verifies **AC-1**, **AC-2**, **AC-3**.
- Failure case: Calling goBack at the first history entry or goForward at the last history entry is a safe no op and leaves button states disabled, verifies **AC-4**, **AC-5**.
- Desktop shortcuts: Pressing `Alt+LeftArrow` steps backward and pressing `Alt+RightArrow` steps forward while keeping focus outside input elements, verifies **AC-3**, **AC-4**.
- Mouse navigation: Triggering mouseup with button 3 navigates back and button 4 navigates forward, calling preventDefault, verifies **AC-3**, **AC-4**.
- Token verification: Midnight surface color `#110c0a` and background `#0b0706` render consistently across components, verifies **AC-6**.
- UI primitives: Button, IconButton, Card, Badge, and TextInput render in active and disabled states with theme tokens, verifies **AC-7**.

## Build plan

1. Formalize Midnight design system tokens in `src/index.css` with Tailwind CSS v4 `@theme` variables (`--color-midnight-surface: #110c0a;` and related tokens) and utility classes, satisfies **AC-6**.
2. Create reusable UI component primitives (`Button`, `IconButton`, `Card`, `Badge`, `TextInput`) in `src/components/ui/`, satisfies **AC-7**.
3. Implement `useNavigationStore` with Zustand for view state, typed route parameters, history stack capped at 50 entries, and back/forward actions, satisfies **AC-1**, **AC-2**.
4. Build `TopNavBar` component with back and forward navigation buttons, active view title, and keyboard shortcut listeners (`Alt+LeftArrow`, `Alt+RightArrow`, mouse buttons 4 and 5), satisfies **AC-3**, **AC-4**, **AC-5**.
5. Assemble modular `AppShell` container component in `src/components/layout/AppShell.tsx` linking sidebar, top navigation bar, main view viewport, player footer deck, and modal portals with clean scroll containment, satisfies **AC-8**.
6. Refactor `App.tsx` to mount `AppShell` and consume `useNavigationStore` for view dispatch, replacing local `useState` and inline styles, satisfies **AC-1**, **AC-2**, **AC-8**.
7. Write unit and integration test suite in `src/test/navigation.test.tsx` validating history traversal, boundary capping, shortcut handling, and component rendering, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**.

## Consequences

**Positive**:

- Native desktop history experience with responsive back and forward buttons and standard keyboard shortcuts.
- Deep linking and view restoration with typed route parameters for albums, playlists, and artists.
- Clean separation of layout concerns out of monolithic `App.tsx` into an isolated `AppShell` container without double scrollbars.
- Consistent visual language across all screens with consolidated Tailwind CSS v4 tokens and reusable primitives.

**Negative / tradeoffs**:

- Additional client state store in memory, though bounded at 50 history entries.
- Views must synchronize with route parameters when opened through global actions.

**Neutral**:

- Existing screens continue to render their current content components within the new shell layout slots.

## Follow-up

- [ ] Update `docs/scope/scope.md` to link spec `0019` under Feature 3.
- [ ] Ensure future view implementations consume `src/components/ui/` primitives instead of writing ad hoc inline elements.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).