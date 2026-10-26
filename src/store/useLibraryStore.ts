import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import type {
  LibrarySortColumn,
  LibrarySortState,
  LibraryTrack,
  MusicFolder,
} from "../types/library";
import type { ScanCompletedPayload, ScanProgressPayload } from "../types/scanner";
import type { FolderDto, TrackDto } from "../types/database";
import { initialMusicFolders, initialLibraryTracks } from "../data/libraryFixtures";
import {
  formatCoverArtUrl,
  onScanCompleted,
  onScanProgress,
  scannerCancelScan,
  scannerScanFolder,
} from "../services/scanner";
import { dbAddFolder, dbGetFolders, dbGetTracks, dbRemoveFolder } from "../services/db";
import { favoritesSync } from "../services/favoritesSync";

/**
 * Maps SQLite TrackDto to frontend LibraryTrack presentation model.
 */
export function mapTrackDtoToLibraryTrack(dto: TrackDto): LibraryTrack {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist_name,
    album: dto.album_name || "Unknown Album",
    durationSeconds: Math.round(dto.duration),
    artworkUrl: formatCoverArtUrl(dto.cover_art_path),
    playsCount: dto.play_count,
    isLiked: dto.is_favorite,
    filePath: dto.file_path,
    folderId: dto.folder_id || "",
    dateAdded: dto.created_at
      ? new Date(dto.created_at * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    genre: dto.genre || undefined,
    bitrate: dto.bitrate || undefined,
    fileSizeBytes: dto.file_size_bytes,
  };
}

/**
 * Maps SQLite FolderDto to frontend MusicFolder model.
 */
export function mapFolderDtoToMusicFolder(
  dto: FolderDto,
  trackCount = 0,
  totalSize = 0
): MusicFolder {
  const name = dto.path.split(/[/\\]/).filter(Boolean).pop() || "Music Folder";
  const lastScanned = dto.last_scanned_at
    ? new Date(dto.last_scanned_at * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  return {
    id: dto.id,
    folderPath: dto.path,
    displayName: name,
    trackCount,
    totalSizeBytes: totalSize,
    lastScanned,
    isScanning: false,
  };
}

export interface LibraryState {
  folders: MusicFolder[];
  tracks: LibraryTrack[];
  isFolderPanelExpanded: boolean;
  selectedFolderId: string | null;
  filterQuery: string;
  sortState: LibrarySortState;
  isAddFolderModalOpen: boolean;
  folderPendingRemoval: MusicFolder | null;
  scanProgress: ScanProgressPayload | null;
  isInitialized: boolean;

  toggleFolderPanel: () => void;
  setSelectedFolder: (folderId: string | null) => void;
  setFilterQuery: (query: string) => void;
  setSortColumn: (column: LibrarySortColumn) => void;
  openAddFolderModal: () => void;
  closeAddFolderModal: () => void;
  addFolder: (folderPath: string, displayName: string, mockTracks: LibraryTrack[]) => Promise<void>;
  openRemoveFolderDialog: (folder: MusicFolder) => void;
  closeRemoveFolderDialog: () => void;
  confirmRemoveFolder: (purgeTracks: boolean) => Promise<void>;
  rescanFolder: (folderId: string) => Promise<void>;
  cancelScan: (folderId?: string) => Promise<void>;
  toggleLikeTrack: (trackId: string) => void;
  refreshFromDatabase: () => Promise<void>;
  initScanner: () => Promise<() => void>;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  folders: initialMusicFolders,
  tracks: initialLibraryTracks,
  isFolderPanelExpanded: false,
  selectedFolderId: null,
  filterQuery: "",
  sortState: {
    column: "title",
    direction: "asc",
  },
  isAddFolderModalOpen: false,
  folderPendingRemoval: null,
  scanProgress: null,
  isInitialized: false,

  toggleFolderPanel: () => {
    set((state) => ({ isFolderPanelExpanded: !state.isFolderPanelExpanded }));
  },

  setSelectedFolder: (folderId: string | null) => {
    set((state) => ({
      selectedFolderId: state.selectedFolderId === folderId ? null : folderId,
    }));
  },

  setFilterQuery: (query: string) => {
    set({ filterQuery: query });
  },

  setSortColumn: (column: LibrarySortColumn) => {
    set((state) => {
      if (state.sortState.column === column) {
        return {
          sortState: {
            column,
            direction: state.sortState.direction === "asc" ? "desc" : "asc",
          },
        };
      }
      return {
        sortState: {
          column,
          direction: "asc",
        },
      };
    });
  },

  openAddFolderModal: () => {
    set({ isAddFolderModalOpen: true });
  },

  closeAddFolderModal: () => {
    set({ isAddFolderModalOpen: false });
  },

  addFolder: async (folderPath: string, displayName: string, mockTracks: LibraryTrack[]) => {
    const { folders, tracks } = get();
    const normalizedPath = folderPath.trim();
    if (folders.some((f) => f.folderPath.toLowerCase() === normalizedPath.toLowerCase())) {
      set({ isAddFolderModalOpen: false });
      return;
    }

    if (isTauri()) {
      try {
        const createdFolder = await dbAddFolder(normalizedPath);
        await get().refreshFromDatabase();
        set({ isAddFolderModalOpen: false });
        // Automatically kick off initial scan
        await get().rescanFolder(createdFolder.id);
        return;
      } catch (err) {
        console.error("Failed to add folder to database:", err);
      }
    }

    // Mock / browser fallback
    const folderId = `folder-${Date.now()}`;
    const totalSizeBytes = mockTracks.reduce((acc, t) => acc + (t.fileSizeBytes ?? 8000000), 0);

    const newFolder: MusicFolder = {
      id: folderId,
      folderPath: normalizedPath,
      displayName: displayName.trim() || normalizedPath.split(/[/\\]/).pop() || "Music Folder",
      trackCount: mockTracks.length,
      totalSizeBytes,
      lastScanned: "Just now",
      isScanning: false,
    };

    const assignedTracks = mockTracks.map((t, idx) => ({
      ...t,
      id: t.id || `lib-${folderId}-${idx}`,
      folderId,
      dateAdded: t.dateAdded || new Date().toISOString().split("T")[0],
    }));

    set({
      folders: [...folders, newFolder],
      tracks: [...tracks, ...assignedTracks],
      isAddFolderModalOpen: false,
    });
  },

  openRemoveFolderDialog: (folder: MusicFolder) => {
    set({ folderPendingRemoval: folder });
  },

  closeRemoveFolderDialog: () => {
    set({ folderPendingRemoval: null });
  },

  confirmRemoveFolder: async (purgeTracks: boolean) => {
    const { folderPendingRemoval, folders, tracks, selectedFolderId } = get();
    if (!folderPendingRemoval) return;

    const targetId = folderPendingRemoval.id;

    if (isTauri()) {
      try {
        await dbRemoveFolder(targetId);
        await get().refreshFromDatabase();
        set({
          selectedFolderId: selectedFolderId === targetId ? null : selectedFolderId,
          folderPendingRemoval: null,
        });
        return;
      } catch (err) {
        console.error("Failed to remove folder from database:", err);
      }
    }

    const updatedFolders = folders.filter((f) => f.id !== targetId);
    const updatedTracks = purgeTracks
      ? tracks.filter((t) => t.folderId !== targetId)
      : tracks.map((t) => (t.folderId === targetId ? { ...t, folderId: "" } : t));

    set({
      folders: updatedFolders,
      tracks: updatedTracks,
      selectedFolderId: selectedFolderId === targetId ? null : selectedFolderId,
      folderPendingRemoval: null,
    });
  },

  rescanFolder: async (folderId: string) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folderId ? { ...f, isScanning: true } : f)),
    }));

    if (isTauri()) {
      try {
        await scannerScanFolder(folderId);
      } catch (err) {
        console.error("Failed to start scan:", err);
        set((state) => ({
          folders: state.folders.map((f) => (f.id === folderId ? { ...f, isScanning: false } : f)),
        }));
      }
    } else {
      setTimeout(() => {
        set((state) => ({
          scanProgress: null,
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, isScanning: false, lastScanned: "Just now" } : f
          ),
        }));
      }, 1000);
    }
  },

  cancelScan: async (folderId?: string) => {
    try {
      await scannerCancelScan(folderId);
      set((state) => ({
        scanProgress: null,
        folders: state.folders.map((f) =>
          folderId
            ? f.id === folderId
              ? { ...f, isScanning: false }
              : f
            : { ...f, isScanning: false }
        ),
      }));
    } catch (err) {
      console.error("Failed to cancel scan:", err);
    }
  },

  toggleLikeTrack: (trackId: string) => {
    const track = get().tracks.find((t) => t.id === trackId);
    if (!track) return;
    favoritesSync.toggleFavorite(trackId, track.isLiked).catch((err) => {
      console.error("Failed to toggle favorite:", err);
    });
  },

  refreshFromDatabase: async () => {
    try {
      const [foldersDto, tracksRes] = await Promise.all([dbGetFolders(), dbGetTracks(0, 500)]);

      if (foldersDto && foldersDto.length > 0) {
        const convertedTracks: LibraryTrack[] = tracksRes.items.map(mapTrackDtoToLibraryTrack);
        const convertedFolders: MusicFolder[] = foldersDto.map((f: FolderDto) => {
          const folderTracks = convertedTracks.filter((t: LibraryTrack) => t.folderId === f.id);
          const totalSize = folderTracks.reduce(
            (acc: number, t: LibraryTrack) => acc + (t.fileSizeBytes ?? 0),
            0
          );
          return mapFolderDtoToMusicFolder(f, folderTracks.length, totalSize);
        });

        set({
          folders: convertedFolders,
          tracks: convertedTracks,
        });
      }
    } catch (err) {
      console.warn("Could not refresh library from database:", err);
    }
  },

  initScanner: async () => {
    // Subscribe to scanner progress events (AC-11)
    const unlistenProgress = await onScanProgress((payload: ScanProgressPayload) => {
      set((state) => ({
        scanProgress: payload,
        folders: state.folders.map((f) =>
          f.id === payload.folderId ? { ...f, isScanning: true } : f
        ),
      }));
    });

    // Subscribe to scanner completion events (AC-11, AC-12)
    const unlistenCompleted = await onScanCompleted(async (payload: ScanCompletedPayload) => {
      set((state) => ({
        scanProgress: null,
        folders: state.folders.map((f) =>
          f.id === payload.folderId ? { ...f, isScanning: false, lastScanned: "Just now" } : f
        ),
      }));
      // Automatically reload song table upon scan completion (AC-12)
      await get().refreshFromDatabase();
    });

    if (isTauri()) {
      await get().refreshFromDatabase();
    }

    set({ isInitialized: true });

    return () => {
      if (typeof unlistenProgress === "function") unlistenProgress();
      if (typeof unlistenCompleted === "function") unlistenCompleted();
    };
  },
}));

// Synchronize favorite status across library tracks
favoritesSync.subscribe((trackId: string, isLiked: boolean) => {
  useLibraryStore.setState((state) => ({
    tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isLiked } : t)),
  }));
});

// Performance-optimized selector hooks
export const useLibraryFolders = () => useLibraryStore((state) => state.folders);
export const useLibraryTracks = () => useLibraryStore((state) => state.tracks);
export const useIsFolderPanelExpanded = () =>
  useLibraryStore((state) => state.isFolderPanelExpanded);
export const useSelectedFolderId = () => useLibraryStore((state) => state.selectedFolderId);
export const useLibraryFilterQuery = () => useLibraryStore((state) => state.filterQuery);
export const useLibrarySortState = () => useLibraryStore((state) => state.sortState);
export const useIsAddFolderModalOpen = () => useLibraryStore((state) => state.isAddFolderModalOpen);
export const useFolderPendingRemoval = () => useLibraryStore((state) => state.folderPendingRemoval);
export const useScanProgress = () => useLibraryStore((state) => state.scanProgress);
