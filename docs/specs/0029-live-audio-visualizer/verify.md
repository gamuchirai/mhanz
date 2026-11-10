# Verify: Live audio visualizer · spec 0029 · updated 2026-11-10
_Steps derived from spec 0029 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open Now Playing fullscreen (`V` key or click thumbnail), switch to Visualizer mode with `bars` style → expect 32 bars actively animating in sync with audio output → AC-1
- [x] Switch to `wave` style → expect waveform curve heights and control points modulated by low, mid, and high frequency averages → AC-1
- [x] Pause playback → expect canvas animations to decay smoothly to baseline without freezing on last peak or fabricating nonzero mock frames → AC-3
- [x] Mute audio via `M` shortcut or volume slider → expect visualizer bands to drop to 0 → AC-3
- [x] Set Visualizer style to `Off` in settings → expect clear disabled notice explaining how to enable, with a working Return to Artwork action → AC-1, AC-4
- [x] Disconnect or corrupt stream → expect Live visualizer unavailable view with functional Retry and Return to Artwork buttons → AC-5
- [x] Seek track position or trigger gapless next track transition → expect transition watchdog pause avoiding false error triggers → AC-5

## Commands
- [x] `cargo test --lib -- audio::tests::test_spectrum_tap_source_and_packing` → verifies nonallocating PCM tap, atomic volume/mute packing, and sample buffer gating → AC-1, AC-3, AC-6
- [x] `cargo clippy -- -D warnings` → passes clean with zero warnings → AC-3
- [x] `cargo fmt --check` → passes clean → AC-3
- [x] `npm test -- src/test/visualizer.test.tsx --run` → verifies component states (off, starting, active, unavailable, retry) and streaming service lifecycle → AC-1, AC-2, AC-4, AC-5
- [x] `npm run build` → verifies TypeScript compilation and Vite production bundling clean → AC-1, AC-2

## Acceptance-criteria coverage
- AC-1: Covered by manual bars/wave checks and Vitest frame tests
- AC-2: Covered by start/stop streaming commands and channel lifecycle in `useSpectrumAnalysis`
- AC-3: Covered by `test_spectrum_tap_source_and_packing` in Rust, pause decay test, and mute zeroing
- AC-4: Covered by `Off` state UI test and accessible Return to Artwork button
- AC-5: Covered by unavailable error state, retry button, and watchdog pause in hook
- AC-6: Covered by in memory buffer implementation with no database or remote storage

