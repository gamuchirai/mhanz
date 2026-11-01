# 0021. Artists and artist profile persistence: Rationale

## Context

Mutinhimira is a cross platform local music player built using Tauri v2, React 19, and SQLite. In earlier Phase 1 development, Feature 10 delivered the Artists collection overview and dedicated Artist Profile screens as a UI facade. That initial implementation operated exclusively on mock fixture data in memory, featuring simulated follower numbers, monthly listener statistics, and static discography lists.

In Phase 2, the local audio library scanner (Feature 15) and SQLite database layer (Feature 12) were implemented. When users monitor music folders, audio tags are parsed with Lofty and recorded into local SQLite tables for artists, albums, and tracks. Furthermore, the Rust backend in `catalog_repo.rs` already exposes `db_get_artists` and `db_get_artist_profile` commands through Tauri inter process communication. However, the frontend `useArtistStore` remained disconnected from SQLite, creating a disconnected experience where scanning local music never reflected in the Artists tab (tracked as Finding F-3 in review records).

Connecting the artists interface to SQLite requires addressing data representation. In an offline desktop player, streaming concepts like follower counts and monthly listeners do not exist because the user simply plays their own local files. The system must hydrate real artist records, present accurate local library statistics (track count, album count, local plays), and keep the view synchronized when background library scans finish.

## Options considered

### Option 1: On demand SQLite profile hydration via existing Tauri IPC commands with retired streaming follower concept and automatic scanner catalog sync

Hydrate the artist catalog summary list on store initialization using the existing `db_get_artists` command, and fetch detailed profile data (top played tracks and albums) lazily when an artist card is clicked via `db_get_artist_profile`. Remove follow buttons and simulated follower counts from the user interface, replacing them with authentic library metrics such as album count, track count, and local play counts. Register an event listener for scanner completion events to refresh the artist catalog automatically.

**Pros**:
- Reuses existing backend SQLite queries without requiring any new database schema migrations.
- Perfectly aligns the desktop user interface with local library realities rather than mimicking cloud streaming metrics.
- Keeps startup hydration lightweight by fetching tracklists and discographies only when viewing an individual artist.
- Keeps the artist collection continuously updated as new music folders are added.

**Cons**:
- Opening an artist profile triggers an asynchronous database fetch, which requires brief loading feedback if the artist has a very large discography.

### Option 2: Retain follow mechanism by introducing SQLite schema migration V004 for followed artists

Add a database migration adding `is_followed` and `followed_at` columns to the `artists` table in SQLite, and implement a `db_toggle_artist_follow` command. Keep the Follow or Following buttons in the artist header and profile banner.

**Pros**:
- Preserves the exact user interface interactions introduced in the initial Phase 1 prototype.

**Cons**:
- Adds unnecessary database migration and state management complexity for a concept that does not fit local offline music playback.
- Creates user confusion because following an artist on a desktop device does not produce new release notifications or social activity.

### Option 3: Full eager preloading of all artist profiles and tracklists on application startup

Query the entire music database on startup and assemble complete artist profiles, full tracklists, and discographies for every artist in memory immediately.

**Pros**:
- Instant navigation into any artist profile with zero asynchronous loading delay.

**Cons**:
- Drastically increases memory usage and startup latency for large local music libraries with hundreds of artists and thousands of tracks.
- Duplicates track and album data already stored in other specialized stores.

## Rationale

Option 1 is selected because it delivers an authentic, high performance desktop music experience while minimizing architectural complexity.

Mutinhimira is designed as a focused desktop audio player for local music collections, not an online streaming service. Preserving simulated follower counts and follow buttons (Option 2) introduces cognitive dissonance and database migration maintenance for an artificial feature. Replacing follower counts with genuine local library indicators (number of albums, number of tracks, and play counts) provides meaningful value to listeners managing their audio files.

From a performance perspective, lazy profile hydration (Option 1) scales smoothly to large music libraries. Loading only summary artist records during catalog browsing and fetching detailed top tracks and discography records on demand prevents memory bloat and slow boot times (avoiding the pitfalls of Option 3). Reusing the already implemented Rust repository functions in `catalog_repo.rs` allows the team to deliver this feature cleanly and rapidly without schema risk.
