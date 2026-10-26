import {
  useOverviewSearchQuery,
  usePlaylistStore,
  usePlaylists,
} from "../../store/usePlaylistStore";

export function PlaylistHeader() {
  const playlists = usePlaylists();
  const searchQuery = useOverviewSearchQuery();
  const setSearchQuery = usePlaylistStore((state) => state.setOverviewSearchQuery);
  const setCreateModalOpen = usePlaylistStore((state) => state.setCreateModalOpen);

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
                <use href="#list" />
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
              Playlists
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
              {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Custom &amp; curated collections</span>
          </div>
        </div>

        {/* Search input & New Playlist button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "240px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "12px",
                display: "grid",
                placeItems: "center",
                color: "var(--m)",
                pointerEvents: "none",
              }}
            >
              <svg className="i" width="16" height="16" aria-hidden="true">
                <use href="#search" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists..."
              aria-label="Search playlists"
              style={{
                width: "100%",
                padding: "9px 36px 9px 36px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: "20px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear playlist search"
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: 0,
                  color: "var(--m)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            aria-label="New playlist"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 20px",
              borderRadius: "22px",
              background: "var(--accent)",
              color: "#18110f",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#plus" />
            </svg>
            <span>New Playlist</span>
          </button>
        </div>
      </div>
    </header>
  );
}
