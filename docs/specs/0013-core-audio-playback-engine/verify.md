# Verify: Core audio playback engine (spec 0013, created 2026-10-24)
_Steps derived from spec 0013 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Verification checklist

- [x] Inspect Cargo.toml dependencies, verifying Rodio 0.20 with default-features disabled and symphonia-all enabled, satisfies AC-1
- [x] Inspect Rust AudioEngine struct and Tauri managed state initialization in Tauri setup hook, satisfies AC-2
- [x] Verify audio_play_track command loads local MP3, FLAC, and WAV files, begins native audio output, and emits state change, satisfies AC-3
- [x] Verify transport commands audio_pause, audio_resume, and audio_stop control audio output and update playback state, satisfies AC-4
- [x] Verify audio_seek repositions playback smoothly without audio glitches, clamped between zero and total track duration, satisfies AC-5
- [x] Verify audio_set_volume and audio_set_muted adjust output gain between 0.0 and 1.0 and persist volume to SQLite player_settings, satisfies AC-6
- [x] Verify background progress thread emits audio:position events at 100 millisecond intervals while playing, satisfies AC-7
- [x] Verify engine emits audio:state-changed events on every state transition, updating UI presentation components, satisfies AC-8
- [x] Verify track natural completion emits audio:track-ended, triggering automatic advancement in Zustand queue store, satisfies AC-9
- [x] Verify missing or corrupted audio files emit audio:error with FILE_NOT_FOUND or DECODE_ERROR, resetting state safely, satisfies AC-10
- [x] Verify playback past thirty seconds increments play_count and updates last_played_at in SQLite database, satisfies AC-11
- [x] Verify frontend AudioService abstraction provides typed IPC calls and mock fallback for Vitest and browser dev, satisfies AC-12

## Commands

- [x] `cargo test` -> Rust unit and integration tests for audio engine, state transitions, and IPC commands pass cleanly -> AC-1 through AC-11
- [x] `cargo clippy -- -D warnings` -> Rust clippy linter passes with zero warnings -> AC-1 through AC-11
- [x] `cargo check` -> Rust compiler checks pass with zero errors -> AC-1 through AC-11
- [x] `npm test` -> Frontend TypeScript AudioService and store unit tests pass cleanly -> AC-12
- [x] `npx tsc --noEmit` -> TypeScript types compile cleanly with zero errors -> AC-12

## Acceptance criteria coverage

- AC-1: Cargo configuration covered by dependency inspection and `cargo check`
- AC-2: Native AudioEngine lifecycle covered by Rust state initialization tests
- AC-3: File playback command covered by audio playback integration tests
- AC-4: Transport control commands covered by pause, resume, and stop command tests
- AC-5: Seek functionality covered by seeking tests and position verification
- AC-6: Volume control covered by volume tests and SQLite persistence tests
- AC-7: Position stream covered by periodic event tests
- AC-8: State transitions covered by state changed event listener tests
- AC-9: Track completion covered by track ended event and queue advance tests
- AC-10: Error handling covered by non existent file and invalid decoder tests
- AC-11: Play count updates covered by milestone duration tests in SQLite
- AC-12: AudioService abstraction covered by Vitest frontend test suite
