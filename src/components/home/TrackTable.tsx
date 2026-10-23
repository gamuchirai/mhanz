import { useState, type MouseEvent } from "react";
import { Track } from "../../types/discovery";
import { usePlayerStore } from "../../store/usePlayerStore";
import { MarqueeText } from "./MarqueeText";

interface TrackTableProps {
  tracks: Track[];
  title?: string;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function TrackTable({ tracks, title = "Popular tracks" }: TrackTableProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const toggleLike = usePlayerStore((state) => state.toggleLike);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const handleRowClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, tracks);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 500, color: "var(--t)" }}>{title}</h2>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{ color: "var(--m)", fontSize: "13px", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
        >
          See all
        </a>
      </div>

      <div role="table" aria-label="Popular tracks table" style={{ display: "flex", flexDirection: "column" }}>
        {tracks.map((track, idx) => {
          const isCurrent = currentTrack?.id === track.id;
          const isRowPlaying = isCurrent && isPlaying;
          const isLiked = Boolean(likedTrackIds[track.id]);
          const rankNum = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

          return (
            <TrackRow
              key={track.id}
              track={track}
              rank={rankNum}
              isCurrent={isCurrent}
              isPlaying={isRowPlaying}
              isLiked={isLiked}
              onPlay={() => handleRowClick(track)}
              onToggleLike={(e) => {
                e.stopPropagation();
                toggleLike(track.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  rank: string;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  onPlay: () => void;
  onToggleLike: (e: MouseEvent) => void;
}

function TrackRow({
  track,
  rank,
  isCurrent,
  isPlaying,
  isLiked,
  onPlay,
  onToggleLike,
}: TrackRowProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const defaultBg = "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)";

  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={`${track.title} by ${track.artist}`}
      onClick={onPlay}
      onDoubleClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "26px 42px 1fr auto 36px",
        alignItems: "center",
        gap: "14px",
        padding: "8px 10px",
        borderRadius: "8px",
        background: isCurrent ? "rgba(240,169,130,0.08)" : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        userSelect: "none",
      }}
    >
      {/* Rank or Play Icon */}
      <div style={{ color: isCurrent ? "var(--accent)" : "var(--m)", fontSize: "12px", display: "grid", placeItems: "center" }}>
        {isHovered ? (
          <button
            aria-label={`Play ${track.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--accent)",
              cursor: "pointer",
              display: "grid",
            }}
          >
            <svg className="i" width="14" height="14" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </button>
        ) : isPlaying ? (
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
            }}
          />
        ) : (
          <span>{rank}</span>
        )}
      </div>

      {/* Artwork with Gradient Fallback */}
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "6px",
          overflow: "hidden",
          background: defaultBg,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {!imageError && track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
      </div>

      {/* Title & Artist with Marquee on hover */}
      <div style={{ minWidth: 0 }}>
        <MarqueeText
          text={track.title}
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: isCurrent ? "var(--accent)" : "var(--t)",
          }}
        />
        <div style={{ fontSize: "12px", color: "var(--m)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      <span style={{ fontSize: "13px", color: "var(--m)", fontVariantNumeric: "tabular-nums" }}>
        {formatDuration(track.durationSeconds)}
      </span>

      {/* Heart / Like toggle */}
      <button
        aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
        onClick={onToggleLike}
        style={{
          background: "none",
          border: 0,
          padding: "8px",
          color: isLiked ? "var(--accent)" : "var(--m)",
          display: "grid",
          cursor: "pointer",
          borderRadius: "50%",
          transition: "transform 0.15s ease, color 0.15s ease",
          transform: isHovered && isLiked ? "scale(1.15)" : "none",
        }}
      >
        <svg
          className="i"
          width="16"
          height="16"
          aria-hidden="true"
          style={{
            fill: isLiked ? "var(--accent)" : "none",
            color: isLiked ? "var(--accent)" : "inherit",
          }}
        >
          <use href="#heart" />
        </svg>
      </button>
    </div>
  );
}
