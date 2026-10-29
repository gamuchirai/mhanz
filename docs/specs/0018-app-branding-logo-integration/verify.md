# Verification Steps: App Branding and Logo Integration

This document defines automated and manual verification procedures for Spec 0018 (App Branding and Logo Integration).

## Automated Verification

Run the test suite and quality gates from the repository root:

```bash
# 1. Run the navigation and responsiveness test suites
npm test src/test/responsive.test.tsx

# 2. Run the full unit and component test suite
npm test

# 3. Validate TypeScript type safety
npm run typecheck

# 4. Verify production bundle build
npm run build

# 5. Verify Tauri desktop compilation and configuration
cargo check --manifest-path src-tauri/Cargo.toml
```

### Expected Automated Outcomes

- `src/test/responsive.test.tsx` passes cleanly, verifying that `brand-logo-expanded` carries `max-lg:hidden` and `brand-logo-collapsed` carries `hidden max-lg:block`.
- Full test run passes all test suites cleanly.
- Typecheck completes with zero diagnostic errors.
- Production client bundle compiles without broken asset references.
- Cargo check passes with zero compilation errors.

## Manual UI Verification

Launch the desktop development environment:

```bash
npm run tauri dev
```

### 1. Expanded Sidebar Brand Display (AC-2)
1. Launch the application on a desktop screen with width greater than 1024px.
2. Confirm the navigation sidebar brand header at top displays the full Mumhanzi primary dark logo lockup.
3. Confirm the logo renders cleanly with proper spacing and transparent background against the dark sidebar.
4. Confirm no visual artifacts, clipping, or placeholder text appears.

### 2. Collapsed Sidebar Rail Brand Display (AC-3)
1. Resize the application window to a width narrower than 1024px.
2. Confirm the sidebar collapses to a 68px icon rail.
3. Confirm the brand header switches smoothly to the standalone Mumhanzi symbol centered at 28px.
4. Confirm text labels are completely hidden and no horizontal scrollbar or overflow appears.

### 3. Document Favicon Verification (AC-4)
1. Run `npm run dev` and open the app in a web browser.
2. Observe the browser tab icon.
3. Confirm the tab icon displays the standalone Mumhanzi symbol rather than the default Vite logo.

### 4. Native Desktop Application Icons (AC-5, AC-6)
1. Check the Windows taskbar, macOS dock, or Linux desktop launcher when Mumhanzi is running.
2. Confirm the operating system displays the official Mumhanzi dark app icon rather than the default Tauri placeholder icon.
3. Check the application window title bar icon to ensure crisp rendering.
