/**
 * Library domain and state types for local folder browsing and track indexing.
 */

export interface MusicFolder {
  id: string;
  folderPath: string;
  displayName: string;
  trackCount: number;
  totalSizeBytes: number;
  lastScanned: string;
  isScanning?: boolean;
}

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath: string;
  folderId: string;
  dateAdded: string;
  genre?: string;
  bitrate?: number;
  fileSizeBytes?: number;
}

export type LibrarySortColumn =
  | "title"
  | "artist"
  | "album"
  | "durationSeconds"
  | "dateAdded";

export type SortDirection = "asc" | "desc";

export interface LibrarySortState {
  column: LibrarySortColumn;
  direction: SortDirection;
}

export interface PresetFolderOption {
  id: string;
  displayName: string;
  folderPath: string;
  description: string;
  tracks: LibraryTrack[];
}
