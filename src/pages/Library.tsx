import { useEffect } from "react";
import {
  useLibraryFolders,
  useLibraryStore,
  useLibraryTracks,
  useSelectedFolderId,
} from "../store/useLibraryStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { LibraryHeader } from "../components/library/LibraryHeader";
import { FolderManagerPanel } from "../components/library/FolderManagerPanel";
import { SongTable } from "../components/library/SongTable";
import { EmptyLibraryState } from "../components/library/EmptyLibraryState";
import { FolderSelectionModal } from "../components/library/FolderSelectionModal";
import { FolderRemovalDialog } from "../components/library/FolderRemovalDialog";
import type { Track } from "../types/discovery";

export function Library() {
  const folders = useLibraryFolders();
  const tracks = useLibraryTracks();
  const selectedFolderId = useSelectedFolderId();
  const filterQuery = useLibraryStore((state) => state.filterQuery);

  const playCollection = usePlayerStore((state) => state.playCollection);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    useLibraryStore
      .getState()
      .initScanner()
      .then((unsub) => {
        cleanup = unsub;
      });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Get currently active tracks according to active folder and search query
  const getActiveTracks = (): Track[] => {
    let result = [...tracks];
    if (selectedFolderId) {
      result = result.filter((t) => t.folderId === selectedFolderId);
    }
    const query = filterQuery.trim().toLowerCase();
    if (query.length > 0) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
      );
    }

    const sortState = useLibraryStore.getState().sortState;
    const { column, direction } = sortState;
    result.sort((a, b) => {
      let comparison = 0;
      if (column === "durationSeconds") {
        comparison = a.durationSeconds - b.durationSeconds;
      } else if (column === "dateAdded") {
        comparison = a.dateAdded.localeCompare(b.dateAdded);
      } else if (column === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (column === "artist") {
        comparison = a.artist.localeCompare(b.artist);
      } else if (column === "album") {
        comparison = a.album.localeCompare(b.album);
      }

      if (comparison !== 0) {
        return direction === "asc" ? comparison : -comparison;
      }

      return a.title.localeCompare(b.title);
    });

    return result.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationSeconds: t.durationSeconds,
      artworkUrl: t.artworkUrl,
      playsCount: t.playsCount,
      isLiked: Boolean(likedTrackIds[t.id] ?? t.isLiked),
      filePath: t.filePath,
      genre: t.genre,
    }));
  };

  const handlePlayAll = () => {
    const active = getActiveTracks();
    if (active.length > 0) {
      playCollection(active, 0);
    }
  };

  const handleShuffleAll = () => {
    const active = getActiveTracks();
    if (active.length > 0) {
      // Fisher-Yates shuffle
      const shuffled = [...active];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      playCollection(shuffled, 0);
    }
  };

  const hasNoFolders = folders.length === 0;

  return (
    <main
      role="main"
      aria-label="Your library and folder browser"
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-6 bg-[radial-gradient(900px_420px_at_70%_0,rgba(214,122,84,0.12),transparent_70%)] bg-[#110c0a]"
    >
      {/* Summary Header */}
      <LibraryHeader onPlayAll={handlePlayAll} onShuffleAll={handleShuffleAll} />

      {/* Collapsible Folder Manager Panel */}
      <FolderManagerPanel />

      {/* Main Content Area */}
      {hasNoFolders ? <EmptyLibraryState /> : <SongTable />}

      {/* Dialogs and Modals */}
      <FolderSelectionModal />
      <FolderRemovalDialog />
    </main>
  );
}
