# Verify: gapless track transitions · spec 0026 · updated 2026-11-07
_Steps derived from spec 0026 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Play a continuous two track album or classical movement to the boundary → second track starts with zero audible silence in output → AC-1, AC-2, AC-4
- [x] Observe playback timeline at boundary → current time resets to 0:00 and active track metadata updates without a manual play round trip → AC-4
- [x] Play queue with next track candidate → inspect native engine log to confirm next track decoded off interface thread when 10 seconds or less remain → AC-3, AC-10
- [x] Provide corrupt or missing file as upcoming track in queue → playback skips to following valid track without stopping, and displays a 5 second toast notice → AC-5
- [x] Seek playback position within the 10 second staging window → verify staged next track remains ready and handover occurs without silence → AC-6
- [x] Seek playback position backwards outside the 10 second window → verify staged track is cleared and restaged when playback re-enters window → AC-6
- [x] Enable repeat-one on active track → observe boundary handover loops same track with zero silence → AC-7
- [x] Enable repeat-all at last track of queue → observe boundary handover loops back to first track with zero silence → AC-7
- [x] Let queue play to end with repeat-off → observe playback stops cleanly and audio:track-ended is emitted → AC-8
- [x] Queue tracks of differing sample rates (e.g. 44.1kHz and 48kHz) or channels → verify uniform source conversion produces seamless transition without audio glitches → AC-10
- [x] Reorder upcoming queue items or toggle shuffle → verify queue generation counter increments and stale candidate staging is discarded → AC-10

## Commands
- [x] `cargo test --manifest-path src-tauri/Cargo.toml --lib audio::tests` → all 8 native engine tests pass → AC-1, AC-3, AC-10
- [x] `npm test src/test/gaplessPlayback.test.tsx -- --run` → all 6 store and service integration tests pass → AC-1, AC-2, AC-4, AC-5, AC-7, AC-8, AC-10
- [x] `npx tsc --noEmit` → TypeScript compiler passes with zero diagnostic errors → AC-4

## Acceptance-criteria coverage
- AC-1: covered by step 1, 12, 13
- AC-2: covered by step 1, 13
- AC-3: covered by step 3, 12
- AC-4: covered by step 1, 2, 13, 14
- AC-5: covered by step 4, 13
- AC-6: covered by step 5, 6
- AC-7: covered by step 7, 8, 13
- AC-8: covered by step 9, 13
- AC-9: covered by step 1
- AC-10: covered by step 3, 10, 11, 12, 13
