import { useOverlayStore } from "../../store/useOverlayStore";
import { usePlayerStore, useUpcomingQueue } from "../../store/usePlayerStore";
import { QueueNowPlayingCard } from "./QueueNowPlayingCard";
import { QueueTrackList } from "./QueueTrackList";

export function QueueDrawer() {
  const closeOverlay = useOverlayStore((state) => state.closeOverlay);
  const upcomingQueue = useUpcomingQueue();
  const clearUpcomingQueue = usePlayerStore((state) => state.clearUpcomingQueue);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Playback queue drawer"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: "96px", // sits cleanly above PlayerFooter or covers right pane
        width: "380px",
        maxWidth: "90vw",
        background: "rgba(18, 12, 10, 0.96)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--l)",
        boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.6)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 20px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--t)" }}>
            Playback Queue
          </h3>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: "rgba(240, 169, 130, 0.12)",
              color: "var(--accent)",
              fontWeight: 500,
            }}
          >
            {upcomingQueue.length} upcoming
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {upcomingQueue.length > 0 && (
            <button
              onClick={clearUpcomingQueue}
              style={{
                background: "none",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "4px 8px",
                color: "var(--m)",
                fontSize: "11px",
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.borderColor = "rgba(248, 113, 113, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--m)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            >
              Clear Queue
            </button>
          )}

          <button
            aria-label="Close queue drawer"
            onClick={closeOverlay}
            style={{
              background: "none",
              border: 0,
              padding: "6px",
              color: "var(--m)",
              cursor: "pointer",
              borderRadius: "6px",
              display: "grid",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
          >
            <svg className="i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Now Playing section */}
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: ".1em",
              color: "var(--m)",
              marginBottom: "10px",
            }}
          >
            NOW PLAYING
          </div>
          <QueueNowPlayingCard />
        </div>

        {/* Up Next section */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: ".1em",
              color: "var(--m)",
              marginBottom: "10px",
            }}
          >
            NEXT UP
          </div>
          <QueueTrackList />
        </div>
      </div>
    </div>
  );
}
