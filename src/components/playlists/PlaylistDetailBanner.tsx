import type { Playlist } from "../../types/playlist";
import {
  calculatePlaylistDuration,
  formatPlaylistTotalDuration,
  useDetailSearchQuery,
  usePlaylistStore,
  usePlaylistTracksByPlaylistId,
} from "../../store/usePlaylistStore";

interface PlaylistDetailBannerProps {
  playlist: Playlist;
}

export function PlaylistDetailBanner({ playlist }: PlaylistDetailBannerProps) {
  const trackEntries = usePlaylistTracksByPlaylistId(playlist.id);
  const trackCount = trackEntries.length;
  const totalSeconds = calculatePlaylistDuration(trackEntries);
  const formattedDuration = formatPlaylistTotalDuration(totalSeconds);

  const detailSearchQuery = useDetailSearchQuery();
  const setDetailSearchQuery = usePlaylistStore((state) => state.setDetailSearchQuery);

  const setActivePlaylistId = usePlaylistStore((state) => state.setActivePlaylistId);
  const playPlaylist = usePlaylistStore((state) => state.playPlaylist);
  const shufflePlaylist = usePlaylistStore((state) => state.shufflePlaylist);
  const setEditModalOpen = usePlaylistStore((state) => state.setEditModalOpen);
  const setDeleteDialogOpen = usePlaylistStore((state) => state.setDeleteDialogOpen);
  const setAddSongsDrawerOpen = usePlaylistStore((state) => state.setAddSongsDrawerOpen);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* Top Navigation Row: Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setActivePlaylistId(null)}
          aria-label="Back to all playlists"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "8px 16px",
            borderRadius: "20px",
            color: "var(--t)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#cl" />
          </svg>
          <span>All Playlists</span>
        </button>
      </div>

      {/* Hero Banner with Glowing Cover Art */}
      <div
        style={{
          display: "flex",
          gap: "28px",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {/* Cover Art Box */}
        <div
          style={{
            position: "relative",
            width: "192px",
            height: "192px",
            borderRadius: "16px",
            background: playlist.coverGradient,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 16px 36px -8px rgba(0,0,0,0.7), 0 0 30px -4px rgba(240, 169, 130, 0.2)",
          }}
        >
          {playlist.coverUrl && (
            <img
              src={playlist.coverUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </div>

        {/* Title, Metadata, and Description */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
            minWidth: "260px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            {playlist.isCurated ? "Curated Playlist" : "Personal Playlist"}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--t)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {playlist.title}
          </h1>

          {playlist.description && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                color: "var(--m)",
                lineHeight: 1.45,
                maxWidth: "600px",
              }}
            >
              {playlist.description}
            </p>
          )}

          {/* Stats Line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--m)",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            <span style={{ color: "var(--t)", fontWeight: 500 }}>
              {playlist.isCurated ? "Mumhanzi Editorial" : "madebyadah"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>
              {trackCount} {trackCount === 1 ? "track" : "tracks"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{formattedDuration}</span>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          paddingTop: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Play All Button */}
          <button
            type="button"
            onClick={() => playPlaylist(playlist.id, 0)}
            disabled={trackCount === 0}
            aria-label="Play all songs in playlist"
            title={trackCount === 0 ? "Tracks must be added first" : "Play all songs"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "24px",
              background: trackCount === 0 ? "rgba(255,255,255,0.08)" : "var(--accent)",
              color: trackCount === 0 ? "var(--m)" : "#18110f",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: trackCount === 0 ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#play" />
            </svg>
            <span>Play All</span>
          </button>

          {/* Shuffle Button */}
          <button
            type="button"
            onClick={() => shufflePlaylist(playlist.id)}
            disabled={trackCount === 0}
            aria-label="Shuffle playlist tracks"
            title={trackCount === 0 ? "Tracks must be added first" : "Shuffle playlist tracks"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.05)",
              color: trackCount === 0 ? "var(--m)" : "var(--t)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontWeight: 500,
              fontSize: "13px",
              cursor: trackCount === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#shuffle" />
            </svg>
            <span>Shuffle</span>
          </button>

          {/* Add Songs Button */}
          <button
            type="button"
            onClick={() => setAddSongsDrawerOpen(true)}
            aria-label="Add songs to playlist"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "24px",
              background: "rgba(240, 169, 130, 0.12)",
              color: "var(--accent)",
              border: "1px solid rgba(240, 169, 130, 0.25)",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#plus" />
            </svg>
            <span>Add Songs</span>
          </button>

          {/* Edit Details (Only for non curated playlists) */}
          {!playlist.isCurated && (
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit playlist details"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "24px",
                background: "transparent",
                color: "var(--t)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <span>Edit Details</span>
            </button>
          )}

          {/* Delete Playlist (Only for non curated playlists) */}
          {!playlist.isCurated && (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Delete playlist"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "24px",
                background: "transparent",
                color: "#ff6b6b",
                border: "1px solid rgba(255, 107, 107, 0.2)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <span>Delete Playlist</span>
            </button>
          )}
        </div>

        {/* Filter within playlist input */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "220px",
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
            <svg className="i" width="15" height="15" aria-hidden="true">
              <use href="#search" />
            </svg>
          </span>
          <input
            type="text"
            value={detailSearchQuery}
            onChange={(e) => setDetailSearchQuery(e.target.value)}
            placeholder="Search in playlist..."
            aria-label="Search tracks in playlist"
            style={{
              width: "100%",
              padding: "8px 30px 8px 34px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              color: "var(--t)",
              fontSize: "12px",
              outline: "none",
            }}
          />
          {detailSearchQuery && (
            <button
              type="button"
              onClick={() => setDetailSearchQuery("")}
              aria-label="Clear playlist track search"
              style={{
                position: "absolute",
                right: "10px",
                background: "transparent",
                border: 0,
                color: "var(--m)",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
