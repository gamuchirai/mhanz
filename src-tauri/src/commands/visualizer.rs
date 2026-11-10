//! Tauri IPC command handlers for audio spectrum analysis streaming.

use tauri::ipc::Channel;
use tauri::State;

use crate::audio::{analyzer::SpectrumFrame, AudioError, AudioState};

/// Initiates live spectrum analysis streaming through a typed Tauri Channel.
#[tauri::command]
pub async fn start_spectrum_analysis(
    channel: Channel<SpectrumFrame>,
    state: State<'_, AudioState>,
) -> Result<(), AudioError> {
    state.0.start_spectrum_analysis(channel)
}

/// Idempotently halts live spectrum analysis and releases the channel stream.
#[tauri::command]
pub async fn stop_spectrum_analysis(state: State<'_, AudioState>) -> Result<(), AudioError> {
    state.0.stop_spectrum_analysis()
}
