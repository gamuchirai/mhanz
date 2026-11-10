import { useEffect } from "react";
import {
  useActivePlaylist,
  useIsPlaylistDetailLoading,
  usePlaylistDetailError,
  usePlaylistStore,
  usePlaylistTracksByPlaylistId,
} from "../store/usePlaylistStore";
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
  const isDetailLoading = useIsPlaylistDetailLoading();
  const detailError = usePlaylistDetailError();

  useEffect(() => {
    if (activePlaylist?.id) {
      usePlaylistStore
        .getState()
        .loadPlaylistDetails(activePlaylist.id)
        .catch(() => {});
    }
  }, [activePlaylist?.id]);

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
          {isDetailLoading && entries.length === 0 ? (
            <div
              role="region"
              aria-label="Loading playlist songs"
              className="flex flex-col gap-3 w-full animate-pulse my-4"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "48px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                />
              ))}
            </div>
          ) : detailError && entries.length === 0 ? (
            <div
              role="alert"
              aria-label="Playlist detail error"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "48px 24px",
                textAlign: "center",
                background: "rgba(239, 68, 68, 0.05)",
                borderRadius: "16px",
                border: "1px dashed rgba(239, 68, 68, 0.25)",
                margin: "12px 0",
              }}
            >
              <div style={{ color: "#ff6b6b", fontSize: "15px", fontWeight: 600 }}>
                Failed to load playlist songs
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--m)" }}>
                {detailError}
              </p>
              <button
                type="button"
                onClick={() => {
                  usePlaylistStore
                    .getState()
                    .loadPlaylistDetails(activePlaylist.id)
                    .catch(() => {});
                }}
                aria-label="Retry loading playlist songs"
                style={{
                  marginTop: "6px",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  background: "var(--accent)",
                  color: "#18110f",
                  border: 0,
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
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
