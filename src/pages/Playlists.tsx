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
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-6 bg-[radial-gradient(1000px_480px_at_60%_0,rgba(240,169,130,0.12),transparent_70%)] bg-[#110c0a]"
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
