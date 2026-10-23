import { useActivePlaylist, usePlaylistTracksByPlaylistId } from "../store/usePlaylistStore";
import { PlaylistHeader } from "../components/playlists/PlaylistHeader";
import { PlaylistGrid } from "../components/playlists/PlaylistGrid";
import { PlaylistDetailBanner } from "../components/playlists/PlaylistDetailBanner";
import { PlaylistSongTable } from "../components/playlists/PlaylistSongTable";
import { PlaylistEmptyState } from "../components/playlists/PlaylistEmptyState";
import { PlaylistModal } from "../components/playlists/PlaylistModal";
import { AddSongsDrawer } from "../components/playlists/AddSongsDrawer";
import { DeletePlaylistDialog } from "../components/playlists/DeletePlaylistDialog";

export function Playlists() {
  const activePlaylist = useActivePlaylist();
  const entries = usePlaylistTracksByPlaylistId(activePlaylist ? activePlaylist.id : null);

  return (
    <main
      role="main"
      aria-label="Playlists screen"
      style={{
        gridColumn: 2,
        gridRow: 1,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 32px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        background:
          "radial-gradient(1000px 480px at 60% 0, rgba(240, 169, 130, 0.12), transparent 70%), #110c0a",
      }}
    >
      {/* Overview Grid or Detail Layout */}
      {!activePlaylist ? (
        <>
          <PlaylistHeader />
          <PlaylistGrid />
        </>
      ) : (
        <>
          <PlaylistDetailBanner playlist={activePlaylist} />
          {entries.length === 0 ? (
            <PlaylistEmptyState />
          ) : (
            <PlaylistSongTable playlist={activePlaylist} />
          )}
        </>
      )}

      {/* Floating Modals & Drawers */}
      <PlaylistModal mode="create" />
      <PlaylistModal mode="edit" />
      <AddSongsDrawer />
      <DeletePlaylistDialog />
    </main>
  );
}
