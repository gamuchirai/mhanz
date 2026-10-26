import { useEffect } from "react";
import { LikedBanner } from "../components/liked/LikedBanner";
import { LikedFilterBar } from "../components/liked/LikedFilterBar";
import { LikedSongTable } from "../components/liked/LikedSongTable";
import { EmptyLikedState } from "../components/liked/EmptyLikedState";
import {
  useLikedSongsStore,
  useLikedTracks,
  useUnlikedPendingIds,
} from "../store/useLikedSongsStore";

interface LikedSongsProps {
  onNavigate?: (navId: string) => void;
}

export function LikedSongs({ onNavigate }: LikedSongsProps) {
  const tracks = useLikedTracks();
  const unlikedPendingIds = useUnlikedPendingIds();
  const cleanupUnlikedTracks = useLikedSongsStore((state) => state.cleanupUnlikedTracks);
  const initializeLikedSongs = useLikedSongsStore((state) => state.initializeLikedSongs);
  const isLoaded = useLikedSongsStore((state) => state.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      initializeLikedSongs().catch(() => {});
    }
  }, [isLoaded, initializeLikedSongs]);

  // AC-12: Purge unliked tracks upon navigating away from the view
  useEffect(() => {
    return () => {
      cleanupUnlikedTracks();
    };
  }, [cleanupUnlikedTracks]);

  const activeLikedTracks = tracks.filter((t) => !unlikedPendingIds.includes(t.id) && t.isLiked);

  const hasNoLikedTracks =
    tracks.length === 0 || (activeLikedTracks.length === 0 && unlikedPendingIds.length === 0);

  return (
    <main
      role="main"
      aria-label="Liked songs screen"
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-6 bg-[radial-gradient(1000px_480px_at_60%_0,rgba(240,169,130,0.12),transparent_70%)] bg-[#110c0a]"
    >
      {/* Decorative Hero Banner */}
      <LikedBanner />

      {/* Main View Content: Empty state or filter bar & songs table */}
      {hasNoLikedTracks ? (
        <EmptyLikedState onExploreMusic={() => onNavigate?.("Search")} />
      ) : (
        <>
          <LikedFilterBar />
          <LikedSongTable />
        </>
      )}
    </main>
  );
}
