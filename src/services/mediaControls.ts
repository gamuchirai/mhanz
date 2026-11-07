/**
 * Media controls service bridging frontend playback state to native
 * Windows System Media Transport Controls (SMTC) via Tauri IPC,
 * with an automated browser/test mock fallback.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  MediaControlActionEvent,
  MediaMetadataDto,
  MediaPlaybackStatusDto,
} from "../types/mediaControls";

type ActionEventListener = (event: MediaControlActionEvent) => void;

interface MockMediaControlsState {
  metadata: MediaMetadataDto | null;
  status: MediaPlaybackStatusDto;
  positionSeconds: number;
  isEnabled: boolean;
  forceMock: boolean;
  actionListeners: Set<ActionEventListener>;
}

const mockState: MockMediaControlsState = {
  metadata: null,
  status: "stopped",
  positionSeconds: 0,
  isEnabled: true,
  forceMock: false,
  actionListeners: new Set(),
};

/**
 * Configure whether the media controls service must use mock mode regardless of Tauri runtime.
 * Essential for Vitest unit tests and browser isolation.
 */
export function setForceMediaControlsMock(force: boolean): void {
  mockState.forceMock = force;
}

/**
 * Checks whether native media controls are active or operating under browser mock.
 */
export function isMediaControlsMockActive(): boolean {
  return mockState.forceMock || !isTauri();
}

/**
 * Retrieves the current state of the mock service (useful in unit tests).
 */
export function getMockMediaControlsState(): Readonly<MockMediaControlsState> {
  return mockState;
}

/**
 * Simulates an incoming hardware media key or OS transport button action (for testing and browser preview).
 */
export function simulateMediaControlsAction(event: MediaControlActionEvent): void {
  mockState.actionListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error("[mediaControls] Error in mock action listener:", err);
    }
  });
}

/**
 * Sends active song metadata to native OS media controls display updater.
 */
export async function mediaControlsSetMetadata(metadata: MediaMetadataDto): Promise<void> {
  if (isMediaControlsMockActive()) {
    mockState.metadata = { ...metadata };
    return;
  }

  try {
    await invoke("media_controls_set_metadata", { metadata });
  } catch (err) {
    console.warn("[mediaControls] Failed to set native metadata:", err);
  }
}

/**
 * Synchronizes playback state (playing, paused, stopped) and elapsed position to OS media controls.
 */
export async function mediaControlsSetPlaybackStatus(
  status: MediaPlaybackStatusDto,
  positionSeconds?: number
): Promise<void> {
  if (isMediaControlsMockActive()) {
    mockState.status = status;
    if (typeof positionSeconds === "number") {
      mockState.positionSeconds = positionSeconds;
    }
    return;
  }

  try {
    await invoke("media_controls_set_playback_status", {
      status,
      positionSeconds: positionSeconds ?? null,
    });
  } catch (err) {
    console.warn("[mediaControls] Failed to set native playback status:", err);
  }
}

/**
 * Enables or disables operating system media controls and global media key hooks.
 */
export async function mediaControlsSetEnabled(enabled: boolean): Promise<void> {
  if (isMediaControlsMockActive()) {
    mockState.isEnabled = enabled;
    return;
  }

  try {
    await invoke("media_controls_set_enabled", { enabled });
  } catch (err) {
    console.warn("[mediaControls] Failed to toggle native media controls:", err);
  }
}

/**
 * Clears active song metadata and resets OS media display to stopped.
 */
export async function mediaControlsClear(): Promise<void> {
  if (isMediaControlsMockActive()) {
    mockState.metadata = null;
    mockState.status = "stopped";
    mockState.positionSeconds = 0;
    return;
  }

  try {
    await invoke("media_controls_clear");
  } catch (err) {
    console.warn("[mediaControls] Failed to clear native media controls:", err);
  }
}

/**
 * Subscribes to operating system media control action events.
 */
export async function listenMediaControlsAction(
  callback: ActionEventListener
): Promise<UnlistenFn> {
  if (isMediaControlsMockActive()) {
    mockState.actionListeners.add(callback);
    return () => {
      mockState.actionListeners.delete(callback);
    };
  }

  try {
    return await listen<MediaControlActionEvent>("media-controls:action", (event) => {
      callback(event.payload);
    });
  } catch (err) {
    console.warn("[mediaControls] Failed to listen to media-controls:action, using fallback:", err);
    mockState.actionListeners.add(callback);
    return () => {
      mockState.actionListeners.delete(callback);
    };
  }
}
