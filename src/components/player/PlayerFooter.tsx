import { useState, type MouseEvent } from "react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { formatDuration } from "../home/TrackTable";
import { MarqueeText } from "../home/MarqueeText";

export function PlayerFooter() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const [imageError, setImageError] = useState(false);

  const isLiked = currentTrack ? Boolean(likedTrackIds[currentTrack.id]) : false;
  const duration = currentTrack?.durationSeconds ?? 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(Math.floor(ratio * duration));
  };

  const defaultBg = "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)";

  return (
    <footer
      role="contentinfo"
      aria-label="Now playing bar"
      style={{
        gridColumn: 2,
        gridRow: 2,
        margin: "0 32px 20px",
        padding: "0 24px",
        borderRadius: "16px",
        border: "1px solid var(--l)",
        background: "var(--p)",
        display: "grid",
        gridTemplateColumns: "1fr auto 1.4fr",
        alignItems: "center",
        gap: "24px",
        userSelect: "none",
      }}
    >
      {/* Current Track Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "8px",
            flex: "none",
            background: defaultBg,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {!imageError && currentTrack?.artworkUrl ? (
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <MarqueeText
            text={currentTrack?.title ?? "No track selected"}
            style={{ fontSize: "14px", fontWeight: 500, color: "var(--t)" }}
          />
          <div style={{ fontSize: "12px", color: "var(--m)", marginTop: "1px" }}>
            {currentTrack?.artist ?? "Mumhanzi"}
          </div>
        </div>
        {currentTrack ? (
          <button
            aria-label={isLiked ? `Unlike ${currentTrack.title}` : `Like ${currentTrack.title}`}
            onClick={() => toggleLike(currentTrack.id)}
            style={{
              background: "none",
              border: 0,
              padding: "8px",
              color: isLiked ? "var(--accent)" : "var(--m)",
              display: "grid",
              cursor: "pointer",
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
        ) : null}
      </div>

      {/* Main Playback Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "22px", color: "var(--m)" }}>
        <button
          aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
          onClick={toggleShuffle}
          style={{
            background: "none",
            border: 0,
            padding: "8px",
            color: isShuffle ? "var(--accent)" : "inherit",
            display: "grid",
            cursor: "pointer",
          }}
        >
          <svg className="i" width="18" height="18" aria-hidden="true">
            <use href="#shuffle" />
          </svg>
        </button>
        <button
          aria-label="Previous track"
          onClick={previousTrack}
          style={{
            background: "none",
            border: 0,
            padding: "8px",
            color: "var(--t)",
            display: "grid",
            cursor: "pointer",
          }}
        >
          <svg className="i" width="18" height="18" aria-hidden="true">
            <use href="#prev" />
          </svg>
        </button>
        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlayPause}
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            border: 0,
            background: "#f1d3bf",
            color: "#1c0f09",
            display: "grid",
            placeItems: "center",
            padding: 0,
            cursor: "pointer",
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg className="i" width="22" height="22" aria-hidden="true">
            <use href={isPlaying ? "#pause" : "#play"} />
          </svg>
        </button>
        <button
          aria-label="Next track"
          onClick={nextTrack}
          style={{
            background: "none",
            border: 0,
            padding: "8px",
            color: "var(--t)",
            display: "grid",
            cursor: "pointer",
          }}
        >
          <svg className="i" width="18" height="18" aria-hidden="true">
            <use href="#next" />
          </svg>
        </button>
        <button
          aria-label={`Repeat mode: ${repeatMode}`}
          onClick={toggleRepeat}
          style={{
            background: "none",
            border: 0,
            padding: "8px",
            color: repeatMode !== "off" ? "var(--accent)" : "inherit",
            display: "grid",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <svg className="i" width="18" height="18" aria-hidden="true">
            <use href="#repeat" />
          </svg>
          {repeatMode === "one" ? (
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                fontSize: "9px",
                fontWeight: "bold",
                color: "var(--accent)",
              }}
            >
              1
            </span>
          ) : null}
        </button>
      </div>

      {/* Track Progress and Volume */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
          color: "var(--m)",
          fontSize: "12px",
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(currentTime)}</span>
        <div
          role="progressbar"
          tabIndex={0}
          aria-label="Track progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          onClick={handleSeek}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              seekTo(currentTime - 5);
            } else if (e.key === "ArrowRight") {
              seekTo(currentTime + 5);
            }
          }}
          style={{
            width: "240px",
            height: "12px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "#3a2f2a",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: "2px",
                background: "var(--accent)",
                transition: "width 0.2s linear",
              }}
            />
          </div>
        </div>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(duration)}</span>

        {/* Volume controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
          <button
            aria-label={isMuted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: isMuted ? "var(--accent)" : "inherit",
              cursor: "pointer",
              display: "grid",
            }}
          >
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#vol" />
            </svg>
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume slider"
            style={{
              width: "70px",
              accentColor: "var(--accent)",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </footer>
  );
}
