# 0005. Your library and folder browser

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user experience, and state management for the Your Library and Folder Browser screen in Mumhanzi. It establishes a dedicated feature folder under src/components/library/, a page container at src/pages/Library.tsx, and a reactive Zustand store at src/store/useLibraryStore.ts. Following the Facade build approach, this screen provides a unified view featuring a summary hero bar, a collapsible folder management panel with folder adding and rescan simulation, and an interactive songs table with sortable columns, quick search filtering, and playback integration with the player footer.

## Decision

**Chosen option**: Option 2: Unified library screen with collapsible folder panel and dedicated library store

Implement the Your Library and Folder Browser view as a unified screen featuring a summary header with folder management toggle, an expandable folder management panel, and a sortable songs table powered by a dedicated `useLibraryStore` connecting to `usePlayerStore`.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener managing my music collection, I want an overview of my total tracks and indexed folders so that I can see the scale of my music library at a glance.
- As a listener organizing my music sources, I want to add new local folders and rescan existing folders so that newly added songs appear in my player.
- As a listener exploring my local files, I want to click an indexed folder to filter the songs table so that I can focus on tracks from a specific album directory or compilation.
- As a listener browsing hundreds of songs, I want to sort columns by title, artist, album, duration, or date added, and filter quickly by text so that I can find tracks effortlessly.
- As a listener wanting music quickly, I want Play All and Shuffle buttons that immediately queue the visible songs so that I can start listening without manual queueing.

**Acceptance criteria**:

- **AC-1**: Navigating to Your Library in the sidebar renders the library screen using Midnight theme styling, displaying the library summary header with total track count, total duration, total indexed folders count, action buttons for Play All, Shuffle, and Manage Folders toggle, and the main songs table.
- **AC-2**: Clicking Manage Folders toggles the collapsible folders panel, presenting cards for each monitored music folder with folder path, display name, track count, total size formatted in megabytes or gigabytes, last scanned timestamp, and action buttons for rescan and remove.
- **AC-3**: Clicking Add Folder opens a folder selection modal presenting preset demo music folders (such as Rock Classics, Afrobeats Grooves, and Lossless FLAC Vault) and custom path input, adding the selected folder and importing simulated tracks into the library.
- **AC-4**: Clicking Rescan on any folder card triggers a simulated scan with a spinning loading indicator for one second, then displays an updated last scanned timestamp.
- **AC-5**: Clicking Remove on a folder card opens a confirmation dialog allowing the user to either remove the folder path while purging its tracks from the library view or keep existing tracks in the songs table.
- **AC-6**: Clicking an indexed folder card in the panel filters the songs table below to display only songs belonging to that folder, displaying an active filter chip with an option to return to all songs.
- **AC-7**: The songs table renders sortable headers (#, Title, Artist, Album, Duration, Date Added), and clicking any header toggles sort order between ascending and descending while updating visual sort arrow indicators.
- **AC-8**: Typing in the library search filter input filters the visible songs list in real time across song titles, artists, and album names.
- **AC-9**: Clicking Play All or Shuffle queues the currently filtered and sorted songs table into `usePlayerStore`, begins playback immediately, and updates the PlayerFooter bar.
- **AC-10**: Double clicking any song row or clicking its hover play button queues the visible songs list, plays the selected track, and highlights the active row.
- **AC-11**: When no music folders are indexed, the view renders a welcoming empty state card with guidance and a prominent button to add a music folder.

## Feature design

**Data model sketch**:

```typescript
export interface MusicFolder {
  id: string;
  folderPath: string;
  displayName: string;
  trackCount: number;
  totalSizeBytes: number;
  lastScanned: string;
  isScanning?: boolean;
}

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath: string;
  folderId: string;
  dateAdded: string;
  genre?: string;
  bitrate?: number;
  fileSizeBytes?: number;
}

export type LibrarySortColumn = "title" | "artist" | "album" | "durationSeconds" | "dateAdded";
export type SortDirection = "asc" | "desc";

export interface LibrarySortState {
  column: LibrarySortColumn;
  direction: SortDirection;
}

export interface LibraryState {
  folders: MusicFolder[];
  tracks: LibraryTrack[];
  isFolderPanelExpanded: boolean;
  selectedFolderId: string | null;
  filterQuery: string;
  sortState: LibrarySortState;
  isAddFolderModalOpen: boolean;
  folderPendingRemoval: MusicFolder | null;
  toggleFolderPanel: () => void;
  setSelectedFolder: (folderId: string | null) => void;
  setFilterQuery: (query: string) => void;
  setSortColumn: (column: LibrarySortColumn) => void;
  openAddFolderModal: () => void;
  closeAddFolderModal: () => void;
  addFolder: (folderPath: string, displayName: string, mockTracks: LibraryTrack[]) => void;
  openRemoveFolderDialog: (folder: MusicFolder) => void;
  closeRemoveFolderDialog: () => void;
  confirmRemoveFolder: (purgeTracks: boolean) => void;
  rescanFolder: (folderId: string) => void;
  toggleLikeTrack: (trackId: string) => void;
}
```

**State transitions**:

```
Folder Panel:
[Collapsed] -- toggleFolderPanel() --> [Expanded]
[Expanded]  -- toggleFolderPanel() --> [Collapsed]

Folder Rescan:
[Idle] -- rescanFolder(id) --> [Scanning (1s timer)] -- timeout --> [Idle (Updated timestamp)]

Folder Removal Dialog:
[Closed] -- openRemoveFolderDialog(folder) --> [Dialog Open]
[Dialog Open] -- cancel --> [Closed]
[Dialog Open] -- confirmRemoveFolder(purgeTracks) --> [Folder Removed, Dialog Closed]

Folder Filter:
[All Folders] -- setSelectedFolder(id) --> [Folder Filtered]
[Folder Filtered] -- setSelectedFolder(null) --> [All Folders]
```

**API surface**:

In this Facade phase, the UI calls `useLibraryStore` actions which connect to `usePlayerStore` for playback:

| Store Action | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `toggleFolderPanel` | Store action | None | Inverts `isFolderPanelExpanded` | Public | None |
| `setSelectedFolder` | Store action | `folderId: string \| null` | Updates active folder filter | Public | None |
| `setFilterQuery` | Store action | `query: string` | Updates text search filter | Public | None |
| `setSortColumn` | Store action | `column: LibrarySortColumn` | Toggles or updates sort state | Public | None |
| `addFolder` | Store action | `folderPath, displayName, tracks` | Appends folder and tracks | Public | Duplicate path |
| `confirmRemoveFolder` | Store action | `purgeTracks: boolean` | Removes folder and optional tracks | Public | Folder not found |
| `rescanFolder` | Store action | `folderId: string` | Simulates scan with loading state | Public | Folder not found |
| `toggleLikeTrack` | Store action | `trackId: string` | Toggles track liked boolean | Public | Track not found |
| `playAll` | UI helper | None | Queues visible tracks in player store | Public | Empty table |
| `shuffleAll` | UI helper | None | Shuffles and queues visible tracks | Public | Empty table |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render library header | Total track count, total duration, total folders | Derived from `tracks.length`, sum of `track.durationSeconds`, and `folders.length` |
| Render folder card | Path, display name, track count, total size, last scanned | MusicFolder properties in `useLibraryStore` |
| Render songs table row | Row number, title, artist, album, duration, date added | LibraryTrack properties formatted via helper utilities |
| Click sort header | Updated sort arrow and reordered rows | `sortState` updated in store and applied during table memoization |
| Type filter query | Filtered visible track list | Matched against title, artist, or album from `tracks` array |
| Click folder card | Isolated track list for that folder | Filter condition `track.folderId === selectedFolderId` |
| Quick play or double click | Active song and playback queue | Selected `LibraryTrack` converted to `Track` model in `usePlayerStore` |
| Empty library state | Guidance prompt and add folder trigger | Rendered when `folders.length === 0` |

**Key invariants**:

- Folder paths must be unique across all indexed folders.
- When an indexed folder is removed with purge enabled, all tracks referencing its `folderId` are removed immediately.
- When an indexed folder is removed without purge, its tracks remain in the library with `folderId` cleared or retained as orphaned items.
- Sorting by any column maintains stable secondary sorting by track title.
- Play All and Shuffle All queue only the tracks currently matching active search and folder filters.
- Total library duration is dynamically computed from active tracks.

**Security model**:

- Operates purely within local client memory and simulated fixtures in this phase.
- File system paths represent local directories and are rendered read only with no external transmission.
- No remote network requests or authentication tokens are required.

**Configuration required**:

- None required for this client side mock phase.

**Critical test scenarios**:

- Happy path: Opening Your Library displays the summary bar and songs table, clicking Manage Folders expands the folder panel, clicking Play All queues songs into PlayerFooter, verifies **AC-1**, **AC-2**, **AC-9**.
- Folder adding and import: Opening Add Folder modal and selecting a preset folder appends the new folder card and imports associated tracks into the songs table, verifies **AC-3**.
- Folder rescan simulation: Clicking Rescan shows spinning loader on the target card for one second and updates the timestamp, verifies **AC-4**.
- Folder removal with options: Clicking Remove opens dialog, confirming with purge removes the folder and its songs, verifies **AC-5**.
- Folder filtering: Clicking a folder card isolates the songs table to that folder's tracks and shows a clear filter button, verifies **AC-6**.
- Sorting and search: Clicking column headers reorders rows ascending and descending, typing in the search box filters rows in real time, verifies **AC-7**, **AC-8**.
- Row playback: Double clicking a song row starts playback of that song and highlights the active row, verifies **AC-10**.
- Zero state: Removing all folders shows the empty library welcome card with an add folder button, verifies **AC-11**.

## Build plan

Following the project Facade build approach, the implementation begins with TypeScript contracts and fixture data, builds the reactive Zustand store, constructs modular UI components, assembles the page, and verifies through unit and component tests.

- [x] 1. Create TypeScript interfaces for MusicFolder, LibraryTrack, and sort options in `src/types/library.ts`, satisfies **AC-1**, **AC-2**.
- [x] 2. Create rich mock data fixtures for initial music folders and library songs in `src/data/libraryFixtures.ts`, satisfies **AC-1**, **AC-2**, **AC-3**.
- [x] 3. Implement the Zustand library store in `src/store/useLibraryStore.ts` supporting folder expansion, folder addition, removal dialog, rescan simulation timer, sorting, and text filtering, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**.
- [x] 4. Build `LibraryHeader` with total stats counters, Play All, Shuffle, and Manage Folders toggle in `src/components/library/LibraryHeader.tsx`, satisfies **AC-1**, **AC-9**.
- [x] 5. Build `FolderManagerPanel` presenting folder cards with rescan spinner, remove trigger, and Add Folder button in `src/components/library/FolderManagerPanel.tsx`, satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**.
- [x] 6. Build `FolderSelectionModal` for choosing preset demo folders or entering custom paths in `src/components/library/FolderSelectionModal.tsx`, satisfies **AC-3**.
- [x] 7. Build `FolderRemovalDialog` allowing confirmation and track purge options in `src/components/library/FolderRemovalDialog.tsx`, satisfies **AC-5**.
- [x] 8. Build `SongTable` with sortable columns, duration formatting, search input, active folder indicator, heart toggle, and double click playback in `src/components/library/SongTable.tsx`, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-10**.
- [x] 9. Build `EmptyLibraryState` with welcoming instructions and quick add folder button in `src/components/library/EmptyLibraryState.tsx`, satisfies **AC-11**.
- [x] 10. Assemble the complete view in `src/pages/Library.tsx` and wire navigation in `src/App.tsx` so selecting Your Library displays this screen, satisfies **AC-1**, **AC-9**.
- [x] 11. Add unit and component test suite in `src/test/library.test.tsx` verifying folder management, rescan simulation, table sorting, search filtering, and playback integration, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.

## Consequences

**Positive**:

- Delivers a comprehensive, interactive local music management screen following the Midnight dark aesthetic.
- The unified layout with collapsible folder panel provides instant access to both monitored directories and the complete song catalog without jarring view switches.
- Modular component structure under `src/components/library/` keeps UI code clean, readable, and maintainable.
- Clear separation between library management in `useLibraryStore` and audio playback in `usePlayerStore` maintains single responsibility and simplifies testing.
- Prepares exact data contracts ready to link to SQLite tables and the native folder scanner in Phase 2.

**Negative / tradeoffs**:

- Adds temporary mock data fixtures and simulated scanning timers that will be replaced when Phase 2 SQLite and lofty scanning are wired.
- Preserves folder and track changes in memory only during this prototype phase.

**Neutral**:

- Requires updating `App.tsx` shell navigation to mount `Library.tsx` when activeNav is Your Library.

## Follow-up

- [ ] Connect `useLibraryStore` to Tauri native folder dialog plugin when wiring native file dialogs.
- [ ] Connect folder paths and track records to SQLite persistence in Phase 2 feature 14 (Local library scanner and metadata).
- [ ] Wire background worker thread for real audio tag scanning with lofty in Phase 2 feature 14.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
