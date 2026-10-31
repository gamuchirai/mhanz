# 0020. Albums and album detail persistence (Rationale)

## Context

Mutinhimira completed Phase 1 by implementing visual user interface shells for the Albums overview grid and Album Detail views, documented in specification 0008. These screens demonstrated essential interactions including album card grids, search filtering, multi criteria sorting, hero banners, multi disc tracklist layouts, and album favorite toggles. However, all album catalog records and tracklists currently reside in memory using static mock data inside `src/store/useAlbumStore.ts` and `src/data/mockAlbums.ts`. When users scan their personal music folders or restart the desktop player, newly discovered albums do not appear in the Albums tab, and any favorited albums disappear on application restart.

A recent architectural audit recorded this discrepancy as issue F-2 in `docs/reviews/README.md`. While the native SQLite schema and basic read queries for albums were scaffolded in spec 0012, the albums store was never connected to the native database layer or scanner events. Furthermore, the existing `albums` table in migration V001 lacks dedicated columns for user favorite status and favorite timestamps.

Desktop music listeners expect immediate, tactile responsiveness when browsing collections and opening albums. Double albums and multi disc releases require proper sequencing by disc and track number without lag. Moreover, album favorites present an interesting user expectation regarding song likes: listeners expect that liking an album should express love for its songs, and conversely, liking fifty percent or more of the songs in an album signifies that the album itself is a favorite.

## Options considered

### Option 1: Optimistic Zustand store hydration with V004 SQLite migration, bidirectional track like synchronization, and scanner event coordination

Introduce database migration V004 adding `is_favorite` and `favorited_at` columns with a composite index to the `albums` table. Update `catalog_repo::get_albums` and `catalog_repo::get_album_details` to compute track counts, total durations, and derived favorite status where an album is marked favorite if at least fifty percent of its tracks are liked. Expose a dedicated `db_toggle_album_favorite` IPC command that accepts an optional explicit target and updates the album and all its associated tracks inside an atomic transaction, returning the full affected tracks. Wire `useAlbumStore` to hydrate albums from SQLite on startup, lazily fetch album details on demand, update state optimistically with rollback protection, broadcast batch updates to `favoritesSync`, and silently re hydrate upon `onScanCompleted` events. Fall back to mock fixtures only in non Tauri browser environments.

**Pros**:
- Guarantees durable SQLite persistence across restarts for all scanned albums and favorite states.
- Bidirectional favorite synchronization keeps album hearts and individual song likes aligned everywhere without manual reconciliation.
- Returning full track entities and batching sync events prevents notification storms and avoids placeholder text in Liked Songs.
- Explicit boolean target in favorite toggle avoids inverse toggle edge cases on derived favorites.
- Automatic scanner refresh ensures newly added music folders appear immediately without requiring manual app reloads.
- Safe browser fallback preserves web developer experience and fast unit testing.

**Cons**:
- Requires store actions to retain prior state snapshots for clean rollback handling on write errors.
- Unliking an album clears individual likes across all its tracks.

### Option 2: Purely client side derived album favorites without database schema additions

Avoid modifying the SQLite schema and do not add columns to the `albums` table. Instead, derive album favorite status entirely in the React client by checking if all tracks in an album are liked, or store favorite album identifiers in browser localStorage.

**Pros**:
- Requires no database schema migration.
- Simpler backend repository code.

**Cons**:
- Dual sources of truth between browser localStorage and the SQLite database.
- Checking every track to derive album status requires fetching all tracks across the entire library upfront on startup, causing high memory and IPC overhead.
- Album favorites would not be queryable or sortable directly within the native SQLite engine.

### Option 3: Strictly awaited IPC calls without optimistic store state or rollback

Make all store operations asynchronous and block the user interface until the Tauri IPC invocation resolves and writes to disk. Re query the database from disk after every favorite toggle.

**Pros**:
- Simpler store logic with zero need for optimistic rollback snapshots.
- Guarantees that visible user interface state strictly mirrors database rows at all times.

**Cons**:
- Introduces noticeable visual latency when clicking heart buttons on album cards or hero banners.
- Re querying the full album list on every toggle causes unnecessary database load and potential scroll position flicker.

## Rationale

Option 1 is the chosen approach because it delivers the immediate, fluid responsiveness desktop music listeners expect while maintaining data integrity in SQLite. Music player interactions such as toggling a favorite heart require instant visual feedback without waiting for disk I/O. Optimistic store updates ensure zero latency animations, while automatic snapshot rollback guarantees that the interface never displays false state if an operating system write fails.

Adding `is_favorite` and `favorited_at` to the `albums` table via migration V004 gives the database first class support for favorite albums. Computing total duration and the fifty percent derived favorite rule directly inside SQLite avoids the severe performance penalty of loading thousands of library tracks into JavaScript just to render the album grid. Returning full affected `TrackDto` records from `db_toggle_album_favorite` enables the frontend `favoritesSync` coordinator to update active track rows and `useLikedSongsStore` immediately with real metadata. Finally, listening to `onScanCompleted` events bridges the gap between background folder indexing and the user interface, ensuring that the listener library stays fresh and complete.
