# 0028. Home listening recommendations: Rationale

## Context

Home currently lacks dynamic recommendations based on listener habits. When listeners open the app, they expect quick ways to resume listening through familiar categories such as recently added tracks, most played music, favorite artists, and trending genres.

Previously, `docs/reviews/process-0002-ui-hydration-improvements.md` noted under finding P2-F6 that Home displays hardcoded mock playlists unrelated to the user's actual library. Although SQLite already tracks play counts and listening history timestamps, these statistics have not been aggregated into Home collections.

Without this decision, Home remains static and listeners cannot rediscover music based on their listening history.

## Options considered

### Option 1: Single aggregate SQLite command returning four typed collections (chosen)

Run one coordinated database query via a single Tauri command that aggregates Recently Added, Most Played, Best of an Artist, and Trending Genre, returning a typed DTO with explicit source labels.

**Pros**:

- Keeps database round trips to a single IPC call when Home opens or refreshes.
- Ensures consistent timestamp boundaries across all four collections.
- Allows the UI to distinguish between an empty result and a database query failure.
- Gracefully falls back to existing popular track rankings when history is empty.

**Cons**:

- A database error in the aggregate query fails the entire section, though saved collections remain visible.
- More complex SQL query logic in Rust compared to separate simple queries.

### Option 2: Four independent queries triggered by separate store hooks

Issue four distinct Tauri commands from the frontend, one for each recommendation card.

**Pros**:

- Each card can load, succeed, or fail independently.

**Cons**:

- Quadruples IPC round trips on Home entry.
- Risk of race conditions and mismatched time cutoffs across collections.
- Complicates refresh coordination after history events.

### Option 3: Client side computation in React from loaded library tracks

Fetch all library tracks and history records into React state and compute the rankings in JavaScript.

**Pros**:

- Keeps recommendation logic inside TypeScript.

**Cons**:

- Poor performance on large libraries with thousands of tracks and history rows.
- Re-implements grouping, sorting, and filtering logic that SQLite handles efficiently with indexes.

## Rationale

Option 1 is the fastest and most reliable approach. SQLite already indexes `tracks.artist_id` and `listening_history.played_at`. Computing the four collections natively in SQLite avoids transferring large history tables across the Tauri IPC bridge.

Capturing the UTC timestamp once at the start of the query guarantees that the 30 day cutoff is identical for all collections. The single DTO shape allows the UI to show skeletons while loading and a clean retry card if the query fails.

Changing history pruning from a fixed row cap of 1,000 entries to an age window of 30 days ensures that the Trending Genre query always has sufficient historical data, even for active listeners.

## References

**Project sources**:

- `AGENTS.md`: Tauri v2 desktop runtime and Rust best practices.
- `docs/reviews/process-0002-ui-hydration-improvements.md`: finding P2-F6.
- `docs/specs/0022-home-listening-history-popular-tracks-persistence/index.md`: listening history and popular tracks persistence.

