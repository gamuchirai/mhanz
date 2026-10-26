# Rationale: 0008. Albums and album detail

## Context

Mumhanzi is a desktop music player inspired by Windows Groove Music and the dark Midnight visual aesthetic. A fundamental pillar of any music listening experience is browsing music by albums. Albums represent cohesive artistic works with curated track sequences, cover art, release years, and liner metadata.

In preceding milestones, Mumhanzi established the foundational architecture, coding standards, and delivered clickable screens for Home Discovery, Search Explore, Your Library, Liked Songs, and Playlists. In the Home and Search views, album cards already exist as visual fixtures, but clicking them currently has no dedicated destination.

Feature 9 in the project scope requires building the Albums overview collection and the dedicated Album Detail view following the Facade build approach. The technical challenge is designing an album architecture that supports rich catalog browsing with fast search and multi criteria sorting, multi disc tracklist presentation, seamless cross view navigation from Home and Search, and smooth playback coordination with the player bar, all while keeping state cleanly separated before Phase 2 SQLite integration.

## Options considered

### Option 1: Inline expandable album rows in a unified library view

Display albums as accordion style expandable cards within the existing Library view without creating a dedicated Albums screen or dedicated Album Detail view.

**Pros**:
- Avoids introducing a new top level page container or navigation tab.
- Minimal state management overhead.

**Cons**:
- Fails to deliver the immersive album listening experience listeners expect from modern desktop music players.
- Leaves no dedicated space for large format album artwork, record label notes, release years, or multi disc separator headers.
- Conflicts directly with scope feature 9 which explicitly requires an album collection grid and dedicated album detail view.

### Option 2: Dedicated album store and modular views with multi disc grouping and cross screen navigation

Build an independent `useAlbumStore` that manages album catalog browsing, search filtering, sorting, active album navigation, and album favorites. The overview presents a responsive grid of album cards with glowing hover effects, while the detail view renders a high impact hero banner, vinyl placeholder fallbacks, and tracklists grouped cleanly by disc.

**Pros**:
- Follows Clean Architecture and patterns established in Playlists and Liked Songs.
- Fully supports multi disc albums with disc headers while keeping single disc tracklists clean and flat.
- Enables deep linking from Home, Search, and Library into Album Detail with reliable back navigation.
- Keeps audio playback delegation clean by pushing queued album tracks directly to `usePlayerStore`.
- Supports album level favorites alongside track level likes.

**Cons**:
- Requires creating a dedicated store file and synchronizing album favorites with mock data.
- Adds component surface area for disc grouping headers and vinyl placeholder fallbacks.

### Option 3: Direct SQLite queries through Tauri IPC with no frontend mock store

Bypass the in memory Zustand facade and implement native Rust SQLite tables, migrations, and IPC commands immediately for album queries, track lookups, and disc ordering.

**Pros**:
- Queries real database records immediately.
- Validates the native SQLite schema on day one.

**Cons**:
- Violates the project Facade build methodology (UI first clickable shell on placeholder data, then wire the backend).
- Blocks UI polish, component testing, and interaction feedback while Rust database migrations and scanner threads are assembled.

## Rationale

Option 2 is chosen because it adheres strictly to Mumhanzi's Facade build methodology, Clean Architecture layers, and established project patterns. Placing album catalog state, active selection, sorting, and album favorites into a dedicated `useAlbumStore` keeps concerns isolated. Audio playback remains cleanly delegated to `usePlayerStore`, while track like statuses synchronize with `useLikedSongsStore`.

Handling multi disc groupings conditionally ensures classical, deluxe, or double albums display their natural disc divisions, while standard single disc albums retain a clean, uninterrupted tracklist. Procedural vinyl placeholders ensure that albums missing cover art look polished rather than broken. Furthermore, enabling active album selection in the store allows seamless deep navigation from Home and Search screens directly into the Album Detail view.
