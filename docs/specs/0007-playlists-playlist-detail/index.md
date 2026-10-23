# 0007. Playlists and playlist detail

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user experience, and state management for the Playlists and Playlist Detail screens in Mumhanzi. It establishes a dedicated feature folder under src/components/playlists/, a page container at src/pages/Playlists.tsx, and a reactive store at src/store/usePlaylistStore.ts. Following the Facade build approach, this feature provides a collection grid of curated and user created playlists, a floating modal for playlist creation and customization with Midnight color gradients, a dedicated playlist detail view with glowing cover art and duration metrics, an interactive track curation drawer to add library songs with one click, and direct playback integration with the player footer.

## Decision

**Chosen option**: Option 2: Dedicated playlist store and modular views with normalized track entries and curation drawer

Implement the Playlists and Playlist Detail views as an independent feature powered by a dedicated `usePlaylistStore` coordinating with `usePlayerStore` and `useLibraryStore`. The overview grid presents playlist cards with glowing gradient swatches and hover play triggers, while the detail view provides a dedicated destination layout featuring full metadata editing, track reordering, track removal, an inline add songs drawer, and reactive synchronization with the sidebar playlist list.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener organizing my music collection, I want a dedicated Playlists screen showing all my custom and curated playlists in a visual grid so that I can browse and play my mixes effortlessly.
- As a listener curating music for different moods, I want to create new playlists with custom titles, descriptions, and Midnight gradient artwork presets so that my playlists feel personal and expressive.
- As a listener opening a playlist, I want a dedicated detail view with high impact cover art, total track count, total duration, Play All, and Shuffle actions so that I can listen immediately.
- As a listener managing playlist tracks, I want to add songs from my library via an inline search drawer, reorder tracks up and down, and remove tracks cleanly without deleting them from my library.
- As a listener updating my collection, I want to edit playlist details or delete unwanted playlists with clear confirmation prompts so that my sidebar and library stay orderly.

**Acceptance criteria**:

- **AC-1**: Navigating to Playlists in the sidebar renders the Playlists overview screen using Midnight theme styling, displaying a top summary header with playlist count, search filter input, a New playlist button, and a visual grid of playlist cards showing gradient covers, track counts, titles, creator badges, and hover play triggers.
- **AC-2**: Clicking New playlist in the header or the plus icon in the sidebar opens a creation modal with inputs for playlist title, optional description, six Midnight visual gradient swatches, and an optional image URL field.
- **AC-3**: Submitting the creation modal with a non empty title creates a new Playlist in `usePlaylistStore`, updates the sidebar playlist list reactively, and navigates immediately into the detail view for the newly created playlist.
- **AC-4**: Clicking any playlist card in the overview grid or clicking a playlist under YOUR PLAYLISTS in the sidebar opens the Playlist Detail view, rendering a top bar with a back button, a glowing hero banner with cover art, title, description, track count, total calculated duration, and actions for Play All, Shuffle, Edit Details, and Delete Playlist.
- **AC-5**: Clicking the back button in the Playlist Detail header navigates back to the Playlists overview grid, preserving the playlist list and scroll position.
- **AC-6**: Clicking Play All or Shuffle on a playlist with tracks queues all songs into `usePlayerStore`, starts playback immediately, and sets the player context title to the playlist name.
- **AC-7**: When a playlist has zero tracks, the Play All and Shuffle buttons are visually disabled with a tooltip indicating tracks must be added first, and the track area renders an inviting empty state card with helper text and an Add Songs button.
- **AC-8**: Clicking Add Songs opens a slide in curation drawer displaying searchable tracks from `useLibraryStore` and fixtures, with one click add buttons that append selected songs to the active playlist.
- **AC-9**: The playlist detail songs table renders sortable columns for Number, Title, Artist, Album, Duration, and Date Added, with inline like toggles, manual position reordering controls, and a remove from playlist action button.
- **AC-10**: Removing a track from a playlist removes that specific playlist entry, updates the playlist track count and total duration dynamically, and leaves the original song intact in the library.
- **AC-11**: Clicking Edit Details opens an edit modal allowing changes to the title, description, and cover gradient or artwork URL, updating both the detail banner and sidebar instantly.
- **AC-12**: Clicking Delete Playlist opens a destructive action modal with confirmation prompt; confirming permanently removes the playlist from `usePlaylistStore` and the sidebar, and navigates the user back to the Playlists overview grid.

## Feature design

**Data model sketch**:

```typescript
export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverGradient: string;
  coverUrl?: string;
  isCurated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrackEntry {
  entryId: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
}

export interface HydratedPlaylistTrack {
  entry: PlaylistTrackEntry;
  track: Track;
}

export interface PlaylistCreateInput {
  title: string;
  description?: string;
  coverGradient?: string;
  coverUrl?: string;
}

export interface PlaylistUpdateInput {
  title?: string;
  description?: string;
  coverGradient?: string;
  coverUrl?: string;
}

export interface PlaylistState {
  playlists: Playlist[];
  playlistTracks: Record<string, PlaylistTrackEntry[]>;
  activePlaylistId: string | null;
  overviewSearchQuery: string;
  detailSearchQuery: string;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isAddSongsDrawerOpen: boolean;
  isDeleteDialogOpen: boolean;

  createPlaylist: (input: PlaylistCreateInput) => string;
  updatePlaylist: (id: string, input: PlaylistUpdateInput) => void;
  deletePlaylist: (id: string) => void;
  setActivePlaylistId: (id: string | null) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, entryId: string) => void;
  reorderTrack: (playlistId: string, sourceIndex: number, destinationIndex: number) => void;
  setOverviewSearchQuery: (query: string) => void;
  setDetailSearchQuery: (query: string) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean) => void;
  setAddSongsDrawerOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  playPlaylist: (playlistId: string, startIndex?: number) => void;
  shufflePlaylist: (playlistId: string) => void;
}
```

**State transitions**:

```
Playlist Creation & Navigation:
[Playlists Grid] -- click New Playlist / plus icon --> [Creation Modal]
[Creation Modal] -- submit valid title --> [Playlist Created] --> [Open Playlist Detail]
[Playlist Detail] -- click Back Button --> [Playlists Grid]

Playlist Detail Lifecycle:
[Playlist Detail (Empty)] -- click Add Songs --> [Add Songs Drawer Open]
[Add Songs Drawer] -- click Add Song --> [Track Appended] --> [Playlist Detail (Populated)]
[Playlist Detail] -- click Edit Details --> [Edit Modal Open] -- save changes --> [Detail Updated]
[Playlist Detail] -- click Delete --> [Confirm Dialog Open] -- confirm delete --> [Playlists Grid]

Track Entry Management:
[Track Entry] -- move up / move down --> [Position Reordered]
[Track Entry] -- remove action --> [Entry Purged from Playlist]
```

**API surface**:

| Function / Action | Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `createPlaylist` | Store action | `input: PlaylistCreateInput` | `playlistId: string` | Local | Empty title rejected |
| `updatePlaylist` | Store action | `id: string, input: PlaylistUpdateInput` | `void` | Local | Playlist not found |
| `deletePlaylist` | Store action | `id: string` | `void` | Local | Cannot delete curated playlist |
| `addTrackToPlaylist` | Store action | `playlistId: string, trackId: string` | `entryId: string` | Local | Target playlist not found |
| `removeTrackFromPlaylist` | Store action | `playlistId: string, entryId: string` | `void` | Local | Entry not found |
| `reorderTrack` | Store action | `playlistId: string, fromIndex: number, toIndex: number` | `void` | Local | Index bounds checked |
| `playPlaylist` | Store action | `playlistId: string, startIndex?: number` | `void` | Local | Empty playlist no-op |
| `shufflePlaylist` | Store action | `playlistId: string` | `void` | Local | Empty playlist no-op |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render Playlists grid | Playlist cards with title, cover, and track count | Stored `playlists` list in `usePlaylistStore` |
| View Playlist Detail | Header banner title, description, and cover artwork | Active playlist record looked up by `activePlaylistId` |
| View Playlist Detail | Total track count and cumulative formatted duration | Computed from entries in `playlistTracks[playlistId]` and catalog track durations |
| View Playlist Detail | Songs table rows with title, artist, album, duration | Hydrated from `useLibraryStore` or `homeFixtures` using `entry.trackId` |
| Filter Playlists grid | Filtered playlist cards | `overviewSearchQuery` text matched against playlist title and description |
| Filter detail tracklist | Filtered songs table rows | `detailSearchQuery` text matched against track title, artist, and album |
| Play All / Shuffle | Queued tracks in `usePlayerStore` | Mapped track objects passed directly into `usePlayerStore.playCollection` |
| Add songs drawer | Available catalog songs to add | Read from `useLibraryStore.songs` and `homeFixtures.sampleTracks` |
| Delete playlist | Removal and view transition | Triggered by confirmation modal calling `deletePlaylist` and clearing `activePlaylistId` |

**Key invariants**:

- Playlist title cannot be empty or whitespace only.
- Curated system playlists (isCurated flag true) cannot be deleted or renamed by the user.
- Duplicate songs in a playlist are permitted because each addition receives a unique `entryId`.
- Track positions are contiguous integers starting from zero; removing or reordering entries recalculates indices to prevent gaps.
- When `activePlaylistId` is deleted, the active view resets to null and returns navigation to the overview grid.
- Deleting a playlist never removes or alters underlying tracks in the library.

**Security model**:

Local single user desktop application with profile identifier `madebyadah`. All playlist state resides in client memory during the Facade phase and migrates to local SQLite storage in Phase 2. No external network transmission or credential management is involved.

**Configuration required**:

None. Operates entirely offline using existing local assets and Tailwind theme tokens.

**Critical test scenarios**:

- Happy path: User creates a playlist with title and gradient, navigates into detail view, adds three tracks from the drawer, reorders tracks, and clicks Play All, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-8**, **AC-9**.
- Empty state: User creates an empty playlist, observes disabled playback buttons, sees empty state card, and clicks Add Songs to open the curation drawer, verifies **AC-7**, **AC-8**.
- Search filter: Typing query in overview grid filters playlist cards; typing query in detail view filters songs table without changing playlist order, verifies **AC-1**, **AC-9**.
- Track removal: User removes a track from a playlist; the entry is purged, duration updates, and other playlist entries remain intact, verifies **AC-10**.
- Deletion flow: User deletes a custom playlist from detail view, confirms prompt, verifies removal from store and sidebar, and returns to overview grid, verifies **AC-12**.
- Curated protection: Attempting to delete or alter a curated playlist suppresses delete actions, verifies **AC-12**.

## Build plan

1. [x] Define playlist data structures, creation and update interfaces, and initial mock playlist fixtures with sample track entries, satisfies **AC-1**, **AC-2**, **AC-4**
2. [x] Create dedicated reactive Zustand store at `src/store/usePlaylistStore.ts` implementing playlist CRUD, track curation, manual reordering, and playback queue coordination, satisfies **AC-2**, **AC-3**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-11**, **AC-12**
3. [x] Build modular playlist overview components `PlaylistHeader`, `PlaylistGrid`, and `PlaylistCard` with gradient swatches, badges, and hover play triggers, satisfies **AC-1**, **AC-6**
4. [x] Build `PlaylistModal` for creating and editing playlists with title validation, description input, Midnight gradient preset selector, and optional artwork URL, satisfies **AC-2**, **AC-3**, **AC-11**
5. [x] Build playlist detail components `PlaylistDetailBanner`, `PlaylistSongTable`, `PlaylistEmptyState`, and `DeletePlaylistDialog`, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-11**, **AC-12**
6. [x] Build `AddSongsDrawer` curation drawer with search filter input and one click add buttons connected to library tracks, satisfies **AC-8**
7. [x] Assemble `src/pages/Playlists.tsx` page container, wire view switching between grid and detail, integrate into `src/App.tsx`, and synchronize sidebar playlists dynamically, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-11**, **AC-12**
8. [x] Write comprehensive unit and component test suite covering playlist creation, editing, deletion, track addition, reordering, and playback actions, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:

- Gives listeners full control over creating and curating playlists with an expressive Midnight visual identity.
- Keeps track identities normalized so metadata changes in the library stay synchronized.
- Supports duplicate songs and custom manual ordering matching modern streaming expectations.
- Seamlessly synchronizes playlist shortcuts in the sidebar navigation with the active store.

**Negative / tradeoffs**:

- In memory Zustand state does not persist across application restarts until SQLite storage lands in Phase 2.
- Large playlists with hundreds of tracks will require virtualized lists in future releases.

**Neutral**:

- Requires coordinating track hydration across `usePlaylistStore` and `useLibraryStore`.

## Follow-up

- [ ] Connect `usePlaylistStore` to SQLite tables during Phase 2 persistence milestone (Feature 15 in scope).
- [ ] Implement drag and drop visual handles for playlist song table reordering.

## Rationale

Reasoning and options: see rationale.md
