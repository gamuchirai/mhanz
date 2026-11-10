# 0027. Playlist and saved collection hydration

**Date**: 2026-11-09
**Status**: In Progress

## Summary

This decision connects playlist screens and Home saved collections to local SQLite records. The interface replaces hardcoded demo items with real playlists and library albums while handling loading and error states cleanly. For building, the visible components gain skeleton and retry states, stores link to existing database commands, and playback starts saved playlist tracks in order.

## Requirements

**User stories**:

- As a listener, I want Playlists to show saved data and clear loading, empty, and error states so I can trust what I see.
- As a listener, I want Home to show my saved playlists and albums and navigate to their existing destinations.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: In Tauri, playlist overview and detail data come from SQLite. Loading shows skeletons, an empty result shows helpful guidance, and a failure shows a visible retry action. A database error sets items to an empty list and never falls back to fixtures in Tauri. Browser previews and tests may keep their current fixture behavior. Duplicate store initialization calls are ignored while loading is active.
- **AC-2**: Home shows a Your Collections section using persisted playlists and library albums. It shows up to six cards, with up to three of each type, filling unused slots from the other type. Cards appear in sequential order, with qualifying playlists displayed first followed by library albums. It preserves each store current sort order and includes persisted curated playlists.
- **AC-3**: Playlist and album data load independently. If one source fails, Home keeps cards from the successful source and displays an inline retry card in the first slot of the failed source. If both sources load and contain no records, Home offers actions to open Playlists and add music.
- **AC-4**: See all in Your Collections opens Playlists. An album card opens its album detail. A playlist card opens its detail, and clicking its Play action shows a loading spinner on the button, loads ordered entries from SQLite, and starts playback. If the detail fetch fails, a toast notice appears. A playlist with zero tracks has its Play button disabled with an accessible tooltip and cannot be played.
- **AC-5**: An unsupported control in the reviewed playlist or Home collection surfaces is visibly disabled and has an accessible explanation. No control in these surfaces is left as a dead click.

## Decision

**Chosen option**: Option 1: Extend existing playlist and album stores, pages, and database services in place.

We reuse existing SQLite commands and records, adding explicit loading, error strings, and retry states to each store so that independent failures do not hide healthy data.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Data model sketch**:

1. Reuse `PlaylistDto`, including `id`, `name`, optional `description`, `cover_art_path`, `gradient_preset`, `is_favorite`, `is_curated`, and `track_count`.
2. Reuse `PlaylistTrackDto` with `id`, `playlist_id`, `track_id`, `position`, `added_at`, and hydrated `track: TrackDto`. Its `position` provides playlist detail and playback order.
3. Reuse `AlbumDto`, including `id`, `title`, `artist`, `cover_art_path`, `genre`, `year`, `track_count`, and `duration_seconds`.
4. Store states gain `error: string | null` and clear items to empty arrays upon database failure in Tauri.
5. No database tables or columns are added.

**State transitions**:

1. Idle to Loading: Home and Playlists initiate independent requests to fetch playlist and album collections. A request is skipped if `isLoading` is already true.
2. Loading to Loaded: Records are displayed sequentially within the six card limit (playlists first, then albums).
3. Loading to Empty: Helpful guidance and links to add music or create playlists appear.
4. Loading to Error: The failed source displays an inline error card with a retry button while the successful source remains visible.
5. User selects Play on playlist card: The button displays a spinner, fetches detail entries via `db_get_playlist_details`, and starts playback. On error, a toast notice appears and playback is not queued.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `db_get_playlists` | Existing Tauri command | none | `PlaylistDto[]` with `track_count` | Local desktop | SQLite error |
| `db_get_playlist_details` | Existing Tauri command | playlist id | Playlist and ordered entries, each with `position` and hydrated `track: TrackDto` | Local desktop | SQLite error |
| `db_get_albums` | Existing Tauri command | none | `AlbumDto[]` with `track_count` and duration | Local desktop | SQLite error |
| `dbGetPlaylists` | Existing TypeScript service | none | Promise of playlist DTOs | Local UI | Rejected IPC call |
| `dbGetAlbums` | Existing TypeScript service | none | Promise of album DTOs | Local UI | Rejected IPC call |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render saved playlist card | Identity, name, artwork, gradient, track count | `PlaylistDto` from `db_get_playlists` |
| Render playlist detail | Track metadata and entry order | `PlaylistTrackDto.track` and `position` from `db_get_playlist_details` |
| Render saved album card | Title, artist, artwork, track count | `AlbumDto` from `db_get_albums` |
| Navigate via See all | Target route | Existing navigation route `Playlists` |
| Navigate via album card | Album identity and target view | `AlbumDto.id` and existing album route |
| Play saved playlist | Queue tracks, paths, and order | `PlaylistTrackDto.track` ordered by `position` |
| Inline error presentation | Error label and retry action | Store `error` message and targeted reload function |
| Retry failed collection | Refresh target | Failed playlist or album store load action |

**Key invariants**:

1. In Tauri desktop builds, SQLite errors remain errors, set the items list to empty, and do not fall back to fixture data.
2. Browser preview mode retains its fixture fallback for standalone development and tests.
3. A failed album load does not hide successfully loaded playlist cards, and a failed playlist load does not hide album cards.
4. The six card limit on Home arranges qualifying playlists first, followed by albums, without changing sort order within either group.
5. Disabled controls provide accessible tooltips or screen reader explanations.

**Security model**:

The app runs locally for a single user. SQLite access uses parameterized queries behind existing Tauri commands. No network service or account is used.

**Configuration required**:

Not applicable. No new environment variables, feature flags, or credentials are required.

**Critical test scenarios**:

- Happy path: Both playlists and albums load, rendering up to six cards with playlists first, verifies **AC-2**.
- Partial failure: Album query fails while playlist query succeeds; playlist cards remain visible and an inline error card appears for albums, verifies **AC-1**, **AC-3**.
- Async card play: Clicking Play on a playlist card shows a spinner, loads tracks, and begins playback, verifies **AC-4**.
- Empty playlist: A playlist with zero tracks has a disabled Play button with an explanatory tooltip, verifies **AC-4**.
- Fixture guard: In Tauri, a database error clears data arrays rather than showing mock fixtures, verifies **AC-1**.
- Unsupported controls: Inactive buttons show accessible explanations and prevent dead clicks, verifies **AC-5**.

## Build plan

The project uses a Facade approach. The visible UI states and controls come first, then connect existing SQLite services and store actions.

- [x] 1. Add loading skeletons, empty guidance, inline error retry cards, and accessible explanations for unsupported controls in playlist and Home collection views, satisfies **AC-1**, **AC-3**, **AC-5**
- [x] 2. Connect Home Your Collections section to existing playlist and album store data, enforcing sequential layout and the six card limit, satisfies **AC-2**
- [x] 3. Wire See all navigation, album navigation, playlist detail navigation, and playlist playback with async track loading and empty track guards, satisfies **AC-4**
- [x] 4. Update stores to clear fixtures on Tauri database errors and add Vitest coverage for error handling, partial load resilience, and navigation actions, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Playlists and Home reflect local music instead of mock fixtures.
- Independent source loading prevents one database error from breaking the entire Home page.
- Actions and navigation reuse existing routes and persistence logic.

**Negative / tradeoffs**:

- Both stores require explicit error states and retry tracking.
- The six card limit keeps additional saved items on their respective detail screens.

**Neutral**:

- Curated playlists already saved in SQLite continue to be displayed.
- No schema migration or new database tables are needed.

## Follow-up

- None.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
