# 0001. Stack and Architecture

**Date**: 2026-10-22
**Status**: Accepted

## Summary

This decision defines the foundational technology stack and architecture for Mumhanzi, a lightweight modern desktop music player. We choose Tauri v2 with Rust for the native desktop core and audio engine, paired with React 19, TypeScript, Vite, and Tailwind CSS v4 for the Midnight dark UI. This foundation provides native audio playback performance, minimal memory usage, and instant local library indexing while preserving rapid web front end development.

## Decision

**Chosen option**: Option 1: Tauri v2 with Rust, React 19, Tailwind CSS v4, and SQLite

We select Tauri v2 with Rust for the desktop engine and audio pipeline, paired with React 19, TypeScript, Vite, and Tailwind CSS v4 for the user interface.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`)

## Proposed stack

| Layer                     | Choice                                         | Reason                                                                                              |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Desktop runtime           | Tauri v2                                       | Native window shell with system webview, providing minimal memory footprint (basis: tauri.app)      |
| Core backend              | Rust                                           | Memory safety, zero cost abstractions, and direct hardware audio access                             |
| Front end package manager | npm                                            | Standard with Node.js, zero extra global tooling required                                           |
| Front end framework       | React 19 with TypeScript and Vite              | Declarative component hierarchy with fast hot module replacement                                    |
| Styling system            | Tailwind CSS v4                                | Utility styling directly mapped to Midnight dark theme tokens                                       |
| Window management         | tauri-plugin-single-instance                   | Prevents duplicate instances competing for audio output and focuses active window                   |
| Client state              | Zustand                                        | Lightweight store with subscriptions accessible outside React render cycles                         |
| IPC bridge                | Tauri Commands and Tauri Events                | Commands for request actions, Events for streaming audio progress updates                           |
| Audio engine              | Rodio (0.20+) with symphonia-all feature       | Pure Rust playback engine decoding MP3, FLAC, M4A, OGG, and WAV (basis: github.com/RustAudio/rodio) |
| Metadata parser           | Lofty (0.25+)                                  | Unified audio tag and embedded cover art extraction (basis: github.com/Serial-ATA/lofty-rs)         |
| Primary database          | SQLite via rusqlite with connection pool       | High speed indexed relational queries and low memory overhead                                       |
| Schema migrations         | rusqlite_migration                             | Declarative embedded SQL migrations executed automatically at startup                               |
| Library scanner           | walkdir with lofty on background worker thread | Recursive folder traversal without blocking audio or user interface                                 |
| File change watcher       | notify crate                                   | Automatic detection of added or removed tracks in configured music folders                          |
| Artwork cache             | Local disk cache in app cache directory        | Image files written to disk and referenced by file path in SQLite                                   |
| Type synchronization      | tauri-specta or ts-rs                          | Automatically generates TypeScript definitions from Rust structs during build                       |
| Logging & diagnostics     | tracing with tauri-plugin-log                  | Unified structured logging across Rust backend and webview layers                                   |
| Automated testing         | cargo test, Vitest, and React Testing Library  | Full test coverage across audio logic, database queries, and UI components                          |

## Consequences

**Positive**:

- Extremely low idle resource footprint, fitting modern lightweight desktop app expectations
- Audio playback stays completely isolated from UI rendering and garbage collection pauses
- High speed local music indexing and sub fifty millisecond search responses across thousands of songs
- Component structure and design tokens directly ported from the Midnight prototype

**Negative / tradeoffs**:

- Developers must maintain Rust code alongside TypeScript code
- Cross compiling release binaries for other operating systems requires platform build environments

**Neutral**:

- Project structure divides cleanly into `src-tauri/` for native code and `src/` for front end assets
- Extracted cover art occupies local disk cache storage in user application data

## Follow-up

- [ ] Capture stack conventions and tooling choices into root AGENTS.md during Feature 2 (/audit)
- [ ] Investigate Windows System Media Transport Controls (SMTC) crate integration when implementing deferred media key support
