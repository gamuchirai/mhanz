//! Non-allocating spectrum tap source that observes PCM samples from the audio thread
//! without blocking or delaying playback.
//!
//! Architecture:
//! - `SpectrumTapSource<I>` wraps any Rodio `Source<Item = i16>` iterator.
//! - An `AtomicBool` gate (`is_active`) lets the analysis worker enable accumulation.
//!   When the gate is false the iterator's `next()` performs a single relaxed read and
//!   returns the sample immediately — zero heap allocation and near zero CPU.
//! - When the gate is true, each sample is downmixed to mono `(L + R) / 2` and pushed
//!   into a preallocated `VecDeque<f32>` (capacity 4096) protected by a `Mutex` and
//!   `Condvar`. When the queue is full the oldest window is removed before the newest is
//!   added. If the mutex is contended the incoming window is dropped instead of waiting.
//! - A packed `Arc<AtomicU64>` carries the current gain and mute state so the analysis
//!   worker can apply volume/mute without locking the engine.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use rodio::source::SeekError;
use rodio::Source;

/// Preallocated sample buffer capacity (number of mono f32 samples per window).
pub const WINDOW_SIZE: usize = 4096;

/// Shared sample buffer used to pass PCM windows from the audio thread to the analysis worker.
#[derive(Clone)]
pub struct SampleBuffer {
    /// Pending analysis windows; capacity-two bounded deque.
    pub queue: Arc<Mutex<VecDeque<Box<[f32; WINDOW_SIZE]>>>>,
    /// Notified whenever a new window is deposited.
    pub condvar: Arc<Condvar>,
}

impl SampleBuffer {
    /// Creates a new sample buffer with an empty queue.
    pub fn new() -> Self {
        Self {
            queue: Arc::new(Mutex::new(VecDeque::with_capacity(2))),
            condvar: Arc::new(Condvar::new()),
        }
    }
}

impl Default for SampleBuffer {
    fn default() -> Self {
        Self::new()
    }
}

/// Packs gain and mute into one `u64` for a single atomic read by the analysis worker.
///
/// Layout:
/// - Bits 0–31  : `f32::to_bits(gain)` where gain is the linear volume (0.0–1.0).
/// - Bit 63     : mute flag (`1` = muted).
/// - Bits 32–62 : zero (reserved).
pub fn pack_gain_mute(gain: f32, muted: bool) -> u64 {
    let gain_bits = gain.clamp(0.0, 1.0).to_bits() as u64;
    let mute_bit: u64 = if muted { 1 << 63 } else { 0 };
    gain_bits | mute_bit
}

/// Unpacks a `u64` into `(gain: f32, muted: bool)`.
pub fn unpack_gain_mute(packed: u64) -> (f32, bool) {
    let gain = f32::from_bits((packed & 0xFFFF_FFFF) as u32);
    let muted = (packed >> 63) & 1 == 1;
    (gain, muted)
}

/// Wraps a Rodio `Source<Item = i16>` and taps PCM samples for spectrum analysis.
///
/// The tap is gated by `is_active`: when false, every `next()` call performs a single
/// relaxed atomic read and immediately forwards the sample — zero heap allocation.
pub struct SpectrumTapSource<I> {
    inner: I,
    /// Gate flag controlled by the analysis command.
    pub is_active: Arc<AtomicBool>,
    /// Pointer to the engine's active sample buffer slot.
    pub buffer_slot: Arc<Mutex<Option<SampleBuffer>>>,
    /// Packed `(gain, muted)` snapshot; written by `set_volume`/`set_muted`.
    pub volume_mute: Arc<AtomicU64>,
    /// Mono sample accumulator for the current window.
    window: Box<[f32; WINDOW_SIZE]>,
    /// How many mono samples have been accumulated so far.
    window_pos: usize,
    /// Samples to skip before accumulating when hop_size > WINDOW_SIZE.
    skip_count: usize,
    /// Step size in mono samples between windows targeting 20 per second.
    hop_size: usize,
    /// Whether the channel count is odd (mono input).
    is_mono: bool,
    /// Pending right-channel sample from the last stereo pair.
    pending_right: Option<f32>,
    /// Number of output channels from the inner source.
    channels: u16,
    /// Sample rate of the inner source.
    sample_rate: u32,
    /// Total duration of the inner source.
    total_duration: Option<Duration>,
}

impl<I> SpectrumTapSource<I>
where
    I: Source<Item = i16>,
{
    /// Wraps `inner` with a spectrum tap. The tap is initially inactive.
    pub fn new(
        inner: I,
        is_active: Arc<AtomicBool>,
        buffer_slot: Arc<Mutex<Option<SampleBuffer>>>,
        volume_mute: Arc<AtomicU64>,
    ) -> Self {
        let channels = inner.channels();
        let sample_rate = inner.sample_rate();
        let total_duration = inner.total_duration();
        let hop_size = if sample_rate == 0 {
            2205
        } else {
            ((sample_rate as f64) / 20.0).round().max(1.0) as usize
        };
        Self {
            inner,
            is_active,
            buffer_slot,
            volume_mute,
            window: Box::new([0.0f32; WINDOW_SIZE]),
            window_pos: 0,
            skip_count: 0,
            hop_size,
            is_mono: channels == 1,
            pending_right: None,
            channels,
            sample_rate,
            total_duration,
        }
    }
}

impl<I> Iterator for SpectrumTapSource<I>
where
    I: Source<Item = i16>,
{
    type Item = i16;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next()?;

        // Fast path: gate is off — single relaxed read, reset partial window.
        if !self.is_active.load(Ordering::Relaxed) {
            if self.window_pos != 0 || self.skip_count != 0 {
                self.window_pos = 0;
                self.skip_count = 0;
                self.pending_right = None;
            }
            return Some(sample);
        }

        // Accumulate mono sample.
        let mono = if self.is_mono {
            sample as f32 / 32768.0
        } else {
            // Stereo interleaving: average each L/R pair.
            match self.pending_right {
                None => {
                    self.pending_right = Some(sample as f32 / 32768.0);
                    return Some(sample);
                }
                Some(left) => {
                    self.pending_right = None;
                    (left + sample as f32 / 32768.0) * 0.5
                }
            }
        };

        // If hop_size > WINDOW_SIZE, skip required samples before next window.
        if self.skip_count > 0 {
            self.skip_count -= 1;
            return Some(sample);
        }

        // Write into preallocated window (zero heap allocation).
        self.window[self.window_pos] = mono;
        self.window_pos += 1;

        // Window is full: try to push to the analysis queue.
        if self.window_pos >= WINDOW_SIZE {
            if let Ok(guard) = self.buffer_slot.try_lock() {
                if let Some(ref buf) = *guard {
                    // Apply current gain/mute snapshot.
                    let (gain, muted) = unpack_gain_mute(self.volume_mute.load(Ordering::Acquire));
                    let effective_gain = if muted { 0.0 } else { gain };
                    let mut copy = Box::new([0.0f32; WINDOW_SIZE]);
                    for (i, &s) in self.window.iter().enumerate() {
                        copy[i] = s * effective_gain;
                    }

                    // try_lock: if contended, drop the window (audio thread must not wait).
                    if let Ok(mut queue) = buf.queue.try_lock() {
                        if queue.len() >= 2 {
                            queue.pop_front();
                        }
                        queue.push_back(copy);
                        buf.condvar.notify_one();
                    }
                    // else: drop the window; playback is unaffected.
                }
            }

            // Advance window by hop_size to target 20 snapshots per second (spec AC-1).
            if self.hop_size < WINDOW_SIZE {
                self.window.copy_within(self.hop_size..WINDOW_SIZE, 0);
                self.window_pos = WINDOW_SIZE - self.hop_size;
                self.skip_count = 0;
            } else {
                self.window_pos = 0;
                self.skip_count = self.hop_size - WINDOW_SIZE;
            }
        }

        Some(sample)
    }
}

impl<I> Source for SpectrumTapSource<I>
where
    I: Source<Item = i16> + Send + 'static,
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

    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.inner.try_seek(pos)?;
        // Reset accumulator on seek so a partial window is not analysed.
        self.window_pos = 0;
        self.skip_count = 0;
        self.pending_right = None;
        Ok(())
    }
}
