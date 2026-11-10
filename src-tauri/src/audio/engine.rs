//! Core audio playback engine utilizing Rodio with Symphonia decoders,
//! supporting gapless track transitions, background pre staging, and boundary tracking.

use std::collections::HashSet;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use rodio::source::{SeekError, UniformSourceIterator};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use tauri::{AppHandle, Emitter};

use crate::db::DatabaseManager;

use super::analyzer::{AnalysisState, AnalyzerConfig, SpectrumFrame};
use super::error::AudioError;
use super::models::{
    AudioPlaybackState, AudioPlaybackStateDto, AudioPositionDto, AudioTrackChangedDto,
    AudioTrackEndedDto, AudioTrackSkippedDto, NextTrackCandidate, PlaybackStatus,
};
use super::tap::{pack_gain_mute, SampleBuffer, SpectrumTapSource};

/// Whitelisted audio file extensions.
const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "flac", "wav", "m4a", "aac", "ogg", "opus"];

/// Boundary tracking source that monitors playback progress and flags track boundaries.
pub struct TrackBoundarySource<I> {
    inner: I,
    pub track_id: String,
    pub duration: f64,
    pub queue_generation: u64,
    pub samples_played: Arc<AtomicU64>,
    pub started: Arc<AtomicBool>,
    pub ended: Arc<AtomicBool>,
    pub channels: u16,
    pub sample_rate: u32,
    pub total_duration: Option<Duration>,
}

impl<I> TrackBoundarySource<I>
where
    I: Source,
    I::Item: rodio::Sample,
{
    pub fn new(
        inner: I,
        track_id: String,
        duration: f64,
        queue_generation: u64,
        samples_played: Arc<AtomicU64>,
        started: Arc<AtomicBool>,
        ended: Arc<AtomicBool>,
    ) -> Self {
        let channels = inner.channels();
        let sample_rate = inner.sample_rate();
        let total_duration = inner.total_duration();
        Self {
            inner,
            track_id,
            duration,
            queue_generation,
            samples_played,
            started,
            ended,
            channels,
            sample_rate,
            total_duration,
        }
    }
}

impl<I> Iterator for TrackBoundarySource<I>
where
    I: Source,
    I::Item: rodio::Sample,
{
    type Item = I::Item;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next();
        if sample.is_some() {
            if !self.started.load(Ordering::Relaxed) {
                self.started.store(true, Ordering::SeqCst);
            }
            self.samples_played.fetch_add(1, Ordering::Relaxed);
        } else if !self.ended.load(Ordering::Relaxed) {
            self.ended.store(true, Ordering::SeqCst);
        }
        sample
    }

    #[inline]
    fn size_hint(&self) -> (usize, Option<usize>) {
        self.inner.size_hint()
    }
}

impl<I> Source for TrackBoundarySource<I>
where
    I: Source + Send + 'static,
    I::Item: rodio::Sample + Send,
{
    #[inline]
    fn current_frame_len(&self) -> Option<usize> {
        self.inner.current_frame_len()
    }

    #[inline]
    fn channels(&self) -> u16 {
        self.channels
    }

    #[inline]
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    #[inline]
    fn total_duration(&self) -> Option<Duration> {
        self.total_duration
    }

    /// Forwards seeks to the wrapped source and keeps progress counters in sync.
    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.inner.try_seek(pos)?;
        let played = (pos.as_secs_f64() * self.sample_rate as f64 * self.channels as f64) as u64;
        self.samples_played.store(played, Ordering::SeqCst);
        Ok(())
    }
}

type StagedSource =
    TrackBoundarySource<SpectrumTapSource<UniformSourceIterator<Decoder<BufReader<File>>, i16>>>;

/// Metadata describing an active or queued boundary track.
#[derive(Clone)]
pub struct TrackPlaybackMetadata {
    pub track_id: String,
    pub file_path: String,
    pub duration_seconds: f64,
    pub queue_generation: u64,
    pub samples_played: Arc<AtomicU64>,
    pub started: Arc<AtomicBool>,
    pub ended: Arc<AtomicBool>,
    pub channels: u16,
    pub sample_rate: u32,
    pub context_title: Option<String>,
    pub context_type: Option<String>,
}

impl TrackPlaybackMetadata {
    pub fn current_position_seconds(&self) -> f64 {
        let count = self.samples_played.load(Ordering::Relaxed);
        let divisor = (self.sample_rate as f64) * (self.channels as f64);
        if divisor > 0.0 {
            (count as f64 / divisor).min(self.duration_seconds.max(0.0))
        } else {
            0.0
        }
    }
}

/// Inner mutable audio state protected by a Mutex.
pub struct AudioEngineInner {
    pub stream_handle: Option<OutputStreamHandle>,
    pub sink: Option<Sink>,
    pub state: AudioPlaybackState,
    pub queue_generation: u64,
    pub lookahead: Vec<NextTrackCandidate>,
    pub active_track_meta: Option<TrackPlaybackMetadata>,
    pub staged_track_meta: Option<TrackPlaybackMetadata>,
    pub output_sample_rate: u32,
    pub output_channels: u16,
    /// Candidates that failed to stage during the current queue generation; skipped on retry.
    pub failed_candidate_ids: HashSet<String>,
    /// Bumped whenever the sink is replaced, so in-flight staging jobs can detect they are stale.
    pub stage_epoch: u64,
}

/// Native desktop audio engine orchestrating Rodio playback, background progress,
/// gapless staging, track completion tracking, and milestone play count updates.
#[derive(Clone)]
pub struct AudioEngine {
    inner: Arc<Mutex<AudioEngineInner>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    db_manager: Arc<Mutex<Option<Arc<DatabaseManager>>>>,
    monitor_running: Arc<AtomicBool>,
    pub is_reloading: Arc<AtomicBool>,
    is_staging: Arc<AtomicBool>,
    /// Shared spectrum analysis state: tap gate, volume/mute packed atomic, and frame counter.
    pub analysis: AnalysisState,
}

/// Dedicated thread initialization that holds the Rodio OutputStream alive.
fn spawn_audio_stream() -> Option<OutputStreamHandle> {
    let (tx, rx) = std::sync::mpsc::channel();
    let spawn_result = thread::Builder::new()
        .name("mutinhimira-audio-output".to_string())
        .spawn(move || match OutputStream::try_default() {
            Ok((_stream, handle)) => {
                let _ = tx.send(Some(handle));
                loop {
                    thread::park();
                }
            }
            Err(err) => {
                eprintln!("[AudioEngine] Default audio device unavailable: {}", err);
                let _ = tx.send(None);
            }
        });

    if spawn_result.is_err() {
        return None;
    }

    rx.recv_timeout(Duration::from_millis(1500)).unwrap_or(None)
}

impl AudioEngine {
    /// Creates a new AudioEngine, initializing the default audio output device.
    pub fn new() -> Self {
        let stream_handle = spawn_audio_stream();

        let initial_state = AudioPlaybackState {
            volume: 0.8,
            is_muted: false,
            ..Default::default()
        };

        let inner = Arc::new(Mutex::new(AudioEngineInner {
            stream_handle,
            sink: None,
            state: initial_state.clone(),
            queue_generation: 0,
            lookahead: Vec::new(),
            active_track_meta: None,
            staged_track_meta: None,
            output_sample_rate: 44100,
            output_channels: 2,
            failed_candidate_ids: HashSet::new(),
            stage_epoch: 0,
        }));

        Self {
            inner,
            app_handle: Arc::new(Mutex::new(None)),
            db_manager: Arc::new(Mutex::new(None)),
            monitor_running: Arc::new(AtomicBool::new(false)),
            is_reloading: Arc::new(AtomicBool::new(false)),
            is_staging: Arc::new(AtomicBool::new(false)),
            analysis: AnalysisState::new(initial_state.volume, initial_state.is_muted),
        }
    }

    /// Associates the Tauri AppHandle for event emission.
    pub fn set_app_handle(&self, handle: AppHandle) {
        if let Ok(mut app_lock) = self.app_handle.lock() {
            *app_lock = Some(handle);
        }
        self.ensure_monitor_thread();
    }

    /// Associates the DatabaseManager for play count and settings updates.
    pub fn set_db_manager(&self, db: Arc<DatabaseManager>) {
        if let Ok(mut db_lock) = self.db_manager.lock() {
            *db_lock = Some(db.clone());
        }

        let _ = db.with_conn(|conn| {
            if let Ok(Some(vol_str)) =
                crate::db::settings_repo::get_setting(conn, "playback_volume")
            {
                if let Ok(vol) = vol_str.parse::<f32>() {
                    if let Ok(mut inner) = self.inner.lock() {
                        inner.state.volume = vol.clamp(0.0, 1.0);
                    }
                }
            }
            if let Ok(Some(mute_str)) =
                crate::db::settings_repo::get_setting(conn, "playback_is_muted")
            {
                if let Ok(muted) = mute_str.parse::<bool>() {
                    if let Ok(mut inner) = self.inner.lock() {
                        inner.state.is_muted = muted;
                    }
                }
            }
            Ok(())
        });
    }

    /// Validates file path existence, ensures it points to a regular file,
    /// and checks the extension against the whitelist.
    pub fn validate_file_path(raw_path: &str) -> Result<PathBuf, AudioError> {
        let path = Path::new(raw_path);
        if !path.exists() {
            return Err(AudioError::FileNotFound(raw_path.to_string()));
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
            return Err(AudioError::UnsupportedFormat(format!(
                "File format .{} is not supported. Supported formats: {:?}",
                ext, SUPPORTED_EXTENSIONS
            )));
        }

        std::fs::canonicalize(path).map_err(|err| AudioError::FileNotFound(err.to_string()))
    }

    /// Ensures the Rodio output stream and sink are valid, attempting reinitialization if needed.
    fn ensure_stream_handle(
        inner: &mut AudioEngineInner,
    ) -> Result<OutputStreamHandle, AudioError> {
        if let Some(ref handle) = inner.stream_handle {
            return Ok(handle.clone());
        }

        match spawn_audio_stream() {
            Some(handle) => {
                inner.stream_handle = Some(handle.clone());
                Ok(handle)
            }
            None => Err(AudioError::DeviceError(
                "Failed to initialize audio output device".to_string(),
            )),
        }
    }

    /// Emits state changed event to the frontend.
    fn emit_state_changed(&self, state_dto: &AudioPlaybackStateDto) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit("audio:state-changed", state_dto);
            }
        }
    }

    /// Emits structured error event to the frontend.
    fn emit_error(&self, error: &AudioError, track_id: Option<String>) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit("audio:error", error.to_dto(track_id));
            }
        }
    }

    /// Emits track transition boundary event to the frontend.
    fn emit_track_changed(&self, dto: &AudioTrackChangedDto) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit("audio:track-changed", dto);
            }
        }
    }

    /// Emits skip notice when a candidate fails and playback advances to following track.
    fn emit_track_skipped(
        &self,
        failed_track_id: &str,
        reason_code: &str,
        following_track_id: Option<String>,
    ) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit(
                    "audio:track-skipped",
                    AudioTrackSkippedDto {
                        failed_track_id: failed_track_id.to_string(),
                        reason_code: reason_code.to_string(),
                        following_track_id,
                    },
                );
            }
        }
    }

    /// Updates lookahead candidate list and queue generation, restaging if needed.
    pub fn set_next_track(
        &self,
        lookahead: Vec<NextTrackCandidate>,
        queue_generation: u64,
    ) -> Result<(), AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        // Stale generation check: ignore work from an older generation (AC-10)
        if queue_generation < inner.queue_generation {
            return Ok(());
        }

        let previous_generation = inner.queue_generation;
        inner.queue_generation = queue_generation;
        inner.lookahead = lookahead;
        if queue_generation > previous_generation {
            inner.failed_candidate_ids.clear();
        }

        // Invalidate staged slot if it no longer matches the first candidate
        if let Some(ref staged) = inner.staged_track_meta {
            let first_matches = inner
                .lookahead
                .first()
                .map(|c| c.track_id == staged.track_id)
                .unwrap_or(false);

            if !first_matches {
                inner.staged_track_meta = None;
                // If sink already holds queued items beyond current, rebuild sink
                if let Some(ref sink) = inner.sink {
                    if sink.len() > 1 {
                        let cur_pos = if let Some(ref active) = inner.active_track_meta {
                            active.current_position_seconds()
                        } else {
                            inner.state.position_seconds
                        };
                        let tid = inner.state.track_id.clone();
                        let fp = inner.state.file_path.clone();
                        let ctx_t = inner.state.context_title.clone();
                        let ctx_ty = inner.state.context_type.clone();
                        let keep_paused = inner.state.status != PlaybackStatus::Playing;
                        drop(inner);
                        if let (Some(t), Some(f)) = (tid, fp) {
                            let _ = self.play_track_internal(
                                t,
                                f,
                                Some(cur_pos),
                                ctx_t,
                                ctx_ty,
                                keep_paused,
                            );
                        }
                        return Ok(());
                    }
                }
            }
        }

        let should_stage = inner.staged_track_meta.is_none()
            && inner.state.status == PlaybackStatus::Playing
            && !inner.lookahead.is_empty()
            && (inner.state.duration_seconds <= 10.0
                || (inner.state.duration_seconds - inner.state.position_seconds <= 10.0));

        drop(inner);

        if should_stage {
            self.try_stage_next_track();
        }

        Ok(())
    }

    /// Asynchronously decodes and stages the upcoming track from lookahead candidates (AC-1, AC-3, AC-5, AC-10).
    pub fn try_stage_next_track(&self) {
        if self
            .is_staging
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let inner = match self.inner.lock() {
            Ok(l) => l,
            Err(_) => {
                self.is_staging.store(false, Ordering::SeqCst);
                return;
            }
        };

        if inner.state.status != PlaybackStatus::Playing || inner.staged_track_meta.is_some() {
            self.is_staging.store(false, Ordering::SeqCst);
            return;
        }

        let lookahead = inner.lookahead.clone();
        let failed_ids = inner.failed_candidate_ids.clone();
        let stage_epoch = inner.stage_epoch;
        let queue_generation = inner.queue_generation;
        let output_channels = inner.output_channels;
        let output_sample_rate = inner.output_sample_rate;
        let context_title = inner.state.context_title.clone();
        let context_type = inner.state.context_type.clone();
        drop(inner);

        let engine = self.clone();

        tauri::async_runtime::spawn_blocking(move || {
            let mut staged_result: Option<(TrackPlaybackMetadata, StagedSource)> = None;

            let mut newly_failed: Vec<String> = Vec::new();

            for (idx, candidate) in lookahead.iter().enumerate() {
                if failed_ids.contains(&candidate.track_id) {
                    continue;
                }
                let next_following_id = lookahead.get(idx + 1).map(|c| c.track_id.clone());

                let canonical_path = match Self::validate_file_path(&candidate.file_path) {
                    Ok(p) => p,
                    Err(err) => {
                        newly_failed.push(candidate.track_id.clone());
                        engine.emit_track_skipped(
                            &candidate.track_id,
                            err.code(),
                            next_following_id,
                        );
                        continue;
                    }
                };

                let file = match File::open(&canonical_path) {
                    Ok(f) => f,
                    Err(err) => {
                        let audio_err = AudioError::FileNotFound(err.to_string());
                        newly_failed.push(candidate.track_id.clone());
                        engine.emit_track_skipped(
                            &candidate.track_id,
                            audio_err.code(),
                            next_following_id,
                        );
                        continue;
                    }
                };

                let buf_reader = BufReader::new(file);
                let decoder = match Decoder::new(buf_reader) {
                    Ok(d) => d,
                    Err(err) => {
                        let audio_err = AudioError::DecodeError(err.to_string());
                        newly_failed.push(candidate.track_id.clone());
                        engine.emit_track_skipped(
                            &candidate.track_id,
                            audio_err.code(),
                            next_following_id,
                        );
                        continue;
                    }
                };

                let duration = decoder
                    .total_duration()
                    .map(|d| d.as_secs_f64())
                    .unwrap_or(0.0);

                let uniform_source = UniformSourceIterator::<_, i16>::new(
                    decoder,
                    output_channels,
                    output_sample_rate,
                );

                let tap_source = SpectrumTapSource::new(
                    uniform_source,
                    engine.analysis.active.clone(),
                    engine.analysis.sample_buffer.clone(),
                    engine.analysis.volume_mute.clone(),
                );

                let samples_played = Arc::new(AtomicU64::new(0));
                let started = Arc::new(AtomicBool::new(false));
                let ended = Arc::new(AtomicBool::new(false));

                let meta = TrackPlaybackMetadata {
                    track_id: candidate.track_id.clone(),
                    file_path: canonical_path.to_string_lossy().to_string(),
                    duration_seconds: duration,
                    queue_generation,
                    samples_played: samples_played.clone(),
                    started: started.clone(),
                    ended: ended.clone(),
                    channels: output_channels,
                    sample_rate: output_sample_rate,
                    context_title: context_title.clone(),
                    context_type: context_type.clone(),
                };

                let boundary_source = TrackBoundarySource::new(
                    tap_source,
                    candidate.track_id.clone(),
                    duration,
                    queue_generation,
                    samples_played,
                    started,
                    ended,
                );

                staged_result = Some((meta, boundary_source));
                break;
            }

            if let Ok(mut inner) = engine.inner.lock() {
                inner.failed_candidate_ids.extend(newly_failed);
            }

            if let Some((meta, boundary_source)) = staged_result {
                if let Ok(mut inner) = engine.inner.lock() {
                    if inner.queue_generation == queue_generation
                        && inner.stage_epoch == stage_epoch
                        && inner.state.status == PlaybackStatus::Playing
                        && inner.staged_track_meta.is_none()
                    {
                        if let Some(ref sink) = inner.sink {
                            sink.append(boundary_source);
                            inner.staged_track_meta = Some(meta);
                        }
                    }
                }
            }

            engine.is_staging.store(false, Ordering::SeqCst);
        });
    }

    /// Internal loader creating or replacing the playback sink.
    fn play_track_internal(
        &self,
        track_id: String,
        file_path: String,
        start_position: Option<f64>,
        context_title: Option<String>,
        context_type: Option<String>,
        start_paused: bool,
    ) -> Result<AudioPlaybackStateDto, AudioError> {
        let canonical_path = match Self::validate_file_path(&file_path) {
            Ok(p) => p,
            Err(err) => {
                self.emit_error(&err, Some(track_id));
                return Err(err);
            }
        };

        let file = match File::open(&canonical_path) {
            Ok(f) => f,
            Err(err) => {
                let audio_err = AudioError::FileNotFound(err.to_string());
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let buf_reader = BufReader::new(file);
        let decoder = match Decoder::new(buf_reader) {
            Ok(d) => d,
            Err(err) => {
                let audio_err = AudioError::DecodeError(format!(
                    "Failed to decode audio file {}: {}",
                    file_path, err
                ));
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let channels = decoder.channels();
        let sample_rate = decoder.sample_rate();
        let duration = decoder
            .total_duration()
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);

        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        let stream_handle = match Self::ensure_stream_handle(&mut inner) {
            Ok(h) => h,
            Err(err) => {
                self.emit_error(&err, Some(track_id));
                return Err(err);
            }
        };

        // Stop prior sink
        inner.stage_epoch += 1;
        if let Some(old_sink) = inner.sink.take() {
            old_sink.stop();
        }

        let new_sink = match Sink::try_new(&stream_handle) {
            Ok(s) => s,
            Err(err) => {
                let audio_err = AudioError::DeviceError(err.to_string());
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let current_volume = if inner.state.is_muted {
            0.0
        } else {
            inner.state.volume
        };
        new_sink.set_volume(current_volume);

        inner.output_channels = channels;
        inner.output_sample_rate = sample_rate;

        let uniform_source = UniformSourceIterator::<_, i16>::new(decoder, channels, sample_rate);

        let tap_source = SpectrumTapSource::new(
            uniform_source,
            self.analysis.active.clone(),
            self.analysis.sample_buffer.clone(),
            self.analysis.volume_mute.clone(),
        );

        let samples_played = Arc::new(AtomicU64::new(0));
        let started = Arc::new(AtomicBool::new(true));
        let ended = Arc::new(AtomicBool::new(false));

        let start_pos = start_position.unwrap_or(0.0).max(0.0);
        if start_pos > 0.0 {
            let offset_samples = (start_pos * (sample_rate as f64) * (channels as f64)) as u64;
            samples_played.store(offset_samples, Ordering::SeqCst);
        }

        let meta = TrackPlaybackMetadata {
            track_id: track_id.clone(),
            file_path: canonical_path.to_string_lossy().to_string(),
            duration_seconds: duration,
            queue_generation: inner.queue_generation,
            samples_played: samples_played.clone(),
            started: started.clone(),
            ended: ended.clone(),
            channels,
            sample_rate,
            context_title: context_title.clone(),
            context_type: context_type.clone(),
        };

        let boundary_source = TrackBoundarySource::new(
            tap_source,
            track_id.clone(),
            duration,
            inner.queue_generation,
            samples_played,
            started,
            ended,
        );

        new_sink.append(boundary_source);

        if start_pos > 0.0 {
            let _ = new_sink.try_seek(Duration::from_secs_f64(start_pos));
        }

        if start_paused {
            new_sink.pause();
        }

        inner.state.session_id += 1;
        inner.state.track_id = Some(track_id);
        inner.state.file_path = Some(canonical_path.to_string_lossy().to_string());
        inner.state.status = if start_paused {
            PlaybackStatus::Paused
        } else {
            PlaybackStatus::Playing
        };
        inner.state.position_seconds = start_pos;
        inner.state.duration_seconds = duration;
        inner.state.play_count_recorded = false;
        inner.state.context_title = context_title;
        inner.state.context_type = context_type;
        inner.active_track_meta = Some(meta);
        inner.staged_track_meta = None;
        inner.sink = Some(new_sink);

        let dto = AudioPlaybackStateDto::from(&inner.state);
        let should_stage = !start_paused
            && !inner.lookahead.is_empty()
            && (duration <= 10.0 || (duration - start_pos <= 10.0));

        drop(inner);

        self.emit_state_changed(&dto);
        self.ensure_monitor_thread();

        if should_stage {
            self.try_stage_next_track();
        }

        Ok(dto)
    }

    /// Loads an audio file, resets transport state, starts playback, and emits events.
    /// Reuses queued boundary track without interruption if target track was staged (AC-2).
    pub fn play_track(
        &self,
        track_id: String,
        file_path: String,
        start_position: Option<f64>,
        context_title: Option<String>,
        context_type: Option<String>,
    ) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        // Fast manual Next optimization: if target is already staged in the sink (AC-2)
        if let Some(ref staged) = inner.staged_track_meta {
            if staged.track_id == track_id && start_position.unwrap_or(0.0) == 0.0 {
                if let Some(ref sink) = inner.sink {
                    if sink.len() > 1 {
                        sink.skip_one();
                        // Fast path hands off to a playing track; resume the sink in case it was paused.
                        sink.play();
                        let new_active = inner.staged_track_meta.take().unwrap();
                        inner.active_track_meta = Some(new_active.clone());
                        inner.state.track_id = Some(new_active.track_id.clone());
                        inner.state.file_path = Some(new_active.file_path.clone());
                        inner.state.duration_seconds = new_active.duration_seconds;
                        inner.state.position_seconds = 0.0;
                        inner.state.status = PlaybackStatus::Playing;
                        inner.state.play_count_recorded = false;
                        inner.state.session_id += 1;

                        let dto = AudioPlaybackStateDto::from(&inner.state);
                        let changed_dto = AudioTrackChangedDto {
                            track_id: new_active.track_id.clone(),
                            duration_seconds: new_active.duration_seconds,
                            queue_generation: new_active.queue_generation,
                        };
                        drop(inner);

                        self.emit_track_changed(&changed_dto);
                        self.emit_state_changed(&dto);
                        return Ok(dto);
                    }
                }
            }
        }

        drop(inner);

        self.play_track_internal(
            track_id,
            file_path,
            start_position,
            context_title,
            context_type,
            false,
        )
    }

    /// Pauses currently active playback.
    pub fn pause(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.status != PlaybackStatus::Playing {
            return Err(AudioError::NotPlaying);
        }

        if let Some(ref sink) = inner.sink {
            sink.pause();
            let cur_pos = if let Some(ref active) = inner.active_track_meta {
                active.current_position_seconds()
            } else {
                sink.get_pos().as_secs_f64()
            };
            inner.state.position_seconds = cur_pos;
        }
        inner.state.status = PlaybackStatus::Paused;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Resumes playback from paused state.
    pub fn resume(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.status != PlaybackStatus::Paused {
            return Err(AudioError::NotPaused);
        }

        if let Some(ref sink) = inner.sink {
            sink.play();
        } else {
            return Err(AudioError::NotLoaded);
        }
        inner.state.status = PlaybackStatus::Playing;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        let should_stage = inner.staged_track_meta.is_none()
            && !inner.lookahead.is_empty()
            && (inner.state.duration_seconds <= 10.0
                || (inner.state.duration_seconds - inner.state.position_seconds <= 10.0));
        drop(inner);

        self.emit_state_changed(&dto);
        if should_stage {
            self.try_stage_next_track();
        }
        Ok(dto)
    }

    /// Stops playback and resets position to zero.
    pub fn stop(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if let Some(sink) = inner.sink.take() {
            sink.stop();
        }
        inner.stage_epoch += 1;
        inner.state.status = PlaybackStatus::Stopped;
        inner.staged_track_meta = None;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Seeks active stream to specified second offset.
    /// Preserves staged track when inside staging window; restages when outside (AC-6).
    pub fn seek(&self, position_seconds: f64) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.track_id.is_none() {
            return Err(AudioError::NotLoaded);
        }

        let clamped = position_seconds.clamp(0.0, inner.state.duration_seconds.max(0.0));
        let in_staging_window = inner.state.duration_seconds <= 10.0
            || clamped >= (inner.state.duration_seconds - 10.0);

        // Outside staging window with track already queued in sink: clear and rebuild (AC-6)
        if !in_staging_window && inner.staged_track_meta.is_some() {
            inner.staged_track_meta = None;
            let tid = inner.state.track_id.clone().unwrap();
            let fp = inner.state.file_path.clone().unwrap();
            let ctx_t = inner.state.context_title.clone();
            let ctx_ty = inner.state.context_type.clone();
            let is_paused = inner.state.status == PlaybackStatus::Paused;
            drop(inner);
            return self.play_track_internal(tid, fp, Some(clamped), ctx_t, ctx_ty, is_paused);
        }

        if let Some(ref sink) = inner.sink {
            if let Err(err) = sink.try_seek(Duration::from_secs_f64(clamped)) {
                return Err(AudioError::SeekFailed(err.to_string()));
            }
        } else {
            return Err(AudioError::NotLoaded);
        }

        if let Some(ref mut active) = inner.active_track_meta {
            let sample_rate = active.sample_rate as f64;
            let channels = active.channels as f64;
            let target_samples = (clamped * sample_rate * channels) as u64;
            active
                .samples_played
                .store(target_samples, Ordering::SeqCst);
        }

        inner.state.position_seconds = clamped;
        let dto = AudioPlaybackStateDto::from(&inner.state);
        let should_stage =
            in_staging_window && inner.staged_track_meta.is_none() && !inner.lookahead.is_empty();
        drop(inner);

        self.emit_state_changed(&dto);

        if should_stage {
            self.try_stage_next_track();
        }

        Ok(dto)
    }

    /// Sets playback volume (0.0 to 1.0) and persists preference.
    pub fn set_volume(&self, volume: f32) -> Result<(), AudioError> {
        let clamped = volume.clamp(0.0, 1.0);

        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        inner.state.volume = clamped;
        let is_muted = inner.state.is_muted;
        if !is_muted {
            if let Some(ref sink) = inner.sink {
                sink.set_volume(clamped);
            }
        }

        self.analysis
            .volume_mute
            .store(pack_gain_mute(clamped, is_muted), Ordering::Release);

        drop(inner);

        if let Ok(db_lock) = self.db_manager.lock() {
            if let Some(ref db) = *db_lock {
                let _ = db.with_conn(|conn| {
                    crate::db::settings_repo::set_setting(
                        conn,
                        "playback_volume",
                        &clamped.to_string(),
                    )
                });
            }
        }

        Ok(())
    }

    /// Sets mute flag and adjusts Sink output volume accordingly.
    pub fn set_muted(&self, muted: bool) -> Result<(), AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        inner.state.is_muted = muted;
        let volume = inner.state.volume;
        if let Some(ref sink) = inner.sink {
            sink.set_volume(if muted { 0.0 } else { volume });
        }

        self.analysis
            .volume_mute
            .store(pack_gain_mute(volume, muted), Ordering::Release);

        drop(inner);

        if let Ok(db_lock) = self.db_manager.lock() {
            if let Some(ref db) = *db_lock {
                let _ = db.with_conn(|conn| {
                    crate::db::settings_repo::set_setting(
                        conn,
                        "playback_is_muted",
                        &muted.to_string(),
                    )
                });
            }
        }

        Ok(())
    }

    /// Queries the current audio playback state snapshot.
    pub fn get_state(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;
        Ok(AudioPlaybackStateDto::from(&inner.state))
    }

    /// Starts streaming spectrum analysis frames through the provided Tauri Channel.
    pub fn start_spectrum_analysis(
        &self,
        channel: tauri::ipc::Channel<SpectrumFrame>,
    ) -> Result<(), AudioError> {
        let inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        let sample_rate = inner.output_sample_rate;
        let track_id = inner
            .state
            .track_id
            .clone()
            .unwrap_or_else(|| "none".to_string());
        drop(inner);

        // Stop any active worker and reset sample buffer
        self.analysis.active.store(false, Ordering::Release);

        let new_buf = SampleBuffer::new();
        if let Ok(mut buf_guard) = self.analysis.sample_buffer.lock() {
            *buf_guard = Some(new_buf.clone());
        }

        self.analysis.active.store(true, Ordering::Release);

        let config = AnalyzerConfig {
            sample_rate,
            track_id,
        };

        super::analyzer::start_analysis_worker(
            config,
            new_buf,
            self.analysis.active.clone(),
            self.analysis.frame_counter.clone(),
            channel,
        )
        .map_err(AudioError::DeviceError)?;

        Ok(())
    }

    /// Stops active spectrum analysis and ends the streaming channel.
    pub fn stop_spectrum_analysis(&self) -> Result<(), AudioError> {
        self.analysis.active.store(false, Ordering::Release);
        if let Ok(mut buf_guard) = self.analysis.sample_buffer.lock() {
            *buf_guard = None;
        }
        Ok(())
    }

    /// Spawns the background monitor thread if not already running.
    fn ensure_monitor_thread(&self) {
        if self
            .monitor_running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let inner_clone = self.inner.clone();
        let app_handle_clone = self.app_handle.clone();
        let db_manager_clone = self.db_manager.clone();
        let running_flag = self.monitor_running.clone();
        let reloading_flag = self.is_reloading.clone();
        let engine_clone = self.clone();

        thread::Builder::new()
            .name("audio-monitor".to_string())
            .spawn(move || {
                while running_flag.load(Ordering::SeqCst) {
                    thread::sleep(Duration::from_millis(100));

                    let mut inner = match inner_clone.lock() {
                        Ok(l) => l,
                        Err(_) => continue,
                    };

                    if reloading_flag.load(Ordering::SeqCst) {
                        continue;
                    }

                    if inner.state.status != PlaybackStatus::Playing {
                        continue;
                    }

                    // 1. Check if track boundary transition occurred
                    let is_boundary_transition = if let Some(ref staged) = inner.staged_track_meta {
                        let staged_started = staged.started.load(Ordering::SeqCst);
                        let active_ended = inner
                            .active_track_meta
                            .as_ref()
                            .map(|a| a.ended.load(Ordering::SeqCst))
                            .unwrap_or(false);
                        staged_started || active_ended
                    } else {
                        false
                    };

                    let mut track_changed_to_emit: Option<AudioTrackChangedDto> = None;
                    let mut history_to_record: Option<(String, Option<String>, Option<String>)> =
                        None;

                    if is_boundary_transition {
                        let new_active = inner.staged_track_meta.take().unwrap();
                        let prior_active = inner.active_track_meta.replace(new_active.clone());

                        if let Some(prior) = prior_active {
                            if !inner.state.play_count_recorded {
                                let p_pos = prior.current_position_seconds();
                                let p_dur = prior.duration_seconds;
                                if p_pos >= 30.0 || (p_dur > 0.0 && p_pos >= p_dur / 2.0) {
                                    history_to_record = Some((
                                        prior.track_id,
                                        prior.context_title,
                                        prior.context_type,
                                    ));
                                }
                            }
                        }

                        inner.state.track_id = Some(new_active.track_id.clone());
                        inner.state.file_path = Some(new_active.file_path.clone());
                        inner.state.duration_seconds = new_active.duration_seconds;
                        inner.state.position_seconds = new_active.current_position_seconds();
                        inner.state.play_count_recorded = false;
                        inner.state.session_id += 1;

                        track_changed_to_emit = Some(AudioTrackChangedDto {
                            track_id: new_active.track_id.clone(),
                            duration_seconds: new_active.duration_seconds,
                            queue_generation: new_active.queue_generation,
                        });
                    }

                    // 2. Check if sink is empty and no staged track exists (queue completed naturally)
                    let sink_empty = inner.sink.as_ref().map(|s| s.empty()).unwrap_or(true);
                    if sink_empty && inner.staged_track_meta.is_none() {
                        let prior_tid = inner.state.track_id.clone();
                        inner.state.status = PlaybackStatus::Stopped;
                        inner.state.position_seconds = 0.0;
                        inner.active_track_meta = None;
                        if let Some(sink) = inner.sink.take() {
                            sink.stop();
                        }

                        let state_dto = AudioPlaybackStateDto::from(&inner.state);
                        drop(inner);

                        if let Ok(app_lock) = app_handle_clone.lock() {
                            if let Some(ref app) = *app_lock {
                                let _ = app.emit("audio:state-changed", &state_dto);
                                if let Some(ref tid) = prior_tid {
                                    let _ = app.emit(
                                        "audio:track-ended",
                                        AudioTrackEndedDto {
                                            track_id: tid.clone(),
                                            completed: true,
                                        },
                                    );
                                }
                            }
                        }
                        continue;
                    }

                    // 3. Track is still playing: calculate accurate per-track position
                    let current_pos = if let Some(ref active) = inner.active_track_meta {
                        active.current_position_seconds()
                    } else if let Some(ref sink) = inner.sink {
                        sink.get_pos().as_secs_f64()
                    } else {
                        0.0
                    };

                    inner.state.position_seconds = current_pos;
                    let track_id_opt = inner.state.track_id.clone();
                    let duration = inner.state.duration_seconds;

                    // Play count milestone check
                    let should_record_play = !inner.state.play_count_recorded
                        && (current_pos >= 30.0
                            || (duration > 0.0 && current_pos >= duration / 2.0));

                    if should_record_play {
                        inner.state.play_count_recorded = true;
                        if let Some(ref tid) = track_id_opt {
                            history_to_record = Some((
                                tid.clone(),
                                inner.state.context_title.clone(),
                                inner.state.context_type.clone(),
                            ));
                        }
                    }

                    // 4. Staging trigger check (AC-3: 10s or less remaining)
                    let should_stage_next = inner.staged_track_meta.is_none()
                        && !inner.lookahead.is_empty()
                        && (duration <= 10.0 || (duration - current_pos <= 10.0));

                    let position_dto = AudioPositionDto {
                        track_id: track_id_opt.unwrap_or_default(),
                        position_seconds: current_pos,
                        duration_seconds: duration,
                        is_playing: true,
                    };

                    let state_dto = AudioPlaybackStateDto::from(&inner.state);
                    drop(inner);

                    // Emit track transition if it just occurred
                    if let Some(ref changed) = track_changed_to_emit {
                        if let Ok(app_lock) = app_handle_clone.lock() {
                            if let Some(ref app) = *app_lock {
                                let _ = app.emit("audio:track-changed", changed);
                                let _ = app.emit("audio:state-changed", &state_dto);
                            }
                        }
                    }

                    // Record history milestone
                    if let Some((tid_str, ctx_title, ctx_type)) = history_to_record {
                        if let Ok(db_lock) = db_manager_clone.lock() {
                            if let Some(ref db) = *db_lock {
                                let db_arc = db.clone();
                                let app_handle_opt = if let Ok(app_lock) = app_handle_clone.lock() {
                                    app_lock.clone()
                                } else {
                                    None
                                };

                                tauri::async_runtime::spawn_blocking(move || {
                                    let record_res = db_arc.with_conn(|conn| {
                                        crate::db::history_repo::record_playback(
                                            conn,
                                            &tid_str,
                                            ctx_title.as_deref(),
                                            ctx_type.as_deref(),
                                        )
                                    });

                                    if let Ok(history_dto) = record_res {
                                        if let Some(app) = app_handle_opt {
                                            let _ =
                                                app.emit("audio:history-recorded", &history_dto);
                                        }
                                    }
                                });
                            }
                        }
                    }

                    if let Ok(app_lock) = app_handle_clone.lock() {
                        if let Some(ref app) = *app_lock {
                            let _ = app.emit("audio:position", &position_dto);
                        }
                    }

                    if should_stage_next {
                        engine_clone.try_stage_next_track();
                    }
                }
            })
            .expect("Failed to spawn audio monitor thread");
    }

    /// Checks if a file path matches the currently loaded active playback track.
    pub fn is_file_active(&self, target_file_path: &Path) -> bool {
        let canonical_target = match std::fs::canonicalize(target_file_path) {
            Ok(p) => p,
            Err(_) => target_file_path.to_path_buf(),
        };

        if let Ok(inner) = self.inner.lock() {
            if let Some(ref current_fp) = inner.state.file_path {
                return match std::fs::canonicalize(current_fp) {
                    Ok(p) => p == canonical_target,
                    Err(_) => current_fp == &target_file_path.to_string_lossy(),
                };
            }
        }
        false
    }

    /// AC-7: Executes physical tag writing with atomic reload guard.
    pub fn execute_with_reload_guard<F, R>(
        &self,
        target_file_path: &Path,
        operation: F,
    ) -> Result<R, String>
    where
        F: FnOnce() -> Result<R, String>,
    {
        let is_active = self.is_file_active(target_file_path);
        if !is_active {
            return operation();
        }

        self.is_reloading.store(true, Ordering::SeqCst);

        let mut prior_track_id: Option<String> = None;
        let mut prior_file_path: Option<String> = None;
        let mut prior_pos = 0.0;
        let mut was_playing = false;
        let mut context_title: Option<String> = None;
        let mut context_type: Option<String> = None;

        if let Ok(mut inner) = self.inner.lock() {
            prior_track_id = inner.state.track_id.clone();
            prior_file_path = inner.state.file_path.clone();
            was_playing = inner.state.status == PlaybackStatus::Playing;
            context_title = inner.state.context_title.clone();
            context_type = inner.state.context_type.clone();

            prior_pos = if let Some(ref active) = inner.active_track_meta {
                active.current_position_seconds()
            } else if let Some(ref sink) = inner.sink {
                sink.get_pos().as_secs_f64()
            } else {
                inner.state.position_seconds
            };

            inner.staged_track_meta = None;
            if let Some(sink) = inner.sink.take() {
                sink.stop();
            }
        }

        std::thread::sleep(Duration::from_millis(20));
        let op_result = operation();

        if let (Some(tid), Some(fp)) = (prior_track_id, prior_file_path) {
            let _ = self.play_track_internal(
                tid,
                fp,
                Some(prior_pos),
                context_title,
                context_type,
                !was_playing,
            );
        }

        self.is_reloading.store(false, Ordering::SeqCst);
        op_result
    }
}

impl Default for AudioEngine {
    fn default() -> Self {
        Self::new()
    }
}
