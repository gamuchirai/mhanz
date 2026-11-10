//! Background spectrum analysis worker using RustFFT.
//!
//! The worker waits on a `Condvar` for a new sample window deposited by the
//! `SpectrumTapSource`, then applies:
//!   1. A Hann window to the samples.
//!   2. A forward FFT via RustFFT (4096-point).
//!   3. Logarithmic band mapping from 20 Hz to min(20 kHz, Nyquist) into 32 bands.
//!   4. Amplitude normalization to dBFS with mapping to [0, 1].
//!   5. Sub-10 Hz band energy interpolation so low bands are never dead zero.
//!
//! Output: `SpectrumFrame` sent over a `tauri::ipc::Channel<SpectrumFrame>`.
//!
//! Invariants (spec AC-3, AC-6):
//! - The worker never allocates on the audio thread.
//! - Audio buffers stay in process memory and are never persisted or transmitted.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use rustfft::{num_complex::Complex, FftPlanner};
use tauri::ipc::Channel;

use super::tap::{SampleBuffer, WINDOW_SIZE};

/// Spectrum analysis result streamed to the frontend.
#[derive(Clone, serde::Serialize)]
pub struct SpectrumFrame {
    /// Track id this frame belongs to (for stale frame rejection).
    pub track_id: String,
    /// Monotonic millisecond timestamp.
    pub timestamp_ms: u64,
    /// Engine-wide monotonic counter; frontend rejects frames with sequence not greater than last.
    pub sequence: u64,
    /// 32 normalized frequency band magnitudes, each in [0.0, 1.0].
    pub bands: [f32; 32],
}

/// Configuration for the analysis worker.
pub struct AnalyzerConfig {
    pub sample_rate: u32,
    pub track_id: String,
}

/// Start a background spectrum analysis worker that reads from `sample_buffer`,
/// computes 32 frequency bands using RustFFT, and sends `SpectrumFrame` values
/// through `channel` until `active_flag` becomes false or the channel is dropped.
///
/// Returns `Err` if the analysis setup fails.
pub fn start_analysis_worker(
    config: AnalyzerConfig,
    sample_buffer: SampleBuffer,
    active_flag: Arc<AtomicBool>,
    frame_counter: Arc<AtomicU64>,
    channel: Channel<SpectrumFrame>,
) -> Result<(), String> {
    let sample_rate = config.sample_rate;
    let track_id = config.track_id;

    // Build the Hann window once.
    let hann: Vec<f32> = (0..WINDOW_SIZE)
        .map(|n| {
            0.5 * (1.0 - (2.0 * std::f32::consts::PI * n as f32 / (WINDOW_SIZE as f32 - 1.0)).cos())
        })
        .collect();

    let hann_sum: f32 = hann.iter().sum();

    // Build the FFT plan.
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(WINDOW_SIZE);

    // Preallocate FFT scratch buffer.
    let mut fft_input: Vec<Complex<f32>> = vec![Complex::new(0.0, 0.0); WINDOW_SIZE];
    let mut fft_scratch: Vec<Complex<f32>> =
        vec![Complex::new(0.0, 0.0); fft.get_inplace_scratch_len()];

    // Build logarithmic band edges from 20 Hz to min(20000 Hz, Nyquist).
    let nyquist = sample_rate as f32 / 2.0;
    let lower_hz: f32 = 20.0;
    let upper_hz = nyquist.min(20_000.0);
    let num_bins = WINDOW_SIZE / 2 + 1;
    let bin_width = nyquist / (WINDOW_SIZE as f32 / 2.0);

    // Compute 32 band boundary frequencies in Hz.
    let band_edges: Vec<f32> = (0..=32)
        .map(|i| lower_hz * (upper_hz / lower_hz).powf(i as f32 / 32.0))
        .collect();

    // Convert band edge frequencies to FFT bin indices.
    let band_bin_edges: Vec<usize> = band_edges
        .iter()
        .map(|&hz| ((hz / bin_width).round() as usize).min(num_bins - 1))
        .collect();

    // Find the nearest bin index for sub-10 Hz interpolation.
    let nearest_low_bin = {
        let edge_10hz = (10.0 / bin_width).round() as usize;
        edge_10hz.min(num_bins - 1)
    };

    // Start time for monotonic timestamps.
    let start_time = std::time::Instant::now();

    std::thread::Builder::new()
        .name("mutinhimira-spectrum-analyzer".to_string())
        .spawn(move || {
            loop {
                // Check cancellation before waiting.
                if !active_flag.load(Ordering::Acquire) {
                    break;
                }

                // Wait for a new sample window without blocking unconditionally if data is already queued.
                let window = {
                    let mut guard = match sample_buffer.queue.lock() {
                        Ok(g) => g,
                        Err(e) => {
                            eprintln!("[Analyzer] Sample buffer mutex poisoned: {}", e);
                            break;
                        }
                    };

                    while guard.is_empty() && active_flag.load(Ordering::Acquire) {
                        guard = match sample_buffer
                            .condvar
                            .wait_timeout(guard, std::time::Duration::from_millis(200))
                        {
                            Ok((g, _)) => g,
                            Err(e) => {
                                eprintln!("[Analyzer] Condvar wait failed");
                                guard = e.into_inner().0;
                                break;
                            }
                        };
                    }

                    // Check cancellation after wakeup.
                    if !active_flag.load(Ordering::Acquire) {
                        break;
                    }

                    match guard.pop_front() {
                        Some(w) => w,
                        None => continue,
                    }
                };

                // Apply Hann window and copy into FFT input.
                for (i, (&sample, &h)) in window.iter().zip(hann.iter()).enumerate() {
                    fft_input[i] = Complex::new(sample * h, 0.0);
                }

                // Execute forward FFT in place.
                fft.process_with_scratch(&mut fft_input, &mut fft_scratch);

                // Compute 32 band energies.
                let mut bands = [0.0f32; 32];
                for band_idx in 0..32 {
                    let bin_lo = band_bin_edges[band_idx];
                    let bin_hi = band_bin_edges[band_idx + 1];

                    let energy: f32 = if bin_lo >= bin_hi {
                        // Sub-10 Hz band: interpolate from nearest low-frequency bin.
                        let bin = nearest_low_bin.min(num_bins - 1);
                        let amp = fft_input[bin].norm() / hann_sum;
                        // DC and Nyquist: amplitude^2 without factor 2.
                        if bin == 0 || bin == WINDOW_SIZE / 2 {
                            amp * amp
                        } else {
                            amp * amp * 2.0
                        }
                    } else {
                        // Sum energy of bins within [bin_lo, bin_hi).
                        let mut e = 0.0f32;
                        for (bin, item) in fft_input.iter().enumerate().take(bin_hi).skip(bin_lo) {
                            let amp = if bin == 0 || bin == WINDOW_SIZE / 2 {
                                // DC or Nyquist: amplitude^2 (spec §4).
                                let a = item.norm() / hann_sum;
                                a * a
                            } else {
                                // Non-DC/Nyquist: 2 * amplitude^2 / 2 = amplitude^2 (spec §4).
                                let a = (item.norm() * 2.0) / hann_sum;
                                a * a * 0.5
                            };
                            e += amp;
                        }
                        e
                    };

                    // RMS of the band.
                    let rms = energy.sqrt();

                    // Map RMS to [0, 1] via dBFS scale (spec §4).
                    // 0 RMS → 0.0; other values: clamp((20*log10(rms)+60)/54, 0, 1).
                    bands[band_idx] = if rms <= 0.0 {
                        0.0
                    } else {
                        let db = 20.0 * rms.log10();
                        ((db + 60.0) / 54.0).clamp(0.0, 1.0)
                    };
                }

                let seq = frame_counter.fetch_add(1, Ordering::Relaxed);
                let timestamp_ms = start_time.elapsed().as_millis() as u64;

                let frame = SpectrumFrame {
                    track_id: track_id.clone(),
                    timestamp_ms,
                    sequence: seq,
                    bands,
                };

                // Send the frame; a closed channel is treated as a normal stop (spec invariant 4).
                if channel.send(frame).is_err() {
                    break;
                }
            }

            // Worker exited cleanly; ensure gate is false so the tap stops accumulating.
            active_flag.store(false, Ordering::Release);
        })
        .map_err(|e| format!("Failed to spawn analyzer thread: {}", e))?;

    Ok(())
}

/// Shared analysis state threaded through `AudioEngine` for start/stop commands.
#[derive(Clone)]
pub struct AnalysisState {
    /// True while the analysis worker should run and the tap should accumulate.
    pub active: Arc<AtomicBool>,
    /// Packed gain+mute value for the tap source.
    pub volume_mute: Arc<AtomicU64>,
    /// Monotonic frame sequence counter shared across all analysis sessions.
    pub frame_counter: Arc<AtomicU64>,
    /// Buffer shared with the current tap source instance.
    pub sample_buffer: Arc<Mutex<Option<SampleBuffer>>>,
}

impl AnalysisState {
    /// Creates a new inactive analysis state.
    pub fn new(initial_gain: f32, initial_muted: bool) -> Self {
        use super::tap::pack_gain_mute;
        Self {
            active: Arc::new(AtomicBool::new(false)),
            volume_mute: Arc::new(AtomicU64::new(pack_gain_mute(initial_gain, initial_muted))),
            frame_counter: Arc::new(AtomicU64::new(0)),
            sample_buffer: Arc::new(Mutex::new(None)),
        }
    }
}
