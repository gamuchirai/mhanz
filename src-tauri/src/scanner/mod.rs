//! Local library scanner, tag extraction, and metadata indexing module.

use std::sync::Arc;

pub mod batch_writer;
pub mod discovery;
pub mod metadata;
pub mod models;
pub mod service;

pub use models::{
    ActiveScanStatusDto, ScanCompletedPayload, ScanErrorItem, ScanJobStartDto, ScanPhase,
    ScanProgressPayload, ScannedTrackData,
};
pub use service::ScannerManager;

/// Managed state container holding the singleton ScannerManager instance.
pub struct ScannerState(pub Arc<ScannerManager>);

impl ScannerState {
    pub fn new(manager: Arc<ScannerManager>) -> Self {
        Self(manager)
    }
}

#[cfg(test)]
mod tests;
