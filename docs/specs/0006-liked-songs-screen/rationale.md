# 0006. Liked songs screen: rationale

## Context

In Mutinhimira, listeners mark songs as favorites across various views including Home recommendations, Search discovery, and Your Library local folders. While each screen allows toggling the heart icon on any song, listeners expect a dedicated, prominent collection view where all favorited tracks are gathered in one place for instant listening.

Without a dedicated Liked Songs screen, listeners must hunt through individual folders, playlists, or search results to find songs they loved. The screen must provide immediate playback options, including Play All and Shuffle, while displaying clear aggregate statistics such as total track count and total listening duration.

A key interaction design force is unlike handling. In streaming applications, clicking the heart button on a liked songs screen often removes the track instantly, causing jarring layout shifts and preventing listeners from undoing an accidental click. The design must handle unliking gracefully by keeping the row visible until navigation or reload, while synchronizing the unlike state immediately across playback and library stores.

Under the Facade build approach, this screen must deliver a fully interactive and responsive user experience on simulated placeholder data before native SQLite persistence is wired in Phase 2.

## Options considered

### Option 1: Direct filter view derived from library and player stores with immediate row removal

Derive the liked songs collection on the fly using a custom React hook that filters tracks from `useLibraryStore` where `isLiked === true`, and remove rows immediately when the heart button is clicked.

**Pros**:

- Minimizes code by avoiding a dedicated store for liked songs.
- Eliminates any temporary state synchronization between stores.

**Cons**:

- Unliking a track immediately deletes the row from view, causing jarring layout jumps and making it impossible to undo accidental clicks.
- Cannot easily support sorting by date liked because library tracks only contain date added timestamps.
- Couples the screen tightly to local library tracks, making it harder to display favorited discovery or streaming tracks.

### Option 2: Dedicated liked songs store and modular components with temporary unliked retention (Chosen)

Create a dedicated `useLikedSongsStore` that manages the liked songs collection, tracks dateLiked timestamps, handles sorting and search filtering, and retains unliked songs in an unliked pending state until the user navigates away from the screen.

**Pros**:

- Delivers a polished user experience where unliking a track changes the heart icon to an outline but leaves the row in place, allowing immediate undo.
- Preserves genuine dateLiked timestamps so listeners can sort tracks by when they were favorited (newest likes first).
- Maintains clear separation of concerns with modular components in `src/components/liked/` and clean playback integration with `usePlayerStore`.
- Automatically purges unliked tracks when the screen unmounts, keeping future visits clean and consistent.

**Cons**:

- Requires managing an unlikedPendingIds list in store state to track items pending removal on navigation.

### Option 3: Sub view inside Your Library filtering by liked tracks

Implement Liked Songs as a filtered tab or filter toggle inside the existing Your Library screen rather than an independent top level destination.

**Pros**:

- Reuses existing library table and layout components directly.
- Avoids creating an additional top level page component.

**Cons**:

- Demotes one of the most frequently used music player destinations to a secondary sub filter.
- Clashes with the main sidebar navigation where Liked Songs is prominently featured alongside Home and Search.
- Compromises the dedicated Midnight hero banner aesthetic tailored specifically for favorited tracks.

## Rationale

Option 2 is chosen because it delivers the most enjoyable, forgiving, and aesthetically cohesive listening experience for Mutinhimira. A dedicated Liked Songs screen gives listeners direct access to their favorite tracks with a distinctive illuminated heart hero banner, matching the Windows Groove Music and Midnight visual style.

Retaining unliked tracks in place during the active session is a critical usability improvement. If a listener accidentally clicks the heart icon while browsing or playing music, they can immediately click it again to restore their favorite without losing their place in the list.

The dedicated `useLikedSongsStore` allows tracking `dateLiked` timestamps, enabling the natural default sort order where newly favorited tracks appear at the top. When the user navigates away, the store cleanly purges unliked items, ensuring that the collection remains tidy on their next visit.
