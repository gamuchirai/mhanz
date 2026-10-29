# Rationale: 0007. Playlists and playlist detail

## Context

Mutinhimira is a modern desktop music player inspired by Windows Groove Music and the dark Midnight visual layout. A core expectation of any personal music manager is the ability to create, customize, and curate personal playlists. Listeners need to organize their local tracks into themed collections, mood mixes, and listening sessions.

In earlier milestones, Mutinhimira scaffolded the application shell, established coding standards, and delivered clickable screens for Home Discovery, Search, Your Library, and Liked Songs. Curated playlists currently exist as static cards in discovery fixtures, and the sidebar contains hardcoded playlist titles under a YOUR PLAYLISTS header with a non functional plus button.

Feature 8 in the project scope requires building the Playlists overview screen and dedicated Playlist Detail screen under the Facade build approach. The primary challenge is designing a flexible playlist architecture that supports custom creation with visual cover art, track addition from the library, duplicate song handling, and track reordering, while maintaining clean separation between UI state, track hydration, and future Phase 2 SQLite persistence.

## Options considered

### Option 1: Embedded playlist state inside player store with simple inline prompts

Merge playlist collections directly into `usePlayerStore`, storing full track object arrays inside each playlist entity, and trigger basic window prompt dialogs for creating and renaming playlists.

**Pros**:
- Requires no new store files or inter store synchronization.
- Quickest to scaffold on top of existing player queue state.

**Cons**:
- Bloats `usePlayerStore` with collection management logic unrelated to audio playback.
- Storing full track objects creates duplicate data that falls out of sync when library track metadata or liked states change.
- Native browser prompt dialogs break the custom Midnight visual aesthetic.

### Option 2: Dedicated playlist store and modular views with normalized track entries and curation drawer

Implement an independent `usePlaylistStore` managing normalized playlist metadata and ordered `PlaylistTrackEntry` records. The overview screen renders a card grid with a creation modal, while the detail view provides deep curation actions including a slide in add songs drawer, track reordering, and reactive sidebar synchronization.

**Pros**:
- Clean separation of concerns following Clean Architecture and past feature specs.
- Normalized track referencing ensures track metadata stays unified with `useLibraryStore`.
- Supports duplicate songs within a playlist through unique entry identifiers.
- Delivers a cohesive, immersive Midnight experience with custom gradient swatches and animated modals.

**Cons**:
- Requires coordinating track lookups across `usePlaylistStore` and `useLibraryStore`.
- Involves building dedicated curation drawer and modal components.

### Option 3: Direct SQLite backed persistence with Tauri IPC commands up front

Skip the in memory Zustand prototype and implement Rust SQLite tables, migration scripts, and Tauri IPC commands immediately for playlist CRUD operations and track relations.

**Pros**:
- Playlists immediately persist across desktop app restarts.
- Matches the final production architecture.

**Cons**:
- Violates the project Facade build approach (clickable UI prototype first, wire backend later).
- Slows UI iteration and component testing while database migrations and IPC bindings are wired.

## Rationale

Option 2 is chosen because it perfectly aligns with Mutinhimira's Facade development methodology and architectural guidelines. Placing playlist state in a dedicated `usePlaylistStore` keeps `usePlayerStore` focused strictly on audio playback and queue execution. Normalizing playlist items into `PlaylistTrackEntry` records with explicit positions ensures that track metadata changes in the library reflect immediately in playlists, while giving listeners the freedom to add duplicate songs and arrange custom track sequences.

Furthermore, integrating custom Midnight visual gradients into the creation modal ensures every playlist card looks stunning without requiring external image uploads. The inline add songs drawer allows immediate curation without navigating away from the playlist detail screen, making playlist building intuitive and delightful.
