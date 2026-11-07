//! Native operating system media keys and transport controls module.

use std::ops::Deref;
use std::sync::Arc;

pub mod manager;
pub mod models;

#[cfg(test)]
mod tests;

pub use manager::MediaControlsManager;
pub use models::{MediaControlActionEvent, MediaMetadataDto, MediaPlaybackStatusDto};

/// Tauri managed state wrapper for the native media controls manager.
#[derive(Clone)]
pub struct MediaControlsState(pub Arc<MediaControlsManager>);

impl Deref for MediaControlsState {
    type Target = MediaControlsManager;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
