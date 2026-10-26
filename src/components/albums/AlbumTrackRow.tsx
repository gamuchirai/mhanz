import { useState } from "react";
import type { AlbumTrack } from "../../types/album";
import { useCurrentTrack, useIsPlaying, usePlayerStore } from "../../store/usePlayerStore";

interface AlbumTrackRowProps {
  track: AlbumTrack;
  albumArtistName: string;
  onPlay: () => void;
}

export function AlbumTrackRow({ track, albumArtistName, onPlay }: AlbumTrackRowProps) {
  const [isHovered, setIsHovered] = useState(false);
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

  const formatTrackDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const hasFeaturedArtist =
    Boolean(track.artist) &&
    track.artist.trim().toLowerCase() !== albumArtistName.trim().toLowerCase();

  return (
    <div
      role="row"
      aria-label={`Track ${track.trackNumber}. ${track.title}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={onPlay}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 120px 70px 48px",
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
      }}
    >
      {/* Col 1: Track Number or Play Trigger */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
        }}
      >
        {isHovered ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            aria-label={`Play ${track.title}`}
            style={{
              background: "transparent",
              border: "none",
              color: isCurrent ? "var(--accent)" : "var(--t)",
              cursor: "pointer",
              padding: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </button>
        ) : (
          <span
            style={{
              fontSize: "13px",
              color: isCurrent ? "var(--accent)" : "var(--m)",
              fontWeight: isCurrent ? 600 : 400,
            }}
          >
            {track.trackNumber}
          </span>
        )}
      </div>

      {/* Col 2: Title and Artist */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
          paddingRight: "16px",
        }}
      >
        <span
          title={track.title}
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: isCurrent ? "var(--accent)" : "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.title}
        </span>

        {track.isExplicit && (
          <span
            aria-label="Explicit content"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: "3px",
              background: "rgba(255, 255, 255, 0.15)",
              color: "var(--t)",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            E
          </span>
        )}
      </div>

      {/* Col 3: Featured Artist Credit (if any) */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--m)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: "12px",
        }}
      >
        {hasFeaturedArtist ? track.artist : ""}
      </div>

      {/* Col 4: Duration */}
      <div
        style={{
          fontSize: "13px",
          color: "var(--m)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatTrackDuration(track.duration)}
      </div>

      {/* Col 5: Heart Like Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleToggleLike}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          style={{
            background: "transparent",
            border: "none",
            color: isLiked ? "var(--accent)" : isHovered ? "var(--m)" : "transparent",
            cursor: "pointer",
            padding: "4px",
            display: "grid",
            placeItems: "center",
            transition: "all 0.15s ease",
          }}
        >
          <svg
            className="i"
            width="16"
            height="16"
            aria-hidden="true"
            style={{
              fill: isLiked ? "currentColor" : "none",
              stroke: isLiked ? "none" : "currentColor",
              strokeWidth: 2,
            }}
          >
            <use href="#heart" />
          </svg>
        </button>
      </div>
    </div>
  );
}
