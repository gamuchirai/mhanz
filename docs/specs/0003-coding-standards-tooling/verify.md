# Verify: Coding standards & tooling · spec 0003 · updated 2026-10-23

_Steps to confirm coding standards, linter, formatter, typecheck, and test commands._

## Commands

- [x] `npm run typecheck` → TypeScript compiles with zero errors → AC-1
- [x] `npm run lint` → ESLint runs clean across project sources → AC-2
- [x] `npm run format:check` → Prettier confirms all files match code style → AC-3
- [x] `npm test` → Vitest executes component and unit tests successfully → AC-4
- [x] `cargo fmt --check` → Rust code formatting matches style conventions → AC-5
- [x] `cargo clippy` → Clippy linter reports zero warnings or errors → AC-6
- [x] `cargo test` → Native engine tests compile and execute cleanly → AC-7

## Acceptance-criteria coverage

- AC-1 TypeScript type checking passes clean covered by step 1
- AC-2 ESLint code quality rules pass covered by step 2
- AC-3 Prettier formatting rules pass covered by step 3
- AC-4 Vitest frontend test suite passes covered by step 4
- AC-5 Rust formatting rules pass covered by step 5
- AC-6 Cargo clippy linter passes covered by step 6
- AC-7 Cargo test runner passes covered by step 7
