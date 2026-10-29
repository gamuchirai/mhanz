# 0018. App Branding and Logo Integration: Rationale

## Context

Mutinhimira is designed as a desktop music player combining modern performance with a dark Midnight visual theme. During initial project scaffolding, temporary visual placeholders were used: the navigation sidebar rendered a generic star icon with the uppercase word MIDNIGHT, the web document linked the standard Vite development icon, and the native desktop bundle used generic Tauri logo assets.

The user has now provided authentic Mutinhimira brand assets under `public/logos/`, including primary dark and light lockup SVGs, standalone symbol SVGs, high resolution PNGs, and square application icons.

Integrating these assets across the desktop application shell gives Mutinhimira its true identity, elevating visual polish across window chrome, operating system docks, taskbars, browser tabs, and navigation headers.

During cross check review, several critical details were identified and incorporated:
1. Icon generator input source: `app icon dark.png` is an ultra low resolution thumbnail of only 3.5 KB. Upscaling this file to 1024x1024 for macOS `.icns` or 310x310 for Windows AppX assets would cause severe pixelation or CLI failures. Because Tauri v2 natively accepts SVG inputs, passing `standalone-dark.svg` (which has a 2481x2481 square viewBox) generates crisp vector rasterizations at all OS resolutions.
2. Label in Name accessibility: The vector lockup explicitly spells "Mutinhimira", the Shona word for rhythm and sound, as the title theme of the Mutinhimira player. Assigning `alt="Mutinhimira by Mutinhimira"` preserves the visible wordmark for screen readers while attributing it to the application.
3. Test suite preservation: Existing responsive tests in `src/test/responsive.test.tsx` explicitly look for the string MIDNIGHT with class `max-lg:hidden`. Updating this assertion to use `data-testid` queries prevents automated test suite failures upon asset replacement.

## Options considered

### Option 1: Multi surface brand asset integration using vector SVGs for UI components, web favicon linkage, direct vector Tauri CLI OS icon generation, and refactored responsive test assertions (Recommended)

Normalize asset paths in `public/logos/` to clean kebab case names. Render `primary-dark.svg` in the expanded sidebar with aspect ratio preservation and `standalone-dark.svg` in the collapsed icon rail. Link `standalone-dark.svg` as the document favicon in `index.html`. Use the official Tauri CLI to generate native Windows `.ico`, macOS `.icns`, and Linux PNG icons directly from `standalone-dark.svg`. Update responsive test assertions.

**Pros**:

- Crisp, lossless vector rendering at all screen sizes and display scale factors.
- Native operating system icon generation produces pixel perfect high resolution icons up to 1024x1024 from vector master data.
- Eliminates URL encoding errors by providing clean kebab case file names.
- Zero extra runtime dependencies or JavaScript bundle overhead.
- Preserves accessibility and automated testing integrity.

**Cons**:

- Requires running the Tauri CLI tool once to generate icon assets.

### Option 2: Inline SVG symbols embedded directly into React components

Convert SVG source code directly into React JSX components or embed them inside an SVG sprite sheet in index.html, skipping static asset file links.

**Pros**:

- Embeds logo markup directly into JavaScript bundles without additional HTTP file fetches.

**Cons**:

- Increases JavaScript bundle size with large vector path data.
- Does not solve operating system desktop icons or browser favicon requirements.
- Difficult to update when brand artwork changes.

### Option 3: Raster PNG only integration using standard image tags across all surfaces

Use PNG files (`dark primary.png`, `dark icon.png`) across both UI components and desktop icons without vector SVGs.

**Pros**:

- Simple raster image handling.

**Cons**:

- Loss of visual sharpness and potential blurriness on high DPI monitors and 4K displays.
- Increased image file payload compared to compact vector SVGs.

## Rationale

Option 1 is selected because it delivers vector visual quality in the application shell while creating native platform icon packages for desktop distribution. Passing `standalone-dark.svg` to the Tauri icon generator guarantees that icons for all platforms remain sharp even on 4K monitors and high density retina displays.
