# Verify: Stack & architecture · spec 0001 · updated 2026-10-22
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open the application in the browser at `http://localhost:1420` -> renders the Midnight dark theme, sidebar navigation, album grid, and bottom player bar -> AC-1
- [x] Click the play/pause button in the player bar or hero showcase -> toggles play/pause state and active indicators -> AC-2

## Commands
- [x] `npm run build` -> compiles TypeScript and bundles Vite production assets cleanly with zero errors -> AC-3
- [x] `npm run dev` -> starts the Vite local development server on port 1420 -> AC-4
- [ ] `npm run tauri dev` (with Rust installed) -> launches the native desktop window shell with Edge WebView2 -> AC-5

## Acceptance-criteria coverage
- AC-1 (Midnight UI shell rendered) covered by UI step 1
- AC-2 (Interactive player controls) covered by UI step 2
- AC-3 (Build and typecheck clean) covered by Command step 1
- AC-4 (Vite dev server boots on port 1420) covered by Command step 2
- AC-5 (Tauri boots desktop window) covered by Command step 3
