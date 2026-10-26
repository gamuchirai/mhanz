/**
 * Scanner client service bridging React components and Zustand stores
 * to the native Rust background worker via Tauri IPC commands and events.
 */

import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ActiveScanStatusDto,
  ScanCompletedPayload,
  ScanJobStartDto,
  ScanProgressPayload,
} from "../types/scanner";

// Listeners for browser / test mock mode
type ProgressCallback = (payload: ScanProgressPayload) => void;
type CompletedCallback = (payload: ScanCompletedPayload) => void;

interface MockScannerState {
  isScanning: boolean;
  activeFolderId: string | null;
  progressListeners: Set<ProgressCallback>;
  completedListeners: Set<CompletedCallback>;
  mockTimer: ReturnType<typeof setTimeout> | null;
}

const mockScanner: MockScannerState = {
  isScanning: false,
  activeFolderId: null,
  progressListeners: new Set(),
  completedListeners: new Set(),
  mockTimer: null,
};

/**
 * Triggers background scanning for the specified folder.
 */
export async function scannerScanFolder(folderId: string): Promise<ScanJobStartDto> {
  if (isTauri()) {
    return invoke<ScanJobStartDto>("scanner_scan_folder", { folderId });
  }

  // Browser / Vitest mock mode
  if (mockScanner.isScanning) {
    throw new Error("SCANNER_BUSY");
  }

  mockScanner.isScanning = true;
  mockScanner.activeFolderId = folderId;

  // Simulate progress
  setTimeout(() => {
    const progress: ScanProgressPayload = {
      folderId,
      phase: "parsing",
      scannedFiles: 5,
      totalFiles: 10,
      newTracks: 5,
      updatedTracks: 0,
      removedTracks: 0,
      currentFile: "/mock/music/track1.mp3",
      elapsedMs: 150,
    };
    mockScanner.progressListeners.forEach((cb) => cb(progress));
  }, 50);

  // Simulate completion
  mockScanner.mockTimer = setTimeout(() => {
    mockScanner.isScanning = false;
    mockScanner.activeFolderId = null;
    const completed: ScanCompletedPayload = {
      folderId,
      totalScanned: 10,
      newTracks: 10,
      updatedTracks: 0,
      removedTracks: 0,
      elapsedMs: 300,
      errors: [],
    };
    mockScanner.completedListeners.forEach((cb) => cb(completed));
  }, 100);

  return {
    folderId,
    status: "started",
    startedAt: Date.now(),
  };
}

/**
 * Cancels an in-progress scan for the given folder or active scan.
 */
export async function scannerCancelScan(folderId?: string): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>("scanner_cancel_scan", { folderId });
  }

  if (!mockScanner.isScanning) {
    throw new Error("NO_ACTIVE_SCAN");
  }

  if (mockScanner.mockTimer) {
    clearTimeout(mockScanner.mockTimer);
    mockScanner.mockTimer = null;
  }
  mockScanner.isScanning = false;
  mockScanner.activeFolderId = null;
  return true;
}

/**
 * Queries the current background scan coordinator status.
 */
export async function scannerGetScanStatus(): Promise<ActiveScanStatusDto> {
  if (isTauri()) {
    return invoke<ActiveScanStatusDto>("scanner_get_scan_status");
  }

  return {
    isScanning: mockScanner.isScanning,
    activeFolderId: mockScanner.activeFolderId,
    phase: mockScanner.isScanning ? "parsing" : "idle",
    scannedFiles: mockScanner.isScanning ? 5 : 0,
    totalFiles: mockScanner.isScanning ? 10 : 0,
    currentFile: mockScanner.isScanning ? "/mock/music/track1.mp3" : null,
    startedAt: mockScanner.isScanning ? Date.now() - 100 : null,
  };
}

/**
 * Subscribes to throttled scan progress events.
 */
export async function onScanProgress(
  callback: (payload: ScanProgressPayload) => void
): Promise<UnlistenFn> {
  if (isTauri()) {
    return listen<ScanProgressPayload>("library://scan-progress", (event) => {
      callback(event.payload);
    });
  }

  mockScanner.progressListeners.add(callback);
  return () => {
    mockScanner.progressListeners.delete(callback);
  };
}

/**
 * Subscribes to scan completion events.
 */
export async function onScanCompleted(
  callback: (payload: ScanCompletedPayload) => void
): Promise<UnlistenFn> {
  if (isTauri()) {
    return listen<ScanCompletedPayload>("library://scan-completed", (event) => {
      callback(event.payload);
    });
  }

  mockScanner.completedListeners.add(callback);
  return () => {
    mockScanner.completedListeners.delete(callback);
  };
}

/**
 * Adapts local filesystem artwork paths into displayable Webview URLs.
 */
export function formatCoverArtUrl(coverPath: string | null | undefined): string {
  if (!coverPath || coverPath.trim().length === 0) {
    return "";
  }
  if (
    coverPath.startsWith("http://") ||
    coverPath.startsWith("https://") ||
    coverPath.startsWith("data:")
  ) {
    return coverPath;
  }
  if (isTauri()) {
    try {
      return convertFileSrc(coverPath);
    } catch {
      return "";
    }
  }
  return coverPath;
}
