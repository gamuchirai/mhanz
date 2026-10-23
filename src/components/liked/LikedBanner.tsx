import { useMemo } from "react";
import {
  useLikedSongsStore,
  useLikedTracks,
  useUnlikedPendingIds,
} from "../../store/useLikedSongsStore";
import { formatTotalDuration } from "../../utils/format";

export function LikedBanner() {
  const tracks = useLikedTracks();
  const unlikedPendingIds = useUnlikedPendingIds();
  const playAll = useLikedSongsStore((state) => state.playAll);
  const shuffleAll = useLikedSongsStore((state) => state.shuffleAll);

  // Calculate dynamic stats for currently favorited tracks
  const { likedCount, totalDurationFormatted } = useMemo(() => {
    const activeLikedTracks = tracks.filter(
      (t) => !unlikedPendingIds.includes(t.id) && t.isLiked
    );
    const count = activeLikedTracks.length;
    const totalSeconds = activeLikedTracks.reduce(
      (sum, t) => sum + t.durationSeconds,
      0
    );

    return {
      likedCount: count,
      totalDurationFormatted: formatTotalDuration(totalSeconds),
    };
  }, [tracks, unlikedPendingIds]);

  const hasSongs = likedCount > 0;

  return (
    <section
      aria-label="Liked songs hero banner"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: "28px",
        padding: "36px 36px 28px",
        borderRadius: "18px",
        background:
          "linear-gradient(180deg, rgba(240, 169, 130, 0.18) 0%, rgba(24, 17, 15, 0.6) 100%)",
        border: "1px solid rgba(240, 169, 130, 0.14)",
        boxShadow: "0 16px 40px -12px rgba(0, 0, 0, 0.4)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Illuminated Heart Artwork Badge */}
      <div
        style={{
          width: "140px",
          height: "140px",
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, #43170e 0%, #873620 48%, #f0a982 100%)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 12px 32px rgba(240, 169, 130, 0.28)",
          flexShrink: 0,
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))",
          }}
          aria-hidden="true"
        >
          <path
            fill="#ffffff"
            stroke="none"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </div>

      {/* Header Metadata and Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: ".2em",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          Playlist
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: "44px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--t)",
          }}
        >
          Liked Songs
        </h1>

        {/* Collection stats line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "4px",
            fontSize: "13px",
            color: "var(--m)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--t)" }}>madebyadah</span>
          <span>•</span>
          <span aria-label={`${likedCount} songs`}>
            {likedCount} {likedCount === 1 ? "song" : "songs"}
          </span>
          {hasSongs && (
            <>
              <span>•</span>
              <span aria-label={`Total duration ${totalDurationFormatted}`}>
                {totalDurationFormatted}
              </span>
            </>
          )}
        </div>

        {/* Action button triggers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          <button
            onClick={playAll}
            disabled={!hasSongs}
            aria-label="Play all liked songs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "24px",
              background: hasSongs
                ? "var(--accent)"
                : "rgba(255, 255, 255, 0.1)",
              color: hasSongs ? "#1a0e08" : "var(--m)",
              border: 0,
              fontSize: "14px",
              fontWeight: 700,
              cursor: hasSongs ? "pointer" : "not-allowed",
              boxShadow: hasSongs
                ? "0 4px 16px rgba(240, 169, 130, 0.35)"
                : "none",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
            Play All
          </button>

          <button
            onClick={shuffleAll}
            disabled={!hasSongs}
            aria-label="Shuffle liked songs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.06)",
              color: hasSongs ? "var(--t)" : "var(--m)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: hasSongs ? "pointer" : "not-allowed",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            Shuffle
          </button>
        </div>
      </div>
    </section>
  );
}
