import { useState } from "react";
import {
  useCurrentTime,
  useCurrentTrack,
  useIsPlaying,
  usePlayerStore,
} from "../../store/usePlayerStore";
import { formatDuration } from "../../utils/format";

export function QueueNowPlayingCard() {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const currentTime = useCurrentTime();
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const [imageError, setImageError] = useState(false);

  if (!currentTrack) {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--l)",
          color: "var(--m)",
          fontSize: "13px",
          textAlign: "center",
        }}
      >
        No track currently playing
      </div>
    );
  }

  const isLiked = Boolean(likedTrackIds[currentTrack.id]);
  const duration = currentTrack.durationSeconds;
  const remainingSeconds = Math.max(0, duration - currentTime);
  const fallbackBg = "linear-gradient(135deg, #2c1a16 0%, #442820 50%, #150d0a 100%)";

  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "14px",
        background:
          "linear-gradient(145deg, rgba(240, 169, 130, 0.09) 0%, rgba(24, 17, 15, 0.8) 100%)",
        border: "1px solid rgba(240, 169, 130, 0.18)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Artwork */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "10px",
            background: fallbackBg,
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {!imageError && currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              onError={() => setImageError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}
        </div>

        {/* Track Title and Artist */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--t)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack.title}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--m)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack.artist}
          </div>
        </div>

        {/* Like Button */}
        <button
          aria-label={isLiked ? `Unlike ${currentTrack.title}` : `Like ${currentTrack.title}`}
          onClick={() => toggleLike(currentTrack.id)}
          style={{
            background: "none",
            border: 0,
            padding: "8px",
            color: isLiked ? "var(--accent)" : "var(--m)",
            cursor: "pointer",
            display: "grid",
          }}
        >
          <svg
            className="i"
            width="16"
            height="16"
            aria-hidden="true"
            style={{ fill: isLiked ? "var(--accent)" : "none" }}
          >
            <use href="#heart" />
          </svg>
        </button>
      </div>

      {/* Footer info: live visualizer and remaining time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "6px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          fontSize: "11px",
          color: "var(--m)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Animated visualizer bars */}
          <div
            role="status"
            aria-label={isPlaying ? "Audio playing" : "Audio paused"}
            style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "12px" }}
          >
            <span
              style={{
                width: "2.5px",
                height: isPlaying ? "10px" : "4px",
                background: "var(--accent)",
                borderRadius: "1px",
                animation: isPlaying ? "pulse 0.8s ease-in-out infinite" : "none",
              }}
            />
            <span
              style={{
                width: "2.5px",
                height: isPlaying ? "14px" : "7px",
                background: "var(--accent)",
                borderRadius: "1px",
                animation: isPlaying ? "pulse 0.6s ease-in-out 0.2s infinite" : "none",
              }}
            />
            <span
              style={{
                width: "2.5px",
                height: isPlaying ? "8px" : "3px",
                background: "var(--accent)",
                borderRadius: "1px",
                animation: isPlaying ? "pulse 0.9s ease-in-out 0.4s infinite" : "none",
              }}
            />
            <span
              style={{
                width: "2.5px",
                height: isPlaying ? "12px" : "5px",
                background: "var(--accent)",
                borderRadius: "1px",
                animation: isPlaying ? "pulse 0.7s ease-in-out 0.1s infinite" : "none",
              }}
            />
          </div>
          <span style={{ color: isPlaying ? "var(--accent)" : "var(--m)", fontWeight: 500 }}>
            {isPlaying ? "Now Playing" : "Paused"}
          </span>
        </div>

        <div style={{ fontVariantNumeric: "tabular-nums" }}>
          -{formatDuration(remainingSeconds)} remaining
        </div>
      </div>
    </div>
  );
}
