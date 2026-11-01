# Verify: artists and artist profile persistence (spec 0021)

## UI / manual
- [ ] Boot application in desktop mode and navigate to Artists, observe real scanned artists loaded from SQLite with total play counts -> AC-1
- [ ] Open application in web browser environment, observe fallback to sample artist fixtures -> AC-2
- [ ] Open application with an empty music database, observe Midnight theme empty state card with guidance to scan folders -> AC-3
- [ ] Type into the search input or change sort options (popularity, name, album count), observe instant filtering and sorting in memory -> AC-4
- [ ] Verify that legacy follow buttons and simulated follower counts are removed from artist cards and hero banner -> AC-5
- [ ] Click any artist card in the overview grid, observe loading skeleton and on demand fetch of top tracks and discography albums without error flickers -> AC-6
- [ ] Observe artist profile view rendering top tracks, discography albums, and subtle fallback notice when biography is missing -> AC-7
- [ ] Click Play Artist Top Tracks or click an individual popular song, observe real audio file playback in player -> AC-8
- [ ] Click an album card in the artist discography, observe transition to Albums screen with that album active -> AC-9
- [ ] Toggle discography category filters, observe grouping of albums, singles (1 track), and EPs (2 to 3 tracks) -> AC-10
- [ ] Trigger a music library scan completion, observe automatic refresh of artists catalog from SQLite while preserving view -> AC-11
- [ ] Click the back button in the Artist Profile view, observe return to Artists overview grid with preserved scroll position -> AC-12

## Commands
- [ ] `cargo test` -> verify Rust catalog repository commands pass with total_plays query -> AC-1, AC-6
- [ ] `npm test src/test/artistsPersistence.test.tsx` -> verify artists persistence integration tests pass -> AC-1 through AC-12
- [ ] `npm test src/test/artists.test.tsx` -> verify artists UI component tests pass -> AC-3, AC-4, AC-5, AC-7, AC-10, AC-12
- [ ] `npm test` -> all frontend test suites pass -> AC-1 through AC-12
- [ ] `cargo clippy -- -D warnings` and `cargo fmt --check` -> Rust code passes with zero warnings
- [ ] `npm run build` and `npm run lint` -> TypeScript compiles and bundles cleanly

## Acceptance criteria coverage
- AC-1 Hydration of scanned artists from SQLite in desktop mode with total plays: built in useArtistStore.ts and catalog_repo.rs
- AC-2 Smooth fallback to sample artist fixtures in web browser: built in useArtistStore.ts
- AC-3 Midnight theme empty library notice when zero artists exist in SQLite: built in ArtistEmptyState.tsx
- AC-4 Fast in memory search and multi criteria sorting: built in useArtistStore.ts
- AC-5 Removal of legacy follow buttons and streaming follower metrics: built in ArtistCard.tsx and ArtistProfileBanner.tsx
- AC-6 On demand profile hydration via dbGetArtistProfile with loading state: built in useArtistStore.ts and Artists.tsx
- AC-7 Detailed profile rendering with top tracks, discography, and bio fallback: built in ArtistBioCard.tsx, ArtistPopularTracks.tsx
- AC-8 Top tracks audio playback queueing into player engine: built in useArtistStore.ts
- AC-9 Cross view navigation from artist discography to album detail: built in ArtistDiscography.tsx
- AC-10 Discography release filtering between albums, singles, and EPs: built in useArtistStore.ts and ArtistDiscography.tsx
- AC-11 Automatic catalog refresh upon scanner completion: built in useArtistStore.ts
- AC-12 Working back button navigation preserving scroll position: built in Artists.tsx
