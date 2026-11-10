# 0027. Playlist and saved collection hydration: Rationale

## Context

The desktop player already persists playlists and library albums in SQLite. However, some playlist views still lack visible loading and error states, and Home displays hardcoded demo collections instead of local records. When an unpopulated state or database error occurs, components risk falling back to mock fixtures or leaving controls as dead clicks.

This issue was identified in `docs/reviews/process-0002-ui-hydration-improvements.md` under finding P2-F5 (See all link on Home curated grid is a dead click) and finding P2-F6 (Home curated grid shows hardcoded mock playlists). The goal is to connect these views directly to stored data, separate independent data source states, and ensure all controls behave predictably.

If this decision is not implemented, listeners see generic demo content on Home, and database failures remain invisible or cause silent UI breakage.

## Options considered

### Option 1: Extend existing stores, screens, and database services in place (chosen)

Reuse the current playlist and album Zustand stores, React screens, and Tauri commands. Add loading, empty, and retry states to each store independently, and balance up to six saved collection cards on Home.

**Pros**:

- Reuses proven SQLite tables, queries, and playback services without introducing duplicate state.
- Limits changes to UI components and error handling logic.
- Keeps playlists and albums independently resilient so one failure does not hide the other.

**Cons**:

- Requires updating multiple store files to track separate error and retry statuses.
- The six card limit means some saved items remain accessible only on their full overview pages.

### Option 2: Create a dedicated Home collections wrapper store

Introduce a separate store specifically to orchestrate Home cards, fetching playlists and albums through an aggregate intermediary.

**Pros**:

- Isolates Home presentation logic from individual collection screens.

**Cons**:

- Introduces duplicate cache state alongside existing playlist and album stores.
- Adds extra abstraction without improving query performance or reliability.

### Option 3: Reload entire Home view on any collection failure

Couple playlist and album loading into one aggregate trigger that fails entirely if either source encounters an error.

**Pros**:

- Simpler state machine with a single loading indicator and error boundary.

**Cons**:

- Poor resilience: an album database error would hide healthy playlists that are ready to play.
- Frustrating user experience for listeners with partially scanned libraries.

## Rationale

Option 1 provides the cleanest and most resilient architecture. Playlists and albums already have dedicated SQLite tables and Tauri commands. Coupling them in a shared store or failing both together would create unnecessary fragility. By tracking loading and error states independently in each existing store, Home can display whichever collection succeeded while offering a targeted retry button for the failed source.

The six card limit with balanced three by three slots keeps the Home layout clean on desktop screens. Linking See all to the existing Playlists view preserves the established navigation hierarchy.

## References

**Project sources**:

- `AGENTS.md`: Zustand store patterns, Clean Architecture four layers, and desktop UI conventions.
- `docs/reviews/process-0002-ui-hydration-improvements.md`: findings P2-F5 and P2-F6.
- `docs/specs/0007-playlists-playlist-detail/index.md`: original playlist UI spec.
- `docs/specs/0015-playlists-favorites-persistence/index.md`: SQLite playlist persistence.

