# 0018. App Branding and Logo Integration

**Date**: 2026-10-29
**Status**: In Progress

## Summary

This specification defines the integration of official Mumhanzi brand assets across the desktop application. It replaces placeholder Midnight text and star icons with official vector logos in the navigation sidebar, supporting both the expanded 232px sidebar lockup and the collapsed 68px icon rail. It connects the standalone symbol as the document favicon in index.html, generates high resolution native desktop operating system icons directly from the master vector SVG through the Tauri CLI, establishes clean kebab case asset copies in public/logos, and updates the responsive test suite to ensure automated quality gates pass cleanly.

## Requirements

**User stories**:

- As a desktop music listener, I want to see the authentic Mumhanzi brand lockup in the sidebar so the application feels distinct, polished, and cohesive with the dark Midnight aesthetic.
- As a desktop music listener using a compact window or small screen, I want the collapsed navigation rail to display the standalone Mumhanzi symbol without clipped text or awkward wrapping.
- As a desktop user, I want the Mumhanzi icon to appear cleanly on my operating system taskbar, dock, application launcher, and window title bar at native retina resolutions.
- As a screen reader user, I want clear and distinct accessibility labels for the expanded lockup and compact emblem without duplicate image announcements.
- As a developer, I want public brand asset paths to use standardized kebab case file names without URL encoded spaces, and automated tests to validate brand responsiveness cleanly.

**Acceptance criteria**:

- **AC-1**: Standardized asset files with normalized kebab case naming (`primary-dark.svg`, `standalone-dark.svg`, `primary-light.svg`, `standalone-light.svg`) are placed in `public/logos/`.
- **AC-2**: Navigation sidebar header in expanded state (width 232px) displays the official `primary-dark.svg` brand lockup with `alt="Mutinhimira by Mumhanzi"` and `data-testid="brand-logo-expanded"`, replacing the placeholder `#star` SVG and `MIDNIGHT` text.
- **AC-3**: Navigation sidebar header in collapsed state (width 68px below 1024px) displays the `standalone-dark.svg` symbol with `alt="Mumhanzi symbol"` and `data-testid="brand-logo-collapsed"` centered at 28px width and height without text labels or overflow.
- **AC-4**: Document head in `index.html` links `/logos/standalone-dark.svg` as the application favicon with `type="image/svg+xml"`, replacing `/vite.svg`.
- **AC-5**: Tauri native desktop icons in `src-tauri/icons/` (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `128x128@2x.png`, and Windows Store square logo assets) are generated directly from the 2481x2481 vector master `public/logos/standalone-dark.svg` via `tauri icon` CLI, replacing default Tauri scaffold icons with crisp vector rasterizations.
- **AC-6**: Tauri configuration in `src-tauri/tauri.conf.json` correctly points to the updated desktop icon bundle and preserves window title as `Mumhanzi`.
- **AC-7**: Responsive test suite in `src/test/responsive.test.tsx` updates obsolete `MIDNIGHT` text queries to assert `max-lg:hidden` on `brand-logo-expanded` and `hidden max-lg:block` on `brand-logo-collapsed`, validating brand responsiveness with zero regressions.

## Decision

**Chosen option**: Option 1: Multi surface brand asset integration using vector SVGs for UI components, web favicon linkage, direct vector Tauri CLI OS icon generation, and refactored responsive test assertions.

We adopt official Mumhanzi brand assets across all shell surfaces. We maintain normalized kebab case asset files in `public/logos/`, render `primary-dark.svg` in the expanded sidebar header, render `standalone-dark.svg` in the collapsed icon rail, link `standalone-dark.svg` as the SVG favicon in `index.html`, generate complete platform icons directly from the vector master via the Tauri CLI into `src-tauri/icons/`, and update responsive test assertions to keep automated checks green.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Specification details

**Asset normalization in public/logos**:

To prevent URL encoding issues (such as `%20` in asset URLs) across Vite, browser views, and desktop bundle packaging, the following normalized file copies will exist in `public/logos/`:

- `public/logos/primary-dark.svg` (copied from `primary dark.svg`)
- `public/logos/standalone-dark.svg` (copied from `standalone dark symbol.svg`)
- `public/logos/primary-light.svg` (copied from `primary light.svg`)
- `public/logos/standalone-light.svg` (copied from `standalone light symbol.svg`)

**Sidebar component integration (src/components/layout/NavigationSidebar.tsx)**:

The brand header block at the top of the sidebar replaces the existing SVG star and MIDNIGHT text span:

```tsx
{/* Brand Header */}
<div className="flex flex-col items-center justify-center mb-7 px-2 transition-all">
  {/* Expanded Lockup: Full wordmark SVG visible on wide viewports (>=1024px) */}
  <img
    src="/logos/primary-dark.svg"
    alt="Mutinhimira by Mumhanzi"
    data-testid="brand-logo-expanded"
    className="h-8 w-auto aspect-[2206/499] max-lg:hidden object-contain select-none"
    draggable={false}
  />
  {/* Collapsed Symbol: Standalone emblem visible on compact rail (<1024px) */}
  <img
    src="/logos/standalone-dark.svg"
    alt="Mumhanzi symbol"
    data-testid="brand-logo-collapsed"
    className="w-7 h-7 hidden max-lg:block object-contain select-none"
    draggable={false}
  />
</div>
```

**Web document favicon (index.html)**:

Replace the scaffolded Vite icon link:

```html
<link rel="icon" type="image/svg+xml" href="/logos/standalone-dark.svg" />
```

**Native desktop bundle icon generation**:

Generate multi resolution platform icons directly from the pristine vector SVG master:

```bash
npm run tauri icon public/logos/standalone-dark.svg
```

This generates:
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.icns` (with full 1024x1024 layer)
- `src-tauri/icons/icon.ico` (with 256x256 layer)
- Windows AppX Store square logo assets up to 310x310

**Test suite migration (src/test/responsive.test.tsx)**:

Update the sidebar rail test from:

```tsx
// Obsolete assertion
const brandText = screen.getByText("MIDNIGHT");
expect(brandText.className).toContain("max-lg:hidden");
```

To the new brand element assertions:

```tsx
// Updated brand logo responsive assertion
const expandedLogo = screen.getByTestId("brand-logo-expanded");
expect(expandedLogo.className).toContain("max-lg:hidden");

const collapsedLogo = screen.getByTestId("brand-logo-collapsed");
expect(collapsedLogo.className).toContain("max-lg:block");
```

## Build plan

The build plan follows the project Facade approach (UI shell first with assets, verified across responsive breakpoints, followed by desktop build validation):

- [x] Milestone 1: Asset normalization in public/logos with clean kebab case copies (AC-1)
- [ ] Milestone 2: Navigation sidebar brand header integration with expanded and collapsed rail states (AC-2, AC-3)
- [ ] Milestone 3: Web document favicon linkage in index.html (AC-4)
- [ ] Milestone 4: Native desktop icon bundle generation via Tauri CLI from vector master (AC-5, AC-6)
- [ ] Milestone 5: Responsive test suite update and brand verification (AC-7)

## Consequences

- **Positive**: Cohesive visual identity across all desktop operating system surfaces and web views. Scalable vector graphics ensure sharp rendering on 1080p, 4K, and high density retina displays. Native platform icons generated from vector SVG master prevent pixelation. Distinct accessibility attributes prevent screen reader ambiguity and testing library collisions.
- **Negative**: Adds local image assets to the web bundle, requiring automated tests to mock or handle image loading.
- **Operational**: Future brand asset updates only require refreshing master files in `public/logos/` and running the icon generation command.

## Follow-up

- Consider adding an About Mumhanzi information card with version and logo emblem in a future Settings modal enhancement.
- If light theme support is introduced in the future, wire `primary-light.svg` and `standalone-light.svg` to active theme mode.
