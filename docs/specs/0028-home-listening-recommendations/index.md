# 0028. Home listening recommendations

**Date**: 2026-11-09
**Status**: In Progress

## Summary

This decision adds four generated collections to Home based on local listening history and library tracks. A single SQLite read query computes Recently Added, Most Played, Best of an Artist, and Trending Genre, falling back to popular library tracks only when history is empty. For building, Home gains recommendation cards with loading and retry states, the backend adds the aggregate query, and history pruning adopts a 30 day age window.

## Requirements

**User stories**:

- As a listener, I want Home recommendations to reflect music I played and added so I can quickly replay it.
- As a listener with little history, I want recommendations to use my own library rather than unrelated demo tracks.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Home shows a separate Based on Your Listening section with Recently Added, Most Played, Best of an Artist, and Trending Genre. It loads independently from Your Collections and shows skeletons while loading. Each card displays artwork from its first track with a fallback gradient preset when artwork is absent.
- **AC-2**: Recently Added contains up to ten tracks ordered by `tracks.created_at` descending, then title and track id ascending, with no age cutoff.
- **AC-3**: Most Played contains up to thirty tracks with `play_count > 0`, ordered by `play_count` descending, title ascending, and track id ascending.
- **AC-4**: Best of an Artist selects the artist with the greatest positive sum of all time `play_count`, then includes up to thirty of that artist most played tracks. Group by `artist_id` when present and otherwise by trimmed case insensitive artist name. The stable group key is `id:<artist_id>` or `name:<lower(trim(artist_name))>`. Equal totals break by normalized display name, then stable group key. The backend formats and returns the complete display title (for example, Best of Oliver Mtukudzi). If no artist has a positive total, use the library fallback in **AC-6**.
- **AC-5**: At the start of the recommendation query, capture the current UTC Unix time in seconds once and set the cutoff to that value minus 2,592,000 seconds. Trending Genre counts `listening_history` rows where `played_at >= cutoff`, grouped by the linked track trimmed, case insensitive genre value. It ignores blank genres, selects the genre with the most qualifying plays, breaks ties by normalized genre name, and includes up to thirty tracks of that genre ranked by recent play count, title, and track id. The backend formats and returns the complete display title (for example, Trending in Jazz).
- **AC-6**: If a history based collection query returns zero qualifying rows, it uses the existing popular track ranking to identify the winning fallback artist or genre, then queries up to thirty library tracks for that winning artist or genre ranked by `play_count DESC, title ASC, id ASC`. It labels the result From your library. Usable values are nonblank after trimming, grouped without regard to case, with no placeholder blocklist. If no matching metadata exists, the card shows an empty state. If the library has no tracks, the result includes a zero track count for add music guidance. Any query error or timeout fails the aggregate call and does not trigger fallback.
- **AC-7**: Playing a generated collection replaces the queue with its listed tracks in their displayed order, starts playback, and passes the collection title and type as playback context. Clicking the card body outside the play button also begins queue playback with this context. Generated collections do not create or change saved playlists.
- **AC-8**: Recommendations refresh when Home opens, and when Home is open after the existing `audio:history-recorded` event or `library://scan-completed` event. They also refresh after a successful history clear while Home is open. They do not poll.
- **AC-9**: Listening history retains every raw record for at least 30 days, then prunes older records by age rather than by a row count. Pruning executes within the history recording command or during application startup maintenance, keeping the recommendation query strictly read only. The age comparison uses UTC Unix seconds and the same exact 2,592,000 second window. The existing play milestone rule stays unchanged. Clearing recent history removes history records but does not change `play_count`.
- **AC-10**: A failure in the aggregate recommendation query shows a clear retry state for Based on Your Listening while keeping Your Collections usable.

## Decision

**Chosen option**: Option 1: Provide one typed aggregate SQLite read command returning all four generated collections from local data.

A single Tauri command computes the rankings and returns named collection objects with localized display titles. This keeps query execution consistent, protects against lock contention by separating history pruning from reads, and allows clear distinction between an empty history result and a database query failure.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Data model sketch**:

1. `Track` supplies `id`, `title`, `artist_id`, `artist_name`, `album_id`, `album_name`, `genre`, `play_count`, `created_at`, duration, artwork, and file path.
2. `ListeningHistory` supplies `track_id` and Unix seconds `played_at`. Existing rows are retained for at least 30 days, with older rows pruned by age during history recording.
3. `HomeRecommendationsDto` is transient and includes `library_track_count` plus four named collection results.
4. Each `HomeRecommendationCollection` contains a kind, display title formatted by Rust, source (`history`, `library`, or `none`), and typed track list.
5. No new persisted entity or schema column is added.

```typescript
export type HomeRecommendationKind = 'recently_added' | 'most_played' | 'best_artist' | 'trending_genre';
export type HomeRecommendationSource = 'history' | 'library' | 'none';

export interface HomeRecommendationCollection {
  kind: HomeRecommendationKind;
  title: string;
  source: HomeRecommendationSource;
  tracks: TrackDto[];
}

export interface HomeRecommendationsDto {
  library_track_count: number;
  recently_added: HomeRecommendationCollection;
  most_played: HomeRecommendationCollection;
  best_artist: HomeRecommendationCollection;
  trending_genre: HomeRecommendationCollection;
}
```

Recently Added reports `library` when it contains tracks and `none` when empty. The other collections report `history` for ranked history data, `library` for fallback tracks, and `none` when they have no usable result. The UI shows the From your library label only for source `library`.

**State transitions**:

1. Home entry begins one aggregate recommendation request.
2. A successful response updates all four cards with formatted titles and covers. An empty metric result uses a library fallback and marks its source as library.
3. A query error leaves the request in error state, preserves saved cards, and exposes retry. It never becomes a fallback result.
4. The existing `audio:history-recorded` event carries `PlayHistoryItemDto`. The existing `library://scan-completed` event carries the scan summary. Either event refreshes recommendations from SQLite when Home is active, independently of library store hydration.
5. A successful `db_clear_playback_history` call refreshes recommendations when Home is active.
6. Playing a collection or clicking its card body passes its display title and kind as the existing audio playback context.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `db_get_home_recommendations` | Read only Tauri command | none | `HomeRecommendationsDto` with `library_track_count` and four named collections | Local desktop | SQLite query error |
| `db_get_popular_tracks` | Existing Tauri command | limit 30 | Existing popular ranking with its current backfill rules | Local desktop | SQLite query error |
| `audio:history-recorded` | Existing Tauri event | `PlayHistoryItemDto` | Signals a committed history record | Local desktop | Event delivery error |
| `library://scan-completed` | Existing Tauri event | Scan summary | Signals completed library scan | Local desktop | Event delivery error |
| `db_clear_playback_history` | Existing Tauri command | none | Clears history without changing play counts | Local desktop | SQLite write error |
| `dbGetHomeRecommendations` | TypeScript database service | none | Promise of typed collection DTOs | Local UI | Rejected IPC call |
| `audio_play_track` | Existing Tauri command | track data, context title, context type | Playback begins and context is stored for history | Local desktop | File, format, or engine error |

**Ranking rules**:

1. Recently Added selects up to ten tracks by `created_at DESC`, then title and track id ascending.
2. Most Played selects up to thirty tracks where `play_count > 0`, ordered by `play_count DESC, title ASC, id ASC`.
3. Best of an Artist groups by `artist_id` when present, otherwise by `lower(trim(artist_name))`. The stable group key is `id:<artist_id>` or `name:<lower(trim(artist_name))>`. Only positive sums qualify. Rank by sum descending, normalized display name ascending, then stable group key ascending. The display name comes from the group highest play count track, with title and track id ascending as tie breaks. The Rust query formats the title as `Best of {artist_name}`. Tracks for the winner use `play_count DESC, title ASC, id ASC`.
4. Trending Genre uses history rows where `played_at >= cutoff`, with `cutoff` captured once at query start as UTC Unix seconds minus 2,592,000. It groups by `lower(trim(genre))`, ignores null or blank values, selects the largest row count, then uses the normalized genre key ascending for ties. The display spelling comes from the alphabetically first track title, then track id, in that group. The Rust query formats the title as `Trending in {genre}`. Tracks in the winning genre must have at least one history row at or after the same cutoff and are ordered by recent row count descending, then title and track id ascending.
5. Each recommendation query must succeed. If a history based query succeeds and has no qualifying rows, use the popular track ranking to identify the winning artist or genre, then fetch up to thirty library tracks for that entity. Do not invoke another Tauri command from the aggregate command. A query error or timeout fails the aggregate command and never triggers fallback.
6. For artist fallback grouping, use `artist_id` when present and otherwise `lower(trim(artist_name))`. For both artist and genre fallbacks, usable values are nonnull and nonblank after trimming. Do not exclude placeholder text such as Unknown. The most frequent normalized key wins, then display name and stable key ascending.
7. If the fallback has no usable artist or genre, that card has an empty state. If the library has no tracks, all generated cards show guidance to add music.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Recently Added title and tracks | Track metadata and order | `tracks` columns and `created_at` |
| Most Played title and tracks | Track metadata, play count, and order | `tracks.play_count` and track columns |
| Best of an Artist title | Formatted display title | Rust backend string formatting from selected artist name |
| Best of an Artist ranking | Artist total and track order | Sum of `tracks.play_count`, derived from the named track fields |
| Trending Genre title | Formatted display title | Rust backend string formatting from selected genre |
| Recommendation cutoff | Exact 30 day boundary | UTC Unix time in seconds captured once at the start of `db_get_home_recommendations` |
| Trending Genre ranking | Recent genre and track counts | `listening_history.played_at >= cutoff` and joined track rows |
| Fallback collection | Track list and source label | Up to thirty library tracks for winning entity and source `library` |
| Empty state | Scan or listening guidance | `HomeRecommendationsDto.library_track_count` and collection result |
| Refresh recommendations | Refresh trigger | Existing events or a successful clear history command while Home is active |
| Collection playback | Queue, file paths, context title, and type | Returned track DTOs and the collection kind and title |

**Key invariants**:

1. The four collection rules and their limits are stable and testable.
2. A fallback is allowed only after a successful query returns zero qualifying rows. Any query error or timeout fails the aggregate command.
3. The recommendation query is strictly read only; 30 day history pruning runs on write paths to avoid lock contention.
4. Clearing listening history leaves all time `play_count` values unchanged.
5. Generated results are never written to the playlist tables.
6. SQL uses the existing parameterized repository pattern and sets a busy timeout of at least 5000 milliseconds.

**Security model**:

All source data remains in the local SQLite database. No user identity, network request, or remote recommendation provider is introduced.

**Configuration required**:

Not applicable. No new environment variables, feature flags, or credentials are required.

**Critical test scenarios**:

- Ranking boundaries: Sort rules for all four collections match the defined criteria, verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**.
- Cutoff calculation: Query uses one UTC cutoff exactly 2,592,000 seconds before start time, verifies **AC-5**, **AC-9**.
- Fallback full library query: Fallback query retrieves up to 30 tracks for the winning artist or genre, verifies **AC-6**.
- Formatted titles: Titles arrive from backend with proper formatting for artist and genre, verifies **AC-4**, **AC-5**.
- Fallback labeling: Empty history triggers From your library fallback, while query error triggers retry state, verifies **AC-6**, **AC-10**.
- Refresh triggers: Home refreshes on entry, history record, scan completion, and history clear without polling, verifies **AC-8**.
- Collection playback: Playing a collection replaces the queue with the displayed tracks and sets playback context, verifies **AC-7**.
- Pruning timing: Pruning runs during history recording rather than inside recommendation reads, verifies **AC-9**.

## Build plan

- [x] 1. Add the four recommendation card shells, loading and empty states, retry UI, and source labels with typed preview results, satisfies **AC-1**, **AC-6**, **AC-10**
- [x] 2. Implement the aggregate read only repository query and typed DTO with formatted titles and library fallback track selection, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**
- [x] 3. Add 30 day age pruning to the history recording command and app startup, preserving milestone rules and clear history behavior, satisfies **AC-5**, **AC-9**
- [x] 4. Add the Tauri command and TypeScript service, then hydrate and refresh Home on entry, history recording, scan completion, and successful history clear, satisfies **AC-8**, **AC-10**
- [x] 5. Wire queue playback and context values from card play buttons and card body clicks, then cover ranking, empty data, errors, and refreshes with tests, satisfies **AC-7**

## Consequences

**Positive**:

- Recommendations are based on local records and have explicit ranking rules.
- A single aggregate call keeps the four related results together.
- The existing library ranking provides a predictable fallback without fixtures.
- All time artist ranking uses the existing `tracks.artist_id` index and reads track play counts, not the full listening history.

**Negative / tradeoffs**:

- Age based retention may store more than 1,000 rows for a busy listener.
- One failed query hides all four recommendations until retry.
- The all time artist ranking can favor a long standing favorite over a newly discovered artist.

**Neutral**:

- No new table or column is needed.
- The 30 day retention change modifies the existing listening history policy.

## Follow-up

- None.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
