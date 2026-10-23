import { useState, useRef, type MouseEvent, type KeyboardEvent } from "react";
import { formatDuration } from "../../utils/format";

interface FullscreenDeckProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  volume: number;
  isMuted: boolean;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
}

export function FullscreenDeck({
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  volume,
  isMuted,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onSetVolume,
  onToggleMute,
}: FullscreenDeckProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const activeTime = scrubPreview !== null ? scrubPreview : currentTime;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, activeTime / duration)) : 0;
  const progressPercent = progressRatio * 100;

  const calculateTimeFromEvent = (clientX: number): number => {
    if (!progressBarRef.current || duration <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    return Math.floor(ratio * duration);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsScrubbing(true);
    const newTime = calculateTimeFromEvent(e.clientX);
    setScrubPreview(newTime);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const updatedTime = calculateTimeFromEvent(moveEvent.clientX);
      setScrubPreview(updatedTime);
    };

    const handleMouseUp = (upEvent: globalThis.MouseEvent) => {
      setIsScrubbing(false);
      const finalTime = calculateTimeFromEvent(upEvent.clientX);
      setScrubPreview(null);
      onSeek(finalTime);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + 5));
    }
  };

  return (
    <footer
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 48px 36px",
        zIndex: 20,
        position: "relative",
        maxWidth: "960px",
        width: "100%",
        margin: "0 auto",
        userSelect: "none",
      }}
    >
      {/* Timeline scrubber bar */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontVariantNumeric: "tabular-nums",
            color: "var(--m)",
            minWidth: "40px",
            textAlign: "right",
          }}
        >
          {formatDuration(activeTime)}
        </span>

        <div
          ref={progressBarRef}
          role="slider"
          tabIndex={0}
          aria-label="Timeline scrubber"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={activeTime}
          aria-valuetext={`${formatDuration(activeTime)} of ${formatDuration(duration)}`}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            height: "18px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            position: "relative",
            outline: "none",
          }}
        >
          {/* Progress bar track */}
          <div
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255, 255, 255, 0.16)",
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* Filled progress track */}
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: "2px",
                background: "var(--accent)",
                position: "absolute",
                left: 0,
                top: 0,
              }}
            />
            {/* Scrubber thumb handle */}
            <div
              style={{
                position: "absolute",
                left: `${progressPercent}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: isScrubbing ? "14px" : "12px",
                height: isScrubbing ? "14px" : "12px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 0 10px rgba(0, 0, 0, 0.5), 0 0 12px var(--accent)",
                transition: "width 0.1s, height 0.1s",
              }}
            />
          </div>
        </div>

        <span
          style={{
            fontSize: "12px",
            fontVariantNumeric: "tabular-nums",
            color: "var(--m)",
            minWidth: "40px",
          }}
        >
          {formatDuration(duration)}
        </span>
      </div>

      {/* Primary transport controls deck */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Left spacer / secondary trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "140px" }}>
          {/* Shuffle button */}
          <button
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle mode"
            title={isShuffle ? "Disable shuffle" : "Enable shuffle"}
            style={{
              background: isShuffle ? "rgba(240, 169, 130, 0.15)" : "transparent",
              border: 0,
              borderRadius: "8px",
              padding: "8px",
              color: isShuffle ? "var(--accent)" : "var(--m)",
              cursor: "pointer",
              display: "grid",
              transition: "all 0.2s ease",
            }}
          >
            <svg className="i" width="20" height="20" aria-hidden="true">
              <use href="#shuf" />
            </svg>
          </button>

          {/* Repeat mode cycle button */}
          <button
            onClick={onToggleRepeat}
            aria-label={`Cycle repeat mode (currently ${repeatMode})`}
            title={`Repeat: ${repeatMode}`}
            style={{
              background: repeatMode !== "off" ? "rgba(240, 169, 130, 0.15)" : "transparent",
              border: 0,
              borderRadius: "8px",
              padding: "8px",
              color: repeatMode !== "off" ? "var(--accent)" : "var(--m)",
              cursor: "pointer",
              display: "grid",
              position: "relative",
              transition: "all 0.2s ease",
            }}
          >
            <svg className="i" width="20" height="20" aria-hidden="true">
              <use href="#rep" />
            </svg>
            {repeatMode === "one" ? (
              <span
                style={{
                  position: "absolute",
                  bottom: "3px",
                  right: "4px",
                  fontSize: "9px",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "var(--accent)",
                }}
              >
                1
              </span>
            ) : null}
          </button>
        </div>

        {/* Center playback transport controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Previous track */}
          <button
            onClick={onPrevious}
            aria-label="Previous track"
            title="Previous track"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--t)",
              cursor: "pointer",
              display: "grid",
              padding: "8px",
              borderRadius: "50%",
              transition: "transform 0.15s, color 0.2s",
            }}
          >
            <svg className="i" width="24" height="24" aria-hidden="true">
              <use href="#prev" />
            </svg>
          </button>

          {/* Large central Play/Pause toggle button */}
          <button
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#160d0a",
              border: 0,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(240, 169, 130, 0.35)",
              transition: "transform 0.15s, box-shadow 0.2s",
            }}
          >
            <svg className="i" width="26" height="26" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </button>

          {/* Next track */}
          <button
            onClick={onNext}
            aria-label="Next track"
            title="Next track"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--t)",
              cursor: "pointer",
              display: "grid",
              padding: "8px",
              borderRadius: "50%",
              transition: "transform 0.15s, color 0.2s",
            }}
          >
            <svg className="i" width="24" height="24" aria-hidden="true">
              <use href="#next" />
            </svg>
          </button>
        </div>

        {/* Right volume control */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "140px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute volume" : "Mute volume"}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
            style={{
              background: "transparent",
              border: 0,
              color: isMuted ? "var(--accent)" : "var(--m)",
              cursor: "pointer",
              display: "grid",
              padding: "6px",
            }}
          >
            <svg className="i" width="20" height="20" aria-hidden="true">
              <use href="#vol" />
            </svg>
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onSetVolume(parseFloat(e.target.value))}
            aria-label="Volume slider"
            style={{
              width: "80px",
              accentColor: "var(--accent)",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </footer>
  );
}
