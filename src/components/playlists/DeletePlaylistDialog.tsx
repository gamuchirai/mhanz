import {
  useActivePlaylist,
  useIsDeleteDialogOpen,
  usePlaylistStore,
} from "../../store/usePlaylistStore";

export function DeletePlaylistDialog() {
  const isOpen = useIsDeleteDialogOpen();
  const activePlaylist = useActivePlaylist();
  const setDeleteDialogOpen = usePlaylistStore((state) => state.setDeleteDialogOpen);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);

  if (!isOpen || !activePlaylist) return null;

  const handleConfirm = () => {
    deletePlaylist(activePlaylist.id);
  };

  const handleClose = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-playlist-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        padding: "20px",
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
          maxWidth: "420px",
          background: "#18110f",
          border: "1px solid rgba(255, 107, 107, 0.3)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 107, 107, 0.15)",
              color: "#ff6b6b",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              className="i"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div>
            <h2
              id="delete-playlist-title"
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--t)",
              }}
            >
              Delete Playlist?
            </h2>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>
              This action cannot be undone.
            </span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", lineHeight: 1.5 }}>
          Are you sure you want to delete{" "}
          <strong style={{ color: "var(--t)" }}>&ldquo;{activePlaylist.title}&rdquo;</strong>? The
          playlist will be permanently removed from your library and sidebar. All songs will remain
          safely stored in your local library.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "6px",
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--t)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            aria-label="Confirm delete playlist"
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "#ff6b6b",
              color: "#fff",
              border: 0,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete Playlist
          </button>
        </div>
      </div>
    </div>
  );
}
