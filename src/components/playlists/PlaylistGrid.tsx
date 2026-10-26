import {
  useOverviewSearchQuery,
  usePlaylistStore,
  usePlaylists,
} from "../../store/usePlaylistStore";
import { PlaylistCard } from "./PlaylistCard";

export function PlaylistGrid() {
  const playlists = usePlaylists();
  const searchQuery = useOverviewSearchQuery();
  const setSearchQuery = usePlaylistStore((state) => state.setOverviewSearchQuery);
  const setCreateModalOpen = usePlaylistStore((state) => state.setCreateModalOpen);

  const query = searchQuery.trim().toLowerCase();
  const filteredPlaylists = playlists.filter((p) => {
    if (!query) return true;
    return p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
  });

  if (playlists.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "64px 24px",
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "16px",
          border: "1px dashed rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(240, 169, 130, 0.1)",
            color: "var(--accent)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg className="i" width="28" height="28" aria-hidden="true">
            <use href="#list" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: "var(--t)" }}>
            No playlists created yet
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", maxWidth: "340px" }}>
            Create your first mix with custom Midnight gradients to organize your favorite tracks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 22px",
            borderRadius: "22px",
            background: "var(--accent)",
            color: "#18110f",
            border: 0,
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#plus" />
          </svg>
          <span>Create Playlist</span>
        </button>
      </div>
    );
  }

  if (filteredPlaylists.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "48px 24px",
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <p style={{ margin: 0, fontSize: "14px", color: "var(--m)" }}>
          No playlists found matching &ldquo;
          <span style={{ color: "var(--t)" }}>{searchQuery}</span>&rdquo;
        </p>
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          style={{
            padding: "8px 18px",
            borderRadius: "18px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--t)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Clear search query
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Playlist collection grid"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3 w-full"
    >
      {filteredPlaylists.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} />
      ))}
    </div>
  );
}
