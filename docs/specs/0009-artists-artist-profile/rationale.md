# Rationale: 0009. Artists and artist profile

## Context

Mutinhimira is a desktop music player inspired by Windows Groove Music and the dark Midnight visual aesthetic. Exploring music through artists is a central pillar of desktop music discovery. Listeners want to see their favourite musicians, discover popular songs, explore full discographies, and read artist backgrounds.

In preceding milestones, Mutinhimira built the foundational architecture, coding standards, and delivered clickable screens for Home Discovery, Search Explore, Your Library, Liked Songs, Playlists, and Albums. While artist names and portrait avatars appear as visual teasers on Home and Search cards, clicking them currently has no destination.

Feature 10 in the project scope requires building the Artists overview collection grid and the dedicated Artist Profile view following the Facade build approach. The technical challenge is designing an artist architecture that supports rich catalogue browsing with fast search and sorting, an atmospheric hero profile with follow controls, expandable top tracks with stream stats, filtered discography releases, and seamless cross view navigation from Home, Search, and Album Detail, all while keeping state cleanly separated before Phase 2 SQLite integration.

## Options considered

### Option 1: Inline slide over panel or modal drawer for artist details

Display artist information inside a slide over drawer or popup modal when clicking an artist from the library or other views, without creating a dedicated Artists screen or standalone profile page.

**Pros**:

- Keeps the listener on their current screen without full page transitions.
- Smaller initial component surface area.

**Cons**:

- Confines the artist experience to a cramped overlay drawer with limited room for large hero imagery, detailed biography blurbs, and full discography grids.
- Prevents fluid browser style back navigation and deep linking.
- Conflicts directly with scope feature 10 which explicitly requires an artist collection grid and dedicated artist profile view.

### Option 2: Dedicated artist store and modular views with discography filtering, interactive following, and cross screen deep linking

Build an independent `useArtistStore` that manages artist catalogue browsing, search filtering, sorting, active artist navigation, follow status toggling, and discography filtering. The overview presents a responsive grid of circular portrait cards with follower counts and verified badges, while the profile view renders a high impact hero banner, expandable top 5 to 10 popular tracks, filtered discography releases, and an about biography card.

**Pros**:

- Follows Clean Architecture and patterns established in Playlists and Albums.
- Provides a spacious, atmospheric profile layout matching modern music players like Spotify and Windows Groove Music.
- Enables deep linking from Home, Search, Liked Songs, and Album Detail with reliable back navigation.
- Keeps audio playback delegation clean by pushing queued top tracks directly to `usePlayerStore`.
- Supports artist follow toggling and live follower count updates in local state.

**Cons**:

- Requires creating a dedicated store file and synchronizing follower status with mock data.
- Adds component surface area for discography filtering, popular track expansion, and avatar fallbacks.

### Option 3: Immediate native SQLite tables and Rust IPC commands with no frontend facade

Bypass the in memory Zustand facade and implement native Rust SQLite tables, migrations, and IPC commands immediately for artist queries, discography joins, and follower tracking.

**Pros**:

- Queries real database records immediately.
- Validates the native SQLite schema on day one.

**Cons**:

- Violates the project Facade build methodology (UI first clickable shell on placeholder data, then wire the backend).
- Blocks UI polish, component testing, and interaction feedback while Rust database migrations and scanner threads are assembled.

## Rationale

Option 2 is chosen because it adheres strictly to Mutinhimira's Facade build methodology, Clean Architecture layers, and established project patterns. Placing artist catalogue state, active selection, sorting, follow tracking, and discography filtering into a dedicated `useArtistStore` keeps concerns cleanly isolated. Audio playback remains delegated to `usePlayerStore`, while song likes synchronize with `useLikedSongsStore`.

Providing a full screen Artist Profile view allows the atmospheric hero banner, popular tracks table, discography grid, and biography card to breathe with rich Midnight theme aesthetics. The expandable top tracks table gives listeners fast access to hits without cluttering the initial view. Procedural gradient avatar placeholders ensure that artists missing photographic assets render with polish rather than broken icons. Furthermore, enabling active artist selection in the store allows seamless deep navigation from Home, Search, and Album Detail screens directly into the Artist Profile.
