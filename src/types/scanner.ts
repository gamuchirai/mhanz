/**
 * Local library scanner domain types and DTO contracts.
 */

export interface ScanJobStartDto {
  folderId: string;
  status: "started";
  startedAt: number;
}

export interface ActiveScanStatusDto {
  isScanning: boolean;
  activeFolderId: string | null;
  phase: "idle" | "discovering" | "parsing" | "committing" | "pruning";
  scannedFiles: number;
  totalFiles: number;
  currentFile: string | null;
  startedAt: number | null;
}

export interface ScanProgressPayload {
  folderId: string;
  phase: "discovering" | "parsing" | "committing" | "pruning";
  scannedFiles: number;
  totalFiles: number;
  newTracks: number;
  updatedTracks: number;
  removedTracks: number;
  currentFile: string;
  elapsedMs: number;
}

export interface ScanCompletedPayload {
  folderId: string;
  totalScanned: number;
  newTracks: number;
  updatedTracks: number;
  removedTracks: number;
  elapsedMs: number;
  errors: Array<{ filePath: string; message: string }>;
}
