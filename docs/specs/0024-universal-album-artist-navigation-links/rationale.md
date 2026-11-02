# 0024. Universal Album and Artist Navigation Links (Rationale)

## Context

Process review 0002 identified a major discovery gap tracked as finding P2-F4. Across all desktop player views (the footer player, queue drawer, liked songs table, library song table, search results, playlist song table, and home screen popular tracks), artist and album names appear as plain static text. Users listening to music have no direct path to click an artist name to see their discography, or click an album title to see the complete album tracklist. To view an artist or album, users must manually open the sidebar, click the respective catalog view, and scroll or search for the item.

Several forces shape this technical decision:

First, event bubbling in table rows. In Mutinhimira, track rows have double click handlers to start playback, single click handlers to highlight or select rows, and contextual action buttons like favorite toggles and context menu triggers. If an inline link does not properly isolate its click events, clicking an artist or album name can accidentally trigger audio playback or row selection. Crucially, double clicking a link element must stop propagation on both click and double click, otherwise the second click bubbles up to the row double click listener and starts audio playback.

Second, overlay hierarchy and duplicate routes. The desktop application features several full viewport or slide over surfaces, including the right hand queue drawer, the lyrics modal, settings overlay, and the full screen now playing view. If a user clicks an artist link while inside the queue drawer or full screen mode, the underlying page navigation occurs beneath the overlay. Unless the active overlay is explicitly dismissed, the user remains looking at the overlay without seeing that navigation succeeded. Furthermore, if the user is already on the target page, the navigation store ignores the route transition as a duplicate; dismissing the overlay must therefore happen unconditionally before the navigation check.

Third, compound band names versus collaboration credits. Delimiter based splitting on commas and ampersands presents a severe hazard for real music libraries. Band names like Earth, Wind & Fire, Tyler, The Creator, or Simon & Garfunkel would be mangled into non existent artists if split naively. Performing a full string match against known library artists prior to splitting protects compound names while allowing true collaborations like Amina V feat. Tadiwa Nyoni to split cleanly.

Fourth, album title collisions. Many albums share identical generic titles across different artists, such as Greatest Hits, Live, or self titled releases. Attempting to match an album by title alone in a local library produces non deterministic results. Supplying the track artist name alongside the album title allows the navigation hook to disambiguate collisions and route to the correct release.

Fifth, metadata completeness and search fallback. While SQLite records store relational identifiers (`artist_id` and `album_id`), some track objects loaded from legacy fixtures, scanner streams, or playlist exports only carry string names (`artist` and `album`). The navigation system must handle tracks with or without explicit relational IDs without throwing errors or presenting dead links, falling back gracefully to search.

## Options considered

### Option 1: Shared reusable presentation components with entity navigation hook (Chosen)

Create dedicated UI components (`ArtistLink` and `AlbumLink`) that encapsulate band name lookup, delimiter splitting, hover styling, and stop propagation logic. Pair them with an application hook (`useEntityNavigation`) that orchestrates unconditional overlay closing, ID resolution with artist disambiguation, store updates, and fallback search navigation with route parameter synchronization.

**Pros**:
- Consistent styling, focus outlines, and keyboard accessibility across every view in the application.
- Centralized navigation logic: if navigation routing or overlay handling changes in the future, only the hook needs updating.
- Automatically handles edge cases like compound band name preservation, collaboration delimiter parsing, and missing ID fallback.
- Prevents double click row playback by isolating both single and double click events.

**Cons**:
- Requires updating track row JSX templates across multiple table, player, and banner components.

### Option 2: Inline button elements with duplicated navigation handlers in each component

Add inline clickable buttons directly inside each track row component, with each component implementing its own navigation calls to `useNavigationStore` and `useOverlayStore`.

**Pros**:
- Avoids creating new shared component files.
- Each table can style links with custom local classes.

**Cons**:
- Duplicates event bubbling guards, overlay closing logic, band name checks, and target ID resolution across at least eight different files.
- Inconsistent behavior and visual discrepancies inevitably appear when bug fixes are made in one table but forgotten in others.

### Option 3: Context menu only navigation

Keep all table text display only, and add "Go to Artist" and "Go to Album" action items exclusively to the right click context menu for track rows.

**Pros**:
- Leaves table row layout and click targets completely unchanged.
- Zero risk of conflicting with double click row playback handlers.

**Cons**:
- Severely reduces discoverability. Many desktop users never right click track rows.
- Does not solve the issue for the player footer or full screen player where context menus are less prominent.

## Rationale

Option 1 is selected because universal navigation links must feel natural, reliable, and accessible across the entire application shell. 

Encapsulating link behavior in `ArtistLink` and `AlbumLink` ensures that every link consistently stops click bubbling on both single and double clicks with `e.stopPropagation()`, preventing unwanted track playback when a listener simply wanted to inspect an artist profile. 

Centralizing the navigation orchestration in `useEntityNavigation` cleanly coordinates multiple stores: dismissing the active overlay in `useOverlayStore`, setting the active item in `useArtistStore` or `useAlbumStore`, and pushing the new route entry to `useNavigationStore`. 

Furthermore, checking the full artist string against known artists before delimiter splitting ensures that classic compound band names are never broken into fragment tokens. Disambiguating albums with artist names prevents routing to the wrong album when titles collide. Finally, the resolution fallback ensures that even if a track lacks an explicit relational ID, the system looks up the entity in store memory or safely falls back to a prefilled search query. This eliminates dead clicks while guaranteeing that navigation never drops the user onto a broken blank screen.
