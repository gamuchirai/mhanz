import {
  useIsFolderPanelExpanded,
  useLibraryFolders,
  useLibraryStore,
  useLibraryTracks,
} from "../../store/useLibraryStore";
import { formatTotalDuration } from "../../utils/format";

interface LibraryHeaderProps {
  onPlayAll: () => void;
  onShuffleAll: () => void;
}

export function LibraryHeader({ onPlayAll, onShuffleAll }: LibraryHeaderProps) {
  const folders = useLibraryFolders();
  const tracks = useLibraryTracks();
  const isExpanded = useIsFolderPanelExpanded();
  const toggleFolderPanel = useLibraryStore((state) => state.toggleFolderPanel);

  const totalDurationSeconds = tracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  const formattedDuration = formatTotalDuration(totalDurationSeconds);

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        paddingBottom: "18px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Title and summary stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, rgba(240, 169, 130, 0.22), rgba(240, 169, 130, 0.05))",
                border: "1px solid rgba(240, 169, 130, 0.3)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
              }}
            >
              <svg className="i" width="18" height="18" aria-hidden="true">
                <use href="#lib" />
              </svg>
            </span>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--t)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Your Library
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--m)",
              fontSize: "13px",
            }}
          >
            <span>
              {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{formattedDuration}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>
              {folders.length} {folders.length === 1 ? "folder" : "folders"} indexed
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={onPlayAll}
            aria-label="Play all songs"
            disabled={tracks.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "22px",
              background: tracks.length === 0 ? "rgba(255,255,255,0.08)" : "var(--accent)",
              color: tracks.length === 0 ? "var(--m)" : "#18110f",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: tracks.length === 0 ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#play" />
            </svg>
            <span>Play All</span>
          </button>

          <button
            onClick={onShuffleAll}
            aria-label="Shuffle all songs"
            disabled={tracks.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "22px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--t)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontWeight: 500,
              fontSize: "13px",
              cursor: tracks.length === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#shuffle" />
            </svg>
            <span>Shuffle</span>
          </button>

          <button
            onClick={toggleFolderPanel}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse folders panel" : "Expand folders panel"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "22px",
              background: isExpanded ? "rgba(240, 169, 130, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: isExpanded ? "var(--accent)" : "var(--t)",
              border: isExpanded
                ? "1px solid rgba(240, 169, 130, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.08)",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <svg
              className="i"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{isExpanded ? "Hide Folders" : "Manage Folders"}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "10px",
                background: isExpanded ? "rgba(240, 169, 130, 0.25)" : "rgba(255, 255, 255, 0.08)",
                color: isExpanded ? "var(--accent)" : "var(--m)",
              }}
            >
              {folders.length}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
