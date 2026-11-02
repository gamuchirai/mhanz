# Review: Universal Album and Artist Navigation Links, 2026-11-02

**Reviewed by**: Senior Software Engineer
**Scope**: 35 files, feat/universal-album-artist-navigation-links vs main
**Verdict**: Approved

## Summary

This pull request implements universal interactive navigation links for artist and album entities across all surfaces of the Mutinhimira desktop music player. It establishes reusable `ArtistLink` and `AlbumLink` components backed by the application orchestrator hook `useEntityNavigation`. When clicking or activating any artist or album name in track tables, media cards, the player footer, queue drawer, lyrics modal, or full screen views, the active overlay is dismissed cleanly and the user is routed to the corresponding artist profile or album detail screen. Disambiguation handles multiple albums with identical names using artist metadata, while collaboration tokens (such as `feat.`, `&`, `vs.`, and comma) are parsed into individual interactive links while preserving compound band names like "Earth, Wind & Fire". Unindexed entities route smoothly to the search screen with synchronized prefilled search queries, and placeholder names render as inert text without causing side effects.

## Strengths

* **Clean Architecture & Separation of Concerns**: The application logic in `useEntityNavigation` isolates navigation state coordination, overlay teardown (`useOverlayStore.closeOverlay()`), and entity resolution away from presentation components.
* **Collaboration & Compound Name Resilience**: The tokenization in `ArtistLink` matches against known artist catalog fixtures and database entries before falling back to delimiter splitting (`&`, `ft.`, `feat.`, `vs.`, `,`), ensuring compound names are preserved while multi-artist collaborations split into individually clickable links.
* **Event Propagation & Keyboard Accessibility**: Both `ArtistLink` and `AlbumLink` employ `stopPropagation()` on `click` and `doubleClick`, completely preventing row selection or playback invocation when clicking links in table rows. Full keyboard accessibility (`Enter` and `Space`) and screen-reader accessible labels (`role="link"`) ensure WCAG compliance.
* **Search Route Synchronization**: When fallback search navigation occurs, `useNavigationStore` route parameters and `useSearchStore` reactive query states are updated synchronously with reactive effects in `Search.tsx`, guaranteeing instantaneous search execution without requiring manual user input.
* **Store Hydration Resilience**: If navigation is triggered during application startup while stores are actively hydrating from SQLite, `useEntityNavigation` awaits store loading before resolving IDs.
* **Comprehensive Automated Tests**: 15 Vitest component and hook integration tests in `src/test/navigationLinks.test.tsx` cover all 10 acceptance criteria (AC-1 through AC-10).

## Nits

* ⚪ `src/hooks/useEntityNavigation.ts:63`: Store hydration check uses a small timeout interval poll (50ms with 3s ceiling). In future architectural updates, an event driven reactive subscriber pattern (e.g., Zustand `subscribe`) could replace interval polling.
* ⚪ `src/components/common/ArtistLink.tsx:92`: Collaboration splitting treats slash `/` as a delimiter if passed in metadata. Edge cases with band names featuring slashes (e.g., `AC/DC`) are handled if the full name exists in the artist store, though slash matching can be fine-tuned if unindexed slash names arise.

## Test Coverage

Both backend and frontend test suites pass with zero failures:
* `npx vitest run src/test/navigationLinks.test.tsx` passes 15 integration tests covering navigation routing, album disambiguation, fallback search, keyboard events, double-click suppression, overlay closure, and collaboration parsing.
* Full application test suite (`npm test`) passes 22 test files and 275 tests cleanly.
* Native Rust test suite (`cargo test --manifest-path src-tauri/Cargo.toml`) passes all 30 tests cleanly.
