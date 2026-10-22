# Scope: Mumhanzi

A lightweight, modern desktop music player inspired by Windows Groove Music and the Midnight UI design, built with Tauri, Rust, Vite, and TypeScript.

**Build approach:** Tracer Bullet (vertical slices; each feature built end to end through every layer, working).
**Workflow:** Beta (after /develop, /check verify then /test). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Data model | Foundation | planned |
| 4 | Design system & UI foundation | Foundation | planned |
| 5 | Core playback loop | Slice 1 | planned |
| 6 | Local library scanner | Slice 2 | planned |
| 7 | Playlists & favorites | Slice 3 | planned |
| 8 | Library search & filtering | Slice 4 | planned |

## Foundations

### 1. Stack & architecture · in-progress
Decide the Tauri, Rust, Vite, and TypeScript project structure, scaffold a runnable desktop application shell.
**Done when:** the stack is recorded in a spec, Tauri boots a desktop window running the Vite dev server, and cargo build succeeds.
spec [0001](../specs/0001-stack-architecture/index.md) · code in src/ and src-tauri/
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [ ] Verify it: `/check verify stack & architecture`
- [ ] Test it: `/test stack & architecture`

### 2. Coding standards & tooling
Capture conventions, then configure TypeScript checks, Rust clippy, formatting, and test commands from the scaffold.
**Done when:** root `AGENTS.md` reflects the project stack, and typecheck, lint, and formatting run clean.
- [ ] Capture conventions and tooling choices: `/audit`

### 3. Data model · needs a decision
Define core Rust and TypeScript entities for Track, Album, Artist, Playlist, and PlaybackState, plus SQLite schema and migrations.
**Done when:** database migrations create tables with indices for fast search, and Rust models serialize to TypeScript types cleanly.
- [ ] Design it (spec): `/architect data model`

### 4. Design system & UI foundation · needs a decision
Port the Midnight HTML layout and CSS styling from demo-ui into structured, reusable web components with theme tokens.
**Done when:** the desktop window renders the Midnight layout (collapsible sidebar, hero showcase, album grid, bottom player bar) with responsive scaling.
- [ ] Design it (spec): `/architect design system & UI foundation`

## Slice 1: Core playback loop

### 5. Core playback loop · needs a decision
Build the thin end to end playback thread from the player bar through Tauri IPC to the Rodio audio engine.
**Done when:** clicking play loads a local audio file, sound plays through the output device, playback progress updates the UI bar in real time, and pause, resume, seek, and volume controls work.
- [ ] Design it (spec): `/architect core playback loop`

## Slice 2: Local library scanner

### 6. Local library scanner · needs a decision
Scan music folders in a background thread, extract metadata and embedded cover art using lofty, and persist records to SQLite.
**Done when:** selecting a music folder recursively finds supported audio files, saves track tags and album art into SQLite, and populates the library view.
- [ ] Design it (spec): `/architect local library scanner`

## Slice 3: Playlists & favorites

### 7. Playlists & favorites · needs a decision
Create and manage user playlists, add or remove tracks, and toggle favorite songs with immediate SQLite persistence.
**Done when:** a user can create a playlist, add songs to it, reorder tracks, and see liked songs marked in the UI.
- [ ] Design it (spec): `/architect playlists & favorites`

## Slice 4: Library search & filtering

### 8. Library search & filtering · needs a decision
Filter the music collection instantly by title, artist, or album using indexed SQLite queries with debounced UI input.
**Done when:** typing in the search box updates the visible track and album list with matching results under fifty milliseconds.
- [ ] Design it (spec): `/architect library search & filtering`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Synchronized lyrics**: fetch and display timed lyrics beside the now playing hero · needs a decision
- **Audio equalizer**: multi band graphic equalizer and audio DSP filters in the Rodio pipeline · needs a decision
- **Operating system media keys**: integrate Windows system media transport controls and global shortcut keys · needs a decision
- **Mini player overlay**: compact picture in picture floating widget for background desktop listening · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier last stage (`Prototype` -> after `/develop`; `Alpha` -> after `/check verify`; `Beta`/`GA` -> after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec ## Build plan, not here**: the scope carries only the milestone rollup.
- **Status** `planned` -> `in-progress` -> `done`, plus `existing` (predating workflow) and `dropped` (dropped from scope, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature rigor above or below the project default; no tag inherits the default. It decides the feature check boxes and each skill next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
