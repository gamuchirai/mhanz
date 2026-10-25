//! Audio playback subsystem encapsulating Rodio playback, state management, and event emissions.

pub mod engine;
pub mod error;
pub mod models;

#[cfg(test)]
mod tests;

use std::sync::Arc;

pub use engine::AudioEngine;
pub use error::AudioError;
pub use models::*;

/// Thread safe state wrapper registered into Tauri managed state.
#[derive(Clone)]
pub struct AudioState(pub Arc<AudioEngine>);

impl AudioState {
    /// Creates a new AudioState wrapping the provided engine instance.
    pub fn new(engine: AudioEngine) -> Self {
        Self(Arc::new(engine))
    }
}
