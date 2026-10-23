import { useState } from "react";
import type { ArtistPopularTrack } from "../../types/artists";
import { useCurrentTrack, useIsPlaying, usePlayerStore } from "../../store/usePlayerStore";
import { formatDuration } from "../../utils/format";
import { formatWithCommas } from "../../utils/avatarUtils";

interface ArtistPopularTrackRowProps {
  track: ArtistPopularTrack;
  rank: number;
  onPlay: () => void;
}

export function ArtistPopularTrackRow({ track, rank, onPlay }: ArtistPopularTrackRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentTrack = useCurrentTrack();
  const isGlobalPlaying = useIsPlaying();
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const isCurrent = currentTrack?.id === track.id;
  const isPlaying = isCurrent && isGlobalPlaying;
  const isLiked =
    track.id in likedTrackIds ? Boolean(likedTrackIds[track.id]) : Boolean(track.isLiked);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(track.id in likedTrackIds) && track.isLiked) {
      usePlayerStore.setState((s) => ({
        likedTrackIds: { ...s.likedTrackIds, [track.id]: false },
      }));
    } else {
      toggleLike(track.id);
    }
  };

  const hasImage = Boolean(track.coverUrl) && !imageError;

  return (
    <div
      role="row"
      aria-label={`Popular track ${rank}. ${track.title}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={onPlay}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 48px 1fr 140px 60px 40px 36px",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "8px",
        background: isHovered
          ? "rgba(255, 255, 255, 0.05)"
          : isCurrent
            ? "rgba(240, 169, 130, 0.08)"
            : "transparent",
        color: isCurrent ? "var(--accent)" : "var(--t)",
        cursor: "pointer",
        transition: "background 0.15s ease",
        position: "relative",
      }}
    >
      {/* Column 1: Rank or Play Trigger */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: isCurrent ? "var(--accent)" : "var(--m)",
          fontWeight: 600,
        }}
      >
        {isHovered ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: isCurrent ? "var(--accent)" : "var(--t)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </button>
        ) : isPlaying ? (
          <svg className="i" width="14" height="14" aria-hidden="true" style={{ color: "var(--accent)" }}>
            <use href="#vol" />
          </svg>
        ) : (
          <span>{rank}</span>
        )}
      </div>

      {/* Column 2: Cover Art Thumbnail */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#241814",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {hasImage ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <svg className="i" width="16" height="16" aria-hidden="true" style={{ color: "var(--m)" }}>
            <use href="#disc" />
          </svg>
        )}
      </div>

      {/* Column 3: Title and Album Name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: 0,
          paddingRight: "16px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: isCurrent ? "var(--accent)" : "var(--t)",
          }}
          title={track.title}
        >
          {track.title}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--m)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={track.albumTitle}
        >
          {track.albumTitle}
        </span>
      </div>

      {/* Column 4: Stream Play Count (Formatted with Commas) */}
      <div
        style={{
          fontSize: "13px",
          color: "var(--m)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
        title={`${track.playCount} streams`}
      >
        {formatWithCommas(track.playCount)}
      </div>

      {/* Column 5: Track Duration */}
      <div
        style={{
          fontSize: "13px",
          color: "var(--m)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatDuration(track.duration)}
      </div>

      {/* Column 6: Like Heart Toggle Button */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleToggleLike}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          aria-pressed={isLiked}
          style={{
            background: "none",
            border: "none",
            padding: "4px",
            color: isLiked ? "var(--accent)" : "var(--m)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            opacity: isLiked || isHovered ? 1 : 0,
            transition: "opacity 0.15s ease, color 0.15s ease",
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#heart" />
          </svg>
        </button>
      </div>

      {/* Column 7: More Options Button */}
      <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          aria-label={`More options for ${track.title}`}
          style={{
            background: "none",
            border: "none",
            padding: "4px",
            color: "var(--m)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            opacity: isHovered || isMenuOpen ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#dots" />
          </svg>
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "28px",
              right: 0,
              minWidth: "160px",
              background: "#1c1411",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "4px",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.6)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
                setIsMenuOpen(false);
              }}
              style={{
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "var(--t)",
                fontSize: "12px",
                textAlign: "left",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Play Track
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText?.(`${track.title} by ${track.artistName}`);
                setIsMenuOpen(false);
              }}
              style={{
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "var(--t)",
                fontSize: "12px",
                textAlign: "left",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Copy Song Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
