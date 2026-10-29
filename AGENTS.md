# Mutinhimira

## Stack

- **Language / Runtime**: TypeScript 5.7, Node.js 20, Rust 2021
- **Framework**: Tauri v2, React 19, Vite 8
- **Key dependencies**: Tailwind CSS v4, Zustand 5, Rodio, Lofty, SQLite via rusqlite
- **Package manager**: npm, cargo

## Build approach

Facade (UI first clickable shell on placeholder data, then wire the backend).

## Git

- integration: on
- base-branch: main
- branch prefix: feat/
- commit: per-milestone
- merge-strategy: pull-request (never merge directly to main)
- pr-review: required (/check review before merge)

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Native desktop app
npm run tauri dev

# Build
npm run build
npm run tauri build

# Test
npm test
cargo test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Clean Architecture four layers: domain, application, infrastructure, presentation.
- Outer layers depend on inner layers, never the reverse. Domain has zero external imports.
- Use cases are thin orchestrators calling domain logic and infrastructure interfaces.
- Folder by feature: colocate components, hooks, and logic within feature directories.
- Strict type checking in TypeScript and Rust without any types or loose nulls.
- Named exports only, avoiding default exports in TypeScript files.
- Consistent naming conventions with PascalCase components and camelCase functions.
- Validate configuration and environment settings on application startup.
- Document public APIs with concise docstrings on shared functions.
- Conventional commit messages using standard prefixes like feat and fix.
- Always branch from latest main for any new feature; never commit directly to main.
- Deliver completed features via pull requests opened against main.
- An independent agent code review via /check review is required before merging any pull request.

## Tooling

- TypeScript lint and format: ESLint and Prettier
- Rust lint and format: cargo clippy and cargo fmt
- Testing gate: Vitest for UI and unit tests, cargo test for native engine
- Pre commit gate: lint, format, typecheck, and tests before commit
- Continuous integration: GitHub Actions check on push

## Agent skills

- [tauri-v2](.agents/skills/tauri-v2/): `nodnarbnitram/claude-code-extensions`, Tauri v2 desktop runtime and IPC conventions
- [tailwind-4-docs](.agents/skills/tailwind-4-docs/): `lombiq/tailwind-agent-skills`, Tailwind CSS v4 styling and theme tokens
- [vitest](.agents/skills/vitest/): `antfu/skills`, Vitest unit and integration test conventions
- [zustand](.agents/skills/zustand/): `pedronauck/skills`, Zustand store patterns and state management
- [rust-best-practices](.agents/skills/rust-best-practices/): `apollographql/skills`, Rust memory safety and idiomatic patterns
- [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React component composition and hook patterns

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
