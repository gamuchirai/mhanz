# Verify: app branding & logo integration (spec 0018)

## UI and manual checks

- [x] Expanded sidebar brand display: at viewport width greater than or equal to 1024px, the sidebar renders primary-dark.svg brand lockup with alt "Mutinhimira" and data-testid "brand-logo-expanded" (AC-2)
- [x] Collapsed sidebar rail brand display: at viewport width below 1024px, the sidebar collapses to a 68px rail and renders standalone-dark.svg symbol with alt "Mutinhimira symbol" and data-testid "brand-logo-collapsed" at 28px width and height without overflow (AC-3)
- [x] Document favicon: index.html links /logos/standalone-dark.svg with type image/svg+xml replacing the placeholder vite favicon (AC-4)
- [x] Native desktop application icons: generated icons present in src-tauri/icons/ including icon.ico, icon.icns, 32x32.png, 128x128.png, 128x128@2x.png, and Windows Store square logos (AC-5)
- [x] Desktop application configuration: tauri.conf.json points to the updated icon bundle and retains Mutinhimira window title (AC-6)

## Commands

- [x] `npm test src/test/responsive.test.tsx`: responsive brand assertions pass cleanly (AC-7)
- [x] `npm test`: all 15 test suites and 159 tests pass cleanly (AC-7)
- [x] `npm run typecheck`: TypeScript compiles with zero errors
- [x] `npm run build`: production bundle builds cleanly
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`: Tauri Rust backend passes with zero errors (AC-6)
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`: all native tests pass cleanly

## Acceptance criteria coverage

- AC-1 Normalized kebab case logos placed in public/logos/: met
- AC-2 Expanded navigation sidebar renders primary-dark.svg: met
- AC-3 Collapsed navigation sidebar renders standalone-dark.svg emblem: met
- AC-4 Document favicon links standalone-dark.svg: met
- AC-5 Tauri desktop icons generated from vector master SVG: met
- AC-6 Tauri bundle configuration points to icons and sets window title: met
- AC-7 Responsive test suite updated and passing: met
