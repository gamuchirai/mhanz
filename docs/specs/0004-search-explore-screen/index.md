# 0004. Search and explore screen

**Date**: 2026-10-23
**Status**: In Progress

## Summary

This specification defines the architecture, user experience, and implementation details for the Search and explore screen in Mumhanzi. It establishes a dedicated feature folder under src/components/search/, a page container at src/pages/Search.tsx, and a reactive Zustand store at src/store/useSearchStore.ts. Following the Facade build approach, this screen delivers a fast, responsive interface with instant debounced filtering, category pills for songs, albums, artists, and genres, a rich Explore view with colorful genre cards, and immediate playback integration with the player footer.

## Decision

**Chosen option**: Option 2: Feature folder architecture with dedicated search store

Implement the Search and explore screen as a modular feature under `src/components/search/` with state managed by a dedicated `useSearchStore` that connects with `usePlayerStore` for seamless audio playback.

**Implementation skills**: `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Requirements

**User stories**:

- As a listener looking for music, I want to type in an instant search bar so that I can quickly find songs, albums, artists, or genres without waiting.
- As a listener opening the search page without a query in mind, I want an Explore grid of colorful genres and moods so that I can discover new sounds effortlessly.
- As a listener browsing wide search results, I want category filter pills so that I can isolate songs, albums, artists, or genres into focused views.
- As a listener finding a song or album in search results, I want to click play or double click a row so that playback starts immediately with remaining items queued.
- As a listener typing a query that yields no matches, I want a clear, friendly empty state with tips and quick genre buttons so that I am never stuck at a dead end.

**Acceptance criteria**:

- **AC-1**: Navigating to Search in the navigation sidebar renders the Search and explore view with Midnight theme styling, showing a prominent search input, quick clear button, interactive category filter pills (All, Songs, Albums, Artists, Genres), and recent search chips.
- **AC-2**: When the search query is empty, the screen displays the Explore view showcasing a grid of colorful genre and mood cards with gradient styling, icons, and track counts.
- **AC-3**: Clicking any Explore genre card populates the search input with the genre name, sets the category pill to Genres, and filters matching songs and albums.
- **AC-4**: Typing in the search input debounces by 150 milliseconds and filters music fixtures across song titles, artists, album names, and genres in real time.
- **AC-5**: When the All category pill is selected, results display in organized sections: Top Results, Songs table, Albums grid, Artists circular cards, and Genres pills.
- **AC-6**: Clicking a specific category pill (Songs, Albums, Artists, or Genres) isolates the view to show only items belonging to that category with an expanded layout.
- **AC-7**: Clicking the quick play button on any song card or double clicking a song row queues the current search results and starts playback immediately, updating the PlayerFooter bar.
- **AC-8**: Clicking the clear button or pressing the Escape key clears the search input, refocuses the search bar, and restores the initial Explore genre grid.
- **AC-9**: When a query yields zero matches across all categories, a helpful empty state renders displaying the searched term in quotes, spelling tips, and quick jump buttons to top genres.
- **AC-10**: Successfully entered search queries are remembered in recent search chips up to a maximum of six entries, and clicking any recent chip re applies that search term.

## Feature design

**Data model sketch**:

```typescript
export interface GenreCard {
  id: string;
  name: string;
  slug: string;
  colorGradient: string;
  accentColor: string;
  icon: string;
  trackCount: number;
  coverUrl?: string;
}

export interface AlbumCard {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  coverUrl: string;
  trackCount: number;
  tracks: Track[];
}

export interface ArtistCard {
  id: string;
  name: string;
  avatarUrl: string;
  followersCount: number;
  monthlyListeners: number;
  popularTracks: Track[];
}

export interface SearchResults {
  query: string;
  tracks: Track[];
  albums: AlbumCard[];
  artists: ArtistCard[];
  genres: GenreCard[];
  totalMatches: number;
}

export type SearchCategory = "all" | "songs" | "albums" | "artists" | "genres";

export interface SearchState {
  query: string;
  activeCategory: SearchCategory;
  recentSearches: string[];
  isSearching: boolean;
  results: SearchResults;
  setQuery: (query: string) => void;
  setCategory: (category: SearchCategory) => void;
  clearSearch: () => void;
  selectGenre: (genre: GenreCard) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}
```

**State transitions**:

1. `Idle (Empty Query)`: renders SearchBar with recent search chips and ExploreGenresGrid.
2. `Debouncing`: user types in SearchBar, local input updates immediately, search filtering triggers after 150 milliseconds.
3. `Filtering Active`: query matches items, displays CategorizedResults matching activeCategory.
4. `Zero Matches`: query has no matching records in any category, renders EmptySearchState with suggestions.
5. `Reset`: clicking clear button or pressing Escape returns state to `Idle (Empty Query)`.

**API surface**:

| Function / Action | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `setQuery` | Store action | `query: string` | Updates query and filtered results | Public | None |
| `setCategory` | Store action | `category: SearchCategory` | Updates activeCategory view | Public | None |
| `clearSearch` | Store action | None | Resets query and restores Explore view | Public | None |
| `selectGenre` | Store action | `genre: GenreCard` | Sets query to genre name and filters | Public | None |
| `playTrack` | Player store | `track: Track, queue: Track[]` | Sets active playback and queue | Public | Missing track |
| `queueAlbum` | Player store | `album: AlbumCard` | Queues album tracks and starts track 1 | Public | Empty album |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Typing search query | Filtered songs list | Matching title, artist, album, or genre from fixtures |
| Typing search query | Filtered albums list | Matching title or artist from fixtures |
| Typing search query | Filtered artists list | Matching artist name from fixtures |
| Typing search query | Filtered genres list | Matching genre name or slug from fixtures |
| Typing search query | Total match counter | Sum of matched tracks, albums, artists, and genres |
| Clicking genre card | Query string and active category | GenreCard name and 'genres' category |
| Clicking recent chip | Search query value | RecentSearches array item |
| Clicking song play | Active track and playback queue | Track record and matching SearchResults tracks |

**Key invariants**:

- Search filtering is case insensitive and trims extraneous surrounding whitespace.
- Category pills always preserve the current query string when switching between categories.
- Recent search chips are deduplicated and limited to a maximum of six items, newest first.
- The escape key event listener clears query text only when the search input is focused or non empty.

**Security model**:

- The entire search and explore screen operates on local desktop memory and local mock fixtures in this phase.
- No network requests, external tracking, or remote search data transmission occurs.

**Configuration required**:

- None required for this client side mock phase.

**Critical test scenarios**:

- Happy path: Typing a query filters songs, albums, and artists, clicking Songs pill isolates song rows, double clicking a song starts playback, verifies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-7**.
- Explore flow: Opening search shows genre cards, clicking a genre card populates search and filters by genre, verifies **AC-2**, **AC-3**.
- Empty and reset: Typing a gibberish query shows empty state with tips, pressing Escape clears query and restores Explore view, verifies **AC-8**, **AC-9**.
- Recent queries: Entering searches adds deduplicated chips, clicking a chip re applies the search, verifies **AC-10**.

## Build plan

- [x] 1. Define search TypeScript interfaces in `src/types/search.ts` and rich mock fixtures for genres, albums, and artists in `src/data/searchFixtures.ts`, satisfies **AC-1**, **AC-2**, **AC-5**.
- [x] 2. Create the Zustand search store in `src/store/useSearchStore.ts` with debounced search filtering, category filtering, recent searches handling, and Explore genre selection, satisfies **AC-3**, **AC-4**, **AC-6**, **AC-8**, **AC-10**.
- [x] 3. Implement modular UI components in `src/components/search/` including `SearchBar.tsx`, `FilterPills.tsx`, `ExploreGenresGrid.tsx`, `CategorizedResults.tsx`, and `EmptySearchState.tsx`, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-7**, **AC-8**, **AC-9**.
- [x] 4. Assemble the complete view in `src/pages/Search.tsx` and connect the navigation in `src/App.tsx` so selecting Search opens this screen, satisfies **AC-1**, **AC-3**, **AC-7**.
- [x] 5. Write unit and integration tests in `src/test/search.test.tsx` verifying instant filtering, category switching, genre selection, playback triggering, and clear behavior, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-8**, **AC-9**.

## Consequences

**Positive**:

- Gives listeners an immediate, polished search and exploration experience matching the Midnight aesthetic.
- Feature folder structure under `src/components/search/` colocates components and prevents monolithic file growth.
- Clean separation between search state in `useSearchStore` and playback state in `usePlayerStore` keeps stores focused and easy to test.
- Prepares exact interfaces and data structures ready to wire into SQLite full text search indexing in Phase 2.

**Negative / tradeoffs**:

- Adds new mock fixtures and state management code that will eventually be backed by SQLite queries in Phase 2.

**Neutral**:

- Requires updating `App.tsx` navigation shell to render `Search.tsx` when activeNav equals Search.

## Follow-up

- [ ] Connect SQLite full text search indexing to `useSearchStore` in Phase 2 feature 16.
- [ ] Implement persistent local storage caching for recent search terms across app restarts.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
