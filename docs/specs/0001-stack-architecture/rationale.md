# 0001. Stack and Architecture: Rationale

## Context

Mumhanzi is designed as a local music player inspired by Windows Groove Music and the Midnight UI aesthetic. A music player has distinct operational and performance constraints compared to typical web applications. 

First, audio playback requires glitch free streaming (steady continuous sound output without pauses or stuttering) and low latency controls (immediate response when a user pauses, skips, or seeks). Doing audio processing in a standard web browser sandbox or heavy runtime often leads to buffer underruns, high memory consumption, and stutter during intensive garbage collection cycles.

Second, scanning a local music collection of thousands of tracks requires fast disk access, efficient audio file tag extraction (reading artist, album, and duration metadata), and rapid local database writes. Doing this entirely in a JavaScript runtime introduces unnecessary serialization overhead and memory bloat.

Third, the visual presentation calls for a rich, dark, refined desktop experience with custom title bars, responsive grid layouts, and smooth animations. Developing desktop UI natively in platform specific toolkits (such as WinUI or AppKit) multiplies implementation effort and slows down rapid layout iteration.

The application must run locally on consumer computers without requiring cloud servers, subscriptions, or external accounts. The architecture must keep system memory usage low while delivering immediate library filtering and fluid playback response.

## Options considered

### Option 1: Tauri v2 with Rust, React 19, Tailwind CSS v4, and SQLite

This option combines a native Rust core for low level system tasks with a lightweight webview front end built using React 19 and Vite. Rust manages audio decoding, device output, file system indexing, and direct database queries. The webview only renders the UI and communicates with Rust via typed IPC (inter process communication).

**Pros**:
- Tiny application bundle size and low memory consumption compared to runtime bundled shells (basis: official Tauri benchmarks)
- Pure Rust audio engine using Rodio and CPAL runs on dedicated threads, avoiding webview UI thread blocking
- Rich UI styling using Tailwind CSS v4 mapped directly to Midnight color tokens
- Direct, high speed SQLite access through rusqlite for instant local search

**Cons**:
- Requires Rust tooling and knowledge for backend capabilities and native dependencies

### Option 2: Electron with Node.js, React, and SQLite

This option packages a full Chromium browser and Node.js runtime inside the desktop application distribution.

**Pros**:
- Familiar all JavaScript ecosystem across both front end and backend layers
- Extensive Node.js desktop ecosystem and ready made packaging tools

**Cons**:
- Substantially higher memory footprint (often 150MB to 300MB at idle) (basis: desktop runtime resource studies)
- Audio playback and heavy tag scanning risk fighting the Node event loop and garbage collector
- Large installer and binary download size

### Option 3: Tauri v2 with Vanilla TypeScript and SQLite

This option pairs Tauri v2 with plain TypeScript and standard Web Components, omitting a front end framework.

**Pros**:
- Smallest possible webview bundle with zero framework runtime overhead
- Complete direct control over DOM elements

**Cons**:
- Higher implementation friction for complex UI state, track tables, and reactive view updates
- Lacks the component ecosystem and declarative component model of React 19

## Rationale

Tauri v2 gives Mumhanzi the responsiveness and lightweight footprint expected of a native utility (basis: your scope.md foundation intent). By offloading audio playback to Rodio on a dedicated Rust background thread, playback never stutters when the user navigates heavy playlist views or runs full text searches (basis: dedicated audio worker thread pattern).

React 19 with Vite provides the ideal balance between developer velocity and component structure, matching the existing Midnight prototype in demo-ui. Tailwind CSS v4 allows seamless mapping of the custom Midnight theme tokens into concise utility classes without complex build step configuration (basis: tailwind-4-docs conventions).

SQLite accessed via rusqlite in Rust gives ACID guarantees (reliable data transactions that never corrupt state) and microsecond index queries for large local track collections (basis: relational database default for structured entities).

## References

**Project sources**:
- docs/scope/scope.md, Feature 1 Stack & architecture
- demo-ui/Main.dc.html, Midnight UI reference prototype

**Practices & standards**:
- Dedicated audio worker thread pattern to isolate audio I/O from UI rendering
- Embedded SQLite migrations with declarative version tracking
- Relational database default for structured local music catalogs

**Links**:
- Tauri v2: https://tauri.app
- Tauri Plugins: https://github.com/tauri-apps/plugins-workspace
- Rodio audio engine: https://github.com/RustAudio/rodio
- Lofty audio metadata: https://github.com/Serial-ATA/lofty-rs
- Symphonia decoders: https://github.com/pdeljanov/Symphonia
