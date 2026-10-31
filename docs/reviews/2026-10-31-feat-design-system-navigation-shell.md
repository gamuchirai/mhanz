# Review, feat/design-system-navigation-shell, 2026-10-31

**Reviewed by**: Antigravity Reviewer (author on Antigravity)
**Scope**: 22 files, feat/design-system-navigation-shell vs main (merge base 85edd46)
**Verdict**: Approved (all findings resolved)

## Summary
This pull request introduces the Midnight design system tokens and navigation shell architecture for Mutinhimira. It implements a dedicated Zustand `useNavigationStore` with 50-record history stack traversal and duplicate route suppression, a top desktop navigation bar with Alt+Left/Right and mouse button 3/4 shortcuts, a modular `AppShell` container, and standardized Midnight UI primitives (`Button`, `IconButton`, `Card`, `Badge`, `TextInput`). The overall architecture is clean and all 191 tests pass, but there is a major state synchronization gap where route parameters stored during navigation are not synchronized to page view states during history back/forward traversal.

## Major

### 🟠 Route parameters in navigation store are decoupled from page view state during history traversal, `src/App.tsx:28`
**Problem**:
`useNavigationStore` models route parameters (`albumId`, `playlistId`, `artistId`) and updates them on `navigate()`, `goBack()`, and `goForward()`. `TopNavBar.getNavTitle` reads these route parameters to derive breadcrumb titles. However, neither `App.tsx` nor the view pages (`Playlists.tsx`, `Albums.tsx`, `Artists.tsx`) read `useRouteParams()` or synchronize their respective entity stores (`usePlaylistStore.setActivePlaylistId`, `useAlbumStore.setActiveAlbumId`, `useArtistStore.setActiveArtistId`) when history traversal occurs. Furthermore, opening album details in `AlbumCard` only invokes local store state (`setActiveAlbumId(album.id)`) without calling `navigate("Albums", { albumId: album.id })`.
**Why it matters**:
Violates Acceptance Criterion **AC-3** and the spec's critical test scenario ("Navigating from Home to Albums to an Album detail and clicking Back restores the Albums overview view and parameters"). When a user navigates between a detail view and another screen and then clicks the TopNavBar Back or Forward button, the breadcrumb in `TopNavBar` displays the playlist/album title, but the main viewport renders the overview grid or an outdated entity, causing a confusing visual desynchronization.
**Suggested fix**:
Synchronize `current.params` with the active entity stores in `App.tsx` (or subscribe in the respective view components via `useRouteParams()`), and update `AlbumCard` and `PlaylistCard` clicks to invoke `navigate(view, params)` so that entering details pushes history entries.

## Minor

### 🟡 TopNavBar resolves breadcrumb titles via store getSnapshot instead of reactive subscription, `src/components/layout/TopNavBar.tsx:27-48`
**Problem**:
`getNavTitle(entry)` queries `useAlbumStore.getState().albums`, `usePlaylistStore.getState().playlists`, and `useArtistStore.getState().artists` synchronously via `.getState()`. Because `TopNavBar` does not subscribe reactively to changes in those entity collections, if `TopNavBar` renders before asynchronous initialization (such as SQLite playlist hydration in `initializePlaylists()`) finishes, or if an entity is renamed, the breadcrumb falls back to `"Album"` or `"Playlist"` and will not update until another navigation event occurs.
**Why it matters**:
Users navigating to or deep-linking into an album or playlist during initial launch may see generic placeholder titles ("Album" or "Playlist") that do not update once data hydration completes.
**Suggested fix**:
Subscribe to entity stores reactively within `TopNavBar` (or create a dedicated selector hook for the active breadcrumb title) so that store hydration updates re-render the title.

### 🟡 Interactive navigation button container is marked as a Tauri drag region, `src/components/layout/TopNavBar.tsx:151`
**Problem**:
In `TopNavBar.tsx`, the `<div>` wrapping the back/forward `<IconButton>` controls has `data-tauri-drag-region`. In Tauri v2 desktop runtime on Windows and macOS, marking a parent container of interactive buttons with `data-tauri-drag-region` can cause window drag listeners to intercept mouse clicks or cause sluggish button activation.
**Why it matters**:
Users running the native Tauri desktop app may encounter missed or unresponsive clicks on the back and forward navigation buttons.
**Suggested fix**:
Remove `data-tauri-drag-region` from the interactive left container (`div` on line 151) and reserve it strictly for the empty center/right spacer area (`div` on line 184) and header background.

## Nits

- ⚪ `src/components/ui/Button.tsx:43`: `<Button>` does not default `type="button"`, causing it to default to `type="submit"` if rendered inside an HTML `<form>`.
- ⚪ `src/components/layout/TopNavBar.tsx:38`: Unnecessary `(playlist as unknown as { name?: string })?.name` loose type assertion when `Playlist` is already strictly typed with `title: string`.
- ⚪ `src/components/layout/AppShell.tsx:27`: Hardcoded hex color utilities `bg-[#0b0706]` and `text-[#f4ebe4]` are used instead of Tailwind `@theme` tokens `bg-midnight-bg` and `text-midnight-text`.
- ⚪ `src/App.tsx:249`: Contains `export default App;` in addition to named export `export function App()`, which departs from the "named exports only" project rule.

## Strengths

- Clean Clean Architecture layering: domain types in `src/types/navigation.ts` have zero external dependencies, while `useNavigationStore` cleanly isolates history manipulation.
- History stack boundary logic in `useNavigationStore` correctly caps at 50 records to prevent memory drift and cleanly truncates forward history on branch navigation.
- Desktop keyboard (`Alt+LeftArrow`, `Alt+RightArrow`) and mouse shortcuts (`mouseup` button index 3 and 4) properly detect active focus on inputs and contentEditable elements to prevent conflicting with typing.
- Comprehensive test coverage with 27 unit and integration tests verifying duplicate route suppression, boundary conditions, input focus guards, and design token styling.

## Test coverage

The test runner is configured (`vitest`) with 192 total passing tests across 17 test files. The new test suite in `src/test/navigation.test.tsx` provides 28 tests covering `useNavigationStore` state transitions, `TopNavBar` controls and shortcuts, UI primitive rendering across variants and sizes, and `AppShell` slot integration, including integration test coverage for active entity parameter restoration during back/forward history traversal.

## Resolution (2026-10-31)

All review findings have been resolved:
- **Major (Route parameter synchronization)**: Resolved in `src/App.tsx` by subscribing to `currentNav` and synchronizing `activeAlbumId`, `activePlaylistId`, and `activeArtistId` on view and parameter transitions, and updating `handleNavigate` to carry active entity parameters. `AlbumCard` and `AlbumDetailBanner` also trigger navigation entries. Covered by a new integration test in `src/test/navigation.test.tsx`.
- **Minor (Breadcrumb title reactivity)**: Resolved in `src/components/layout/TopNavBar.tsx` by subscribing to `useAlbumStore`, `usePlaylistStore`, and `useArtistStore` reactively and passing collections to `getNavTitle`.
- **Minor (Tauri drag region)**: Removed `data-tauri-drag-region` from the interactive navigation button container in `TopNavBar.tsx`.
- **Nits**: Added `type="button"` default in `Button.tsx`, replaced hardcoded hex values in `AppShell.tsx` with `bg-midnight-bg text-midnight-text`, removed redundant loose type cast in `TopNavBar.tsx`, and removed `export default App` in `App.tsx` (using named export only).

