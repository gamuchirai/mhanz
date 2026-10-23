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
  const cleanupUnlikedTracks = useLikedSongsStore(
    (state) => state.cleanupUnlikedTracks
  );

  // AC-12: Purge unliked tracks upon navigating away from the view
  useEffect(() => {
    return () => {
      cleanupUnlikedTracks();
    };
  }, [cleanupUnlikedTracks]);

  const activeLikedTracks = tracks.filter(
    (t) => !unlikedPendingIds.includes(t.id) && t.isLiked
  );

  const hasNoLikedTracks = tracks.length === 0 || (activeLikedTracks.length === 0 && unlikedPendingIds.length === 0);

  return (
    <main
      role="main"
      aria-label="Liked songs screen"
      style={{
        gridColumn: 2,
        gridRow: 1,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 32px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        background:
          "radial-gradient(1000px 480px at 60% 0, rgba(240, 169, 130, 0.12), transparent 70%), #110c0a",
      }}
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
