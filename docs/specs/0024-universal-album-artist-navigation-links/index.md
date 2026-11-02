# 0024. Universal Album and Artist Navigation Links

**Date**: 2026-11-02
**Status**: Accepted

## Summary

This specification establishes universal interactive links for album and artist names across all track tables, player controls, and drawer overlays. Users can click any artist or album name to navigate directly to that artist profile or album detail view without triggering track playback or row selection. Album navigation supports artist name disambiguation for common titles, and multi artist parsing checks known band names before splitting. If an entity is not found in existing collections, navigation safely falls back to a prefilled search screen. Any open queue drawer, lyrics modal, or full screen overlay closes automatically upon navigation.

## Requirements

**User stories**:
- As a listener browsing track tables or watching the player footer, I want to click any artist or album name so that I can immediately explore their profile or full album tracklist.
- As a listener using the queue drawer or full screen view, I want to click artist or album links so that the overlay closes and brings me directly to the chosen music collection.
- As a listener with tracks featuring collaborations, I want to click each featured artist individually without breaking band names like Earth, Wind & Fire.

**Acceptance criteria**:
- **AC-1**: Universal clickable artist links render for every track artist across the player footer, full screen artwork and lyrics headers, queue drawer, liked songs table, library song table, search results, home popular tracks table, playlist song table, album detail banner, and album track rows.
- **AC-2**: Universal clickable album links render for every track album across the liked songs table, library song table, search results, playlist song table, artist popular track rows, and full screen artwork view.
- **AC-3**: Clicking an artist link resolves target artist ID from direct metadata or exact case insensitive store match, updates `useArtistStore.activeArtistId`, and navigates to the Artists profile screen with history entry pushed.
- **AC-4**: Clicking an album link resolves target album ID from direct metadata or exact case insensitive title match disambiguated by artist name when available, updates `useAlbumStore.activeAlbumId`, and navigates to the Albums detail screen with history entry pushed.
- **AC-5**: If an artist or album name cannot be matched to an existing record after awaiting store hydration, the system safely navigates to the Search screen, synchronizes `useSearchStore.query` with the target name, and updates route history.
- **AC-6**: Clicking or double clicking any artist or album link calls `e.stopPropagation()` and prevents default row selection, double click track playback, or hover row side effects.
- **AC-7**: Clicking an artist or album link while an overlay is active (queue drawer, lyrics modal, full screen player, settings modal) immediately and unconditionally closes the active overlay (`closeOverlay()`), even if target route navigation is a duplicate route.
- **AC-8**: Multi artist parser first checks if the full string matches an existing artist in memory to preserve bands with commas or ampersands; if no exact match exists, it splits by collaboration delimiters (`feat.`, `ft.`, `featuring`, `vs.`, `,`, `&`), binds any direct `artistId` to the primary artist, and preserves original delimiter typography between link elements.
- **AC-9**: Generic placeholder strings matching empty values or unknown tokens (such as "Unknown Artist", "Unknown Album", "Various Artists", or "-") render as inert non clickable text.
- **AC-10**: Navigation links provide full keyboard accessibility (Enter and Space activation), explicit descriptive aria labels, focus visible outlines, and subtle hover underline visual feedback conforming to Midnight design tokens.

## Decision

**Chosen option**: Option 1: Shared reusable presentation components (`ArtistLink` and `AlbumLink`) driven by a centralized `useEntityNavigation` application hook with band name protection and album disambiguation.

Universal interactive links will be encapsulated into reusable presentation components that delegate navigation orchestration to `useEntityNavigation`. This hook closes any active overlay unconditionally, resolves entity identifiers using in memory store collections with artist disambiguation, updates navigation stores, synchronizes search queries on fallback, and pushes history entries.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`)

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:
The domain entities already support relational links. Frontend track interfaces will receive optional identifier properties to support zero cost direct navigation:

```typescript
export interface TrackNavigationMetadata {
  artistId?: string | null;
  albumId?: string | null;
}
```

Existing interfaces (`Track`, `LibraryTrack`, `LikedTrack`, `PlaylistTrackEntry`, `HydratedPlaylistTrack`) receive optional `artistId` and `albumId` properties. When DTO mappers convert SQLite rows into domain tracks, `artist_id` and `album_id` are preserved on the objects.

**State transitions**:
Navigation transitions follow the application navigation lifecycle:
- User clicks link -> `useOverlayStore.getState().closeOverlay()` executed unconditionally -> check store hydration -> resolve target ID with artist disambiguation -> update store active ID (`useArtistStore.setActiveArtistId` or `useAlbumStore.setActiveAlbumId`) -> `useNavigationStore.getState().navigate(targetView, targetParams)` -> `TopNavBar` records history step.
- Missing entity fallback: `useSearchStore.getState().setQuery(targetName, true)` -> `useNavigationStore.getState().navigate("Search", { searchQuery: targetName })`.

**API surface**:
The presentation and application layer interfaces:

```typescript
// Application hook
export function useEntityNavigation(): {
  navigateToArtist: (artistName: string, artistId?: string | null) => Promise<void>;
  navigateToAlbum: (
    albumTitle: string,
    albumId?: string | null,
    artistName?: string | null
  ) => Promise<void>;
};

// Common presentation components
export interface ArtistLinkProps {
  name: string;
  artistId?: string | null;
  className?: string;
}

export interface AlbumLinkProps {
  title: string;
  albumId?: string | null;
  artistName?: string | null;
  className?: string;
}
```

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Click artist link | Target artist ID | Metadata `artistId` property, or exact case insensitive match in `useArtistStore.artists`, fallback to search query |
| Click album link | Target album ID | Metadata `albumId` property, or title match in `useAlbumStore.albums` disambiguated by `artistName`, fallback to search query |
| Multiple artist render | Individual artist segments and separators | Parsed from input string after store check, separating tokens with original typography |
| View transition | Active view and params | `useNavigationStore.navigate("Artists" | "Albums" | "Search", params)` |
| Overlay dismissal | Overlay state reset to none | `useOverlayStore.closeOverlay()` |
| Search route sync | Prefilled query string | `useSearchStore.setQuery(targetName, true)` and `App.tsx` route synchronization |

**Key invariants**:
- Link clicks and double clicks must never bubble to ancestor track rows (`e.stopPropagation()` on both `onClick` and `onDoubleClick`).
- Navigating to an artist or album must never interrupt or pause background audio playback.
- If an entity name matches placeholder pattern `/^(unknown artist|unknown album|unknown|various artists|-|n\/a)$/i`, it renders as non clickable text.
- Overlay dismissal must occur before route change and must execute even if the target navigation matches the current active route.
- If `useArtistStore` or `useAlbumStore` is currently loading on boot (`!isLoaded`), navigation must await hydration before assuming an entity is missing.

**Security model**:
Client side desktop navigation only. All inputs are sanitized through existing navigation parameter validators. No elevated permissions or native IPC commands are exposed to arbitrary input.

**Critical test scenarios**:
- Happy path table click: Clicking artist name in Liked Songs table navigates to Artist profile, verifies **AC-1**, **AC-3**, **AC-6**.
- Happy path album click: Clicking album name in Library table navigates to Album detail, verifies **AC-2**, **AC-4**, **AC-6**.
- Album disambiguation: Clicking "Greatest Hits" by Artist B navigates to Artist B album rather than Artist A album, verifies **AC-4**.
- Overlay dismissal: Clicking artist name in Queue drawer or Fullscreen closes the overlay and reveals Artist profile, verifies **AC-7**.
- Missing entity fallback: Clicking an unknown artist not in library navigates to Search with query prefilled, verifies **AC-5**.
- Band name preservation: Track by "Earth, Wind & Fire" remains a single link if artist exists in store, verifies **AC-8**.
- Multiple artist parsing: Track with "Artist A feat. Artist B" renders two separate clickable links with preserved delimiter, verifies **AC-8**.
- Double click event isolation: Double clicking a link navigates without triggering underlying row audio playback, verifies **AC-6**.
- Keyboard accessibility: Tabbing to link and pressing Enter triggers navigation, verifies **AC-10**.

## Build plan

Following the project Facade delivery approach, build the reusable navigation hook and UI components first, wire them across existing surfaces, and verify end to end behavior:

- [x] 1. Implement `useEntityNavigation` hook with unconditional overlay dismissal, store hydration await, target ID resolution, album artist disambiguation, and search fallback with query synchronization, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-7**.
- [x] 2. Create reusable `ArtistLink` and `AlbumLink` components in `src/components/common/` with band name lookup, delimiter splitting, click and double click propagation stops, placeholder checks, and keyboard accessibility, satisfies **AC-6**, **AC-8**, **AC-9**, **AC-10**.
- [x] 3. Integrate `ArtistLink` and `AlbumLink` into `PlayerFooter` and `NowPlayingFullscreen` (header and artwork), satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**.
- [x] 4. Integrate `ArtistLink` and `AlbumLink` into `LikedSongTable` and `SongTable` (Library), satisfies **AC-1**, **AC-2**, **AC-6**.
- [x] 5. Integrate `ArtistLink` and `AlbumLink` into `PlaylistSongTable` and `QueueTrackRow`, satisfies **AC-1**, **AC-6**, **AC-7**.
- [x] 6. Integrate `ArtistLink` and `AlbumLink` into `CategorizedResults` (Search) and `TrackTable` (Home), satisfies **AC-1**, **AC-2**, **AC-5**, **AC-6**.
- [x] 7. Integrate `ArtistLink` into `AlbumDetailBanner` and `AlbumTrackRow`, and `AlbumLink` into `ArtistPopularTrackRow`, satisfies **AC-1**, **AC-2**, **AC-6**.
- [x] 8. Add search route parameter synchronization in `App.tsx` and `Search.tsx` to ensure back and forward traversal hydrates prefilled search queries, satisfies **AC-5**.
- [x] 9. Verify link navigation, album disambiguation, band name preservation, double click isolation, and overlay closing with automated Vitest unit tests, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**.

## Consequences

**Positive**:
- Consistent exploration paths across the desktop application.
- Eliminates dead clicks and enables fluid discovery from any playing track.
- Reusable components standardize styling, hover states, and accessibility tokens.
- Protects compound band names while gracefully handling collaboration credits.

**Negative / tradeoffs**:
- Additional clickable targets inside compact table rows slightly decrease the drag or row selection surface area.
- In-memory lookups require stores to be initialized on boot.

**Neutral**:
- Zero database migrations required; relies entirely on existing relational models and store caches.

## Migration plan

**Strategy**: in place component upgrade across existing track rows and tables
**Phases**:
1. Phase 1: Deploy `useEntityNavigation` hook and UI components.
2. Phase 2: Replace plain text spans with `ArtistLink` and `AlbumLink` components in track tables, player views, and banners.
3. Phase 3: Wire route parameter synchronization in `App.tsx` for search queries.
**Rollback**: Revert component replacements back to plain text elements in a single commit.
**Risks**: Unintended event bubbling if propagation stops are omitted in any table row.

## Follow-up

- [ ] Update review issue P2-F4 in `docs/reviews/README.md` to point to `/develop universal album and artist navigation links`
