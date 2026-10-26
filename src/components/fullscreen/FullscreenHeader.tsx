import type { FullscreenViewMode } from "../../types/overlays";
import type { Track } from "../../types/discovery";

interface FullscreenHeaderProps {
  track: Track | null;
  viewMode: FullscreenViewMode;
  onViewModeChange: (mode: FullscreenViewMode) => void;
  onClose: () => void;
}

export function FullscreenHeader({
  track,
  viewMode,
  onViewModeChange,
  onClose,
}: FullscreenHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 36px",
        zIndex: 20,
        position: "relative",
      }}
    >
      {/* Return button */}
      <button
        onClick={onClose}
        aria-label="Exit fullscreen view"
        title="Exit fullscreen (Esc)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "var(--t)",
          padding: "8px 16px",
          borderRadius: "20px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          backdropFilter: "blur(12px)",
          transition: "background 0.2s, color 0.2s, transform 0.15s",
        }}
      >
        <svg className="i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      {/* Track breadcrumb info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          maxWidth: "45%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span style={{ color: "var(--t)", fontWeight: 600 }}>
          {track?.title ?? "No track playing"}
        </span>
        {track?.artist ? (
          <>
            <span style={{ color: "var(--m)", opacity: 0.6 }}>•</span>
            <span style={{ color: "var(--m)" }}>{track.artist}</span>
          </>
        ) : null}
      </div>

      {/* View mode segment switch */}
      <div
        role="group"
        aria-label="View mode switch"
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "3px",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => onViewModeChange("artwork")}
          aria-label="Artwork mode"
          title="Artwork mode"
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            border: 0,
            background: viewMode === "artwork" ? "var(--accent)" : "transparent",
            color: viewMode === "artwork" ? "#160d0a" : "var(--m)",
            fontWeight: viewMode === "artwork" ? 600 : 500,
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Artwork
        </button>
        <button
          onClick={() => onViewModeChange("lyrics")}
          aria-label="Lyrics mode"
          title="Lyrics mode (L)"
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            border: 0,
            background: viewMode === "lyrics" ? "var(--accent)" : "transparent",
            color: viewMode === "lyrics" ? "#160d0a" : "var(--m)",
            fontWeight: viewMode === "lyrics" ? 600 : 500,
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Lyrics
        </button>
        <button
          onClick={() => onViewModeChange("visualizer")}
          aria-label="Visualizer mode"
          title="Visualizer mode (V)"
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            border: 0,
            background: viewMode === "visualizer" ? "var(--accent)" : "transparent",
            color: viewMode === "visualizer" ? "#160d0a" : "var(--m)",
            fontWeight: viewMode === "visualizer" ? 600 : 500,
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Visualizer
        </button>
      </div>
    </header>
  );
}
