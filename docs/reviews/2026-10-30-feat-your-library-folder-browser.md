# Review, feat/your-library-folder-browser, 2026-10-30

**Reviewed by**: Gemini Pro (author on Gemini 3.8 Flash)
**Scope**: 24 files, feat/your-library-folder-browser vs main
**Verdict**: Changes requested

## Summary
This pull request introduces native directory selection for the library folder browser using tauri-plugin-dialog, resolving finding F-1. It provides both a direct folder picker card and a browse button beside the custom path input, with informative web preview fallback. Two major issues require resolution before merge: removing the Windows manifest generation in build.rs breaks the cargo test suite with entrypoint failure, and database errors during folder addition silently fall through to mock in memory state.

## Major
### 🟠 Manifest removal breaks native test runner on Windows, `src-tauri/build.rs:1`
**Problem**: The build script removed the Windows manifest generation logic that links Microsoft Common Controls version 6. Because this pull request adds tauri-plugin-dialog, the crate brings in the rfd dependency, which dynamically links the Windows function TaskDialogIndirect from comctl32.dll. Without the Common Controls version 6 manifest, Windows loads version 5 of comctl32.dll, which does not export this symbol. Running `cargo test` now fails immediately at startup with exit code `0xc0000139` (STATUS_ENTRYPOINT_NOT_FOUND).
**Why it matters**: The native testing gate specified in AGENTS.md (`cargo test`) fails completely on Windows environments. Developers and automated test pipelines cannot run Rust unit tests.
**Suggested fix**: Restore the Windows resource compilation step in `src-tauri/build.rs` to generate and link the Common Controls version 6 application manifest for library and test builds when compiling on Windows.

### 🟠 Desktop database error falls through to browser mock fallback, `src/store/useLibraryStore.ts:178`
**Problem**: In `addFolder`, when running inside the desktop runtime (`isTauri()`), calling `dbAddFolder(normalizedPath)` is wrapped in a try block. When this database call throws an error, the catch block logs the error to console and execution falls through to the mock browser fallback. That fallback creates a mock in memory folder object, appends it to state, and closes the modal.
**Why it matters**: If adding a directory fails in the desktop application (for example, when a directory does not exist or database constraints fail), the user is misled into thinking the folder was indexed. Because nothing was written to SQLite, the folder disappears on the next restart or database refresh.
**Suggested fix**: In `addFolder`, prevent execution from proceeding into the mock browser fallback when `isTauri()` is true. Surface the error to the caller or update state so the user receives clear feedback that adding the folder failed.

## Minor
### 🟡 Native dialog plugin imported directly in presentation layer, `src/components/library/FolderSelectionModal.tsx:3`
**Problem**: `FolderSelectionModal.tsx` imports `open` from `@tauri-apps/plugin-dialog` directly to implement custom path browsing, and `src/store/useLibraryStore.ts` also imports it directly. Both call `openDialog` with identical configuration options and duplicate path parsing logic.
**Why it matters**: AGENTS.md requires Clean Architecture separation where presentation and application layers depend on infrastructure interfaces rather than direct plugin bindings. Duplicating native dialog logic across components and stores increases coupling and complicates testing.
**Suggested fix**: Create an infrastructure service such as `src/services/dialog.ts` that encapsulates native dialog calls and path extraction, and use that service in both the store and the modal component.

### 🟡 Missing disabled and pending state on custom path browse button, `src/components/library/FolderSelectionModal.tsx:491`
**Problem**: The primary native folder picker card sets picking state, disables itself, updates its button text to Opening, and sets a wait cursor. The secondary browse button next to the custom path text input provides no loading indicator or disabled state while the native dialog is active.
**Why it matters**: Repeatedly clicking the browse button while the operating system picker window initializes can trigger duplicate dialog requests or cause user confusion.
**Suggested fix**: Track browsing state for the custom path browse button and disable it while the directory dialog is open.

### 🟡 Silent failure propagation in native folder picker action, `src/store/useLibraryStore.ts:223`
**Problem**: In `pickAndAddFolder`, `addFolder` is called with an empty mock tracks list. If `addFolder` encounters an error, it does not throw or return a status indicator, and `pickAndAddFolder` returns the chosen path string regardless of whether database insertion succeeded.
**Why it matters**: The modal component treats any non null return string as success and closes the modal immediately, giving the user no notification that folder addition failed.
**Suggested fix**: Update `addFolder` to return a boolean indicating success, and only return the chosen path from `pickAndAddFolder` when database addition succeeds.

## Nits
- ⚪ `src-tauri/src/db/connection.rs:111`, renaming the database file to lowercase `mutinhimira.db` without migration logic will cause existing database files to be missed on case sensitive file systems.
- ⚪ `src/components/library/FolderSelectionModal.tsx:133`, heavy use of inline style objects in the modal container and buttons should be replaced with Tailwind CSS utility classes and theme tokens.

## Strengths
- Resolves finding F-1 by providing native system directory selection inside Tauri desktop mode.
- Offers two intuitive entry points for folder selection: a prominent primary action card and a secondary browse button beside the custom path input.
- Handles web preview mode gracefully by detecting `isTauri()` and showing an explanatory status notice alongside preset demo collections.
- Comprehensive Vitest test suite in `src/test/libraryFolderPicker.test.tsx` verifying native dialog invocation, user cancellation, path population, and web fallback behavior.
- Clean Tauri v2 capability configuration adding `dialog:default` in `src-tauri/capabilities/default.json` and registering `tauri-plugin-dialog` in `src-tauri/src/lib.rs`.
- Normalizes package and crate names to lowercase, adhering to Cargo naming standards.

## Test coverage
The Vitest test suite provides thorough coverage for the frontend additions. The new test file `src/test/libraryFolderPicker.test.tsx` contains 4 tests that verify opening the native directory picker, user cancellation handling, path extraction into custom inputs, and web preview fallback. All 163 Vitest tests pass cleanly. However, native engine tests are currently blocked because `cargo test` fails to run on Windows due to the missing Common Controls version 6 manifest. Additionally, frontend error paths such as rejected dialog promises and failed database insertions remain untested.
