import { useState, useEffect } from "react";
import {
  useFolderPendingRemoval,
  useLibraryStore,
} from "../../store/useLibraryStore";

export function FolderRemovalDialog() {
  const folder = useFolderPendingRemoval();
  const closeDialog = useLibraryStore((state) => state.closeRemoveFolderDialog);
  const confirmRemove = useLibraryStore((state) => state.confirmRemoveFolder);

  const [purgeTracks, setPurgeTracks] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && folder) {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [folder, closeDialog]);

  if (!folder) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-folder-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#18110f",
          border: "1px solid rgba(240, 80, 80, 0.25)",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          color: "var(--t)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(240, 80, 80, 0.15)",
              color: "#f67e7e",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              className="i"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </span>

          <div>
            <h2
              id="remove-folder-title"
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 600,
              }}
            >
              Remove Monitored Folder
            </h2>
            <div style={{ fontSize: "12px", color: "var(--m)" }}>
              {folder.displayName}
            </div>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", lineHeight: 1.5 }}>
          Are you sure you want to remove <strong style={{ color: "var(--t)" }}>{folder.displayName}</strong>?
          The actual audio files on your hard drive will never be deleted.
        </p>

        {/* Folder details box */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "var(--m)",
            wordBreak: "break-all",
          }}
        >
          {folder.folderPath}
        </div>

        {/* Purge tracks option checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "13px",
            color: "var(--t)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={purgeTracks}
            onChange={(e) => setPurgeTracks(e.target.checked)}
            style={{
              marginTop: "2px",
              accentColor: "var(--accent)",
              cursor: "pointer",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 500 }}>
              Purge {folder.trackCount} indexed songs from Your Library
            </span>
            <span style={{ fontSize: "11px", color: "var(--m)" }}>
              If unchecked, existing song entries will remain in the table as orphaned items.
            </span>
          </div>
        </label>

        {/* Actions buttons */}
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
            onClick={closeDialog}
            style={{
              padding: "8px 16px",
              borderRadius: "18px",
              background: "transparent",
              color: "var(--m)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => confirmRemove(purgeTracks)}
            aria-label="Confirm folder removal"
            style={{
              padding: "8px 18px",
              borderRadius: "18px",
              background: "#e04e4e",
              color: "#ffffff",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Remove Folder
          </button>
        </div>
      </div>
    </div>
  );
}
