import { create } from "zustand";
import type {
  LibrarySortColumn,
  LibrarySortState,
  LibraryTrack,
  MusicFolder,
} from "../types/library";
import { initialMusicFolders, initialLibraryTracks } from "../data/libraryFixtures";
import { usePlayerStore } from "./usePlayerStore";

export interface LibraryState {
  folders: MusicFolder[];
  tracks: LibraryTrack[];
  isFolderPanelExpanded: boolean;
  selectedFolderId: string | null;
  filterQuery: string;
  sortState: LibrarySortState;
  isAddFolderModalOpen: boolean;
  folderPendingRemoval: MusicFolder | null;

  toggleFolderPanel: () => void;
  setSelectedFolder: (folderId: string | null) => void;
  setFilterQuery: (query: string) => void;
  setSortColumn: (column: LibrarySortColumn) => void;
  openAddFolderModal: () => void;
  closeAddFolderModal: () => void;
  addFolder: (folderPath: string, displayName: string, mockTracks: LibraryTrack[]) => void;
  openRemoveFolderDialog: (folder: MusicFolder) => void;
  closeRemoveFolderDialog: () => void;
  confirmRemoveFolder: (purgeTracks: boolean) => void;
  rescanFolder: (folderId: string) => void;
  toggleLikeTrack: (trackId: string) => void;
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

  addFolder: (folderPath: string, displayName: string, mockTracks: LibraryTrack[]) => {
    const { folders, tracks } = get();
    // Normalize path to check duplicates
    const normalizedPath = folderPath.trim();
    if (folders.some((f) => f.folderPath.toLowerCase() === normalizedPath.toLowerCase())) {
      set({ isAddFolderModalOpen: false });
      return;
    }

    const folderId = `folder-${Date.now()}`;
    const totalSizeBytes = mockTracks.reduce((acc, t) => acc + (t.fileSizeBytes ?? 8000000), 0);

    const newFolder: MusicFolder = {
      id: folderId,
      folderPath: normalizedPath,
      displayName: displayName.trim() || normalizedPath.split("/").pop() || "Music Folder",
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

  confirmRemoveFolder: (purgeTracks: boolean) => {
    const { folderPendingRemoval, folders, tracks, selectedFolderId } = get();
    if (!folderPendingRemoval) return;

    const targetId = folderPendingRemoval.id;
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

  rescanFolder: (folderId: string) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folderId ? { ...f, isScanning: true } : f)),
    }));

    setTimeout(() => {
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === folderId ? { ...f, isScanning: false, lastScanned: "Just now" } : f
        ),
      }));
    }, 1000);
  },

  toggleLikeTrack: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isLiked: !t.isLiked } : t)),
    }));

    // Mirror to player store for seamless playback synchronization
    usePlayerStore.getState().toggleLike(trackId);
  },
}));

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
