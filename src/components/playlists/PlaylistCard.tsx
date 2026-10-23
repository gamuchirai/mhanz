import { useState } from "react";
import type { Playlist } from "../../types/playlist";
import { usePlaylistStore, usePlaylistTracksByPlaylistId } from "../../store/usePlaylistStore";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const trackEntries = usePlaylistTracksByPlaylistId(playlist.id);
  const trackCount = trackEntries.length;

  const setActivePlaylistId = usePlaylistStore((state) => state.setActivePlaylistId);
  const playPlaylist = usePlaylistStore((state) => state.playPlaylist);

  const handleCardClick = () => {
    setActivePlaylistId(playlist.id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPlaylist(playlist.id, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActivePlaylistId(playlist.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${playlist.title} playlist`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "14px",
        borderRadius: "14px",
        background: isHovered ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
        border: isHovered
          ? "1px solid rgba(240, 169, 130, 0.3)"
          : "1px solid rgba(255, 255, 255, 0.06)",
        cursor: "pointer",
        transition:
          "transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered
          ? "0 12px 24px -8px rgba(0, 0, 0, 0.5), 0 0 16px -4px rgba(240, 169, 130, 0.15)"
          : "none",
        outline: "none",
      }}
    >
      {/* Cover Artwork Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "100%", // 1:1 Aspect ratio
          borderRadius: "10px",
          overflow: "hidden",
          background: playlist.coverGradient,
          boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
        }}
      >
        {playlist.coverUrl && (
          <img
            src={playlist.coverUrl}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Curated / Creator Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: playlist.isCurated ? "rgba(240, 169, 130, 0.9)" : "rgba(11, 7, 6, 0.75)",
            color: playlist.isCurated ? "#18110f" : "var(--t)",
            backdropFilter: "blur(6px)",
            border: playlist.isCurated ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {playlist.isCurated ? "Curated" : "By madebyadah"}
        </div>

        {/* Floating Play Trigger on Hover */}
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={`Play ${playlist.title}`}
          disabled={trackCount === 0}
          style={{
            position: "absolute",
            right: "12px",
            bottom: "12px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: trackCount === 0 ? "rgba(255, 255, 255, 0.15)" : "var(--accent)",
            color: trackCount === 0 ? "var(--m)" : "#18110f",
            border: 0,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
            cursor: trackCount === 0 ? "not-allowed" : "pointer",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <svg className="i" width="20" height="20" aria-hidden="true">
            <use href="#play" />
          </svg>
        </button>
      </div>

      {/* Playlist Metadata */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
        <h3
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {playlist.title}
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--m)",
          }}
        >
          <span>
            {trackCount} {trackCount === 1 ? "track" : "tracks"}
          </span>
        </div>

        {playlist.description && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--m)",
              opacity: 0.8,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {playlist.description}
          </p>
        )}
      </div>
    </div>
  );
}
