# Verify: design system & navigation shell (spec 0019)

## UI and manual checks

- [x] Navigation history back button: clicking back in top nav moves to the previous view and restores parameters (AC-1, AC-2, AC-3)
- [x] Navigation history forward button: clicking forward in top nav steps forward through previously visited views (AC-4)
- [x] Boundary states: back button is disabled when at the beginning of history, and forward button is disabled at the end (AC-5)
- [x] Desktop keyboard shortcuts: pressing Alt+LeftArrow navigates back, and pressing Alt+RightArrow navigates forward (AC-3, AC-4)
- [x] Mouse navigation buttons: pressing mouse back button 4 navigates back, and button 5 navigates forward (AC-3, AC-4)
- [x] Design system tokens: Midnight colors and typography render consistently across shell elements (AC-6)
- [x] Shared UI primitives: Button, IconButton, Card, Badge, and TextInput render in primary, ghost, outline, and disabled states (AC-7)
- [x] Modular AppShell: navigation sidebar, top navigation bar, main view area, player footer, and overlay portals render smoothly on desktop resize (AC-8)

## Commands

- [x] `npm test src/test/navigation.test.tsx`: navigation store and component tests pass cleanly
- [x] `npm test`: all test suites pass cleanly
- [x] `npm run typecheck`: TypeScript compiles with zero errors
- [x] `npm run build`: production bundle builds cleanly

## Acceptance criteria coverage

- AC-1 Dedicated useNavigationStore with view selection, route params, and capped history: covered by src/store/useNavigationStore.ts and src/test/navigation.test.tsx
- AC-2 Navigation pushes new entries and clears forward history: covered by src/store/useNavigationStore.ts and src/test/navigation.test.tsx
- AC-3 Back button and Alt+LeftArrow navigation traversal: covered by src/components/layout/TopNavBar.tsx and src/test/navigation.test.tsx
- AC-4 Forward button and Alt+RightArrow navigation traversal: covered by src/components/layout/TopNavBar.tsx and src/test/navigation.test.tsx
- AC-5 Disabled button states at history boundaries: covered by src/components/layout/TopNavBar.tsx and src/test/navigation.test.tsx
- AC-6 Midnight theme tokens in Tailwind CSS v4 @theme: covered by src/index.css and src/test/navigation.test.tsx
- AC-7 Reusable UI component primitives in src/components/ui/: covered by src/components/ui/ and src/test/navigation.test.tsx
- AC-8 Modular AppShell layout container: covered by src/components/layout/AppShell.tsx, src/App.tsx, and src/test/navigation.test.tsx
