import { useState, useMemo } from "react";
import { allSampleCatalogTracks } from "../../data/playlistFixtures";
import {
  useActivePlaylist,
  useIsAddSongsDrawerOpen,
  usePlaylistStore,
  usePlaylistTracksByPlaylistId,
} from "../../store/usePlaylistStore";
import { formatDuration } from "../../utils/format";

export function AddSongsDrawer() {
  const isOpen = useIsAddSongsDrawerOpen();
  const activePlaylist = useActivePlaylist();
  const setAddSongsDrawerOpen = usePlaylistStore((state) => state.setAddSongsDrawerOpen);
  const addTrackToPlaylist = usePlaylistStore((state) => state.addTrackToPlaylist);

  const entries = usePlaylistTracksByPlaylistId(activePlaylist ? activePlaylist.id : null);

  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Map of trackId -> count of times added in this playlist
  const trackCountInPlaylist = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      map[entry.trackId] = (map[entry.trackId] || 0) + 1;
    }
    return map;
  }, [entries]);

  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allSampleCatalogTracks;
    return allSampleCatalogTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query) ||
        (t.genre && t.genre.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  if (!isOpen || !activePlaylist) return null;

  const handleClose = () => {
    setAddSongsDrawerOpen(false);
  };

  const handleAdd = (trackId: string) => {
    addTrackToPlaylist(activePlaylist.id, trackId);
    setRecentlyAddedId(trackId);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === trackId ? null : curr));
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-songs-drawer-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100%",
          background: "#18110f",
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "-16px 0 36px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div>
            <h2
              id="add-songs-drawer-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--t)",
              }}
            >
              Add Songs
            </h2>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>
              To &ldquo;{activePlaylist.title}&rdquo;
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close drawer"
            style={{
              background: "none",
              border: 0,
              color: "var(--m)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "100%",
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
              placeholder="Search by title, artist, album, genre..."
              aria-label="Search songs to add"
              autoFocus
              style={{
                width: "100%",
                padding: "9px 34px 9px 36px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: 0,
                  color: "var(--m)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Track List */}
        <div
          role="region"
          aria-label="Available songs list"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {filteredTracks.length === 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                color: "var(--m)",
                fontSize: "13px",
              }}
            >
              No songs found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredTracks.map((track) => {
              const inPlaylistCount = trackCountInPlaylist[track.id] || 0;
              const isJustAdded = recentlyAddedId === track.id;

              return (
                <div
                  key={track.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: isJustAdded ? "rgba(240, 169, 130, 0.12)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Artwork */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={track.artworkUrl}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  {/* Title & Artist */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--t)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {track.title}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--m)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {track.artist} • {formatDuration(track.durationSeconds)}
                    </span>
                  </div>

                  {/* Add Action Button */}
                  <button
                    type="button"
                    onClick={() => handleAdd(track.id)}
                    aria-label={`Add ${track.title} to playlist`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "16px",
                      background: isJustAdded
                        ? "rgba(240, 169, 130, 0.25)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: isJustAdded ? "var(--accent)" : "var(--t)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isJustAdded ? (
                      <span>Added ✓</span>
                    ) : inPlaylistCount > 0 ? (
                      <span>Add ({inPlaylistCount})</span>
                    ) : (
                      <span>+ Add</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
