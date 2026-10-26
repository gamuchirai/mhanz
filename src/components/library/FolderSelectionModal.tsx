import { useState, useEffect } from "react";
import {
  useIsAddFolderModalOpen,
  useLibraryFolders,
  useLibraryStore,
} from "../../store/useLibraryStore";
import { presetFolderOptions } from "../../data/libraryFixtures";
import type { LibraryTrack, PresetFolderOption } from "../../types/library";

export function FolderSelectionModal() {
  const isOpen = useIsAddFolderModalOpen();
  const existingFolders = useLibraryFolders();
  const closeAddFolderModal = useLibraryStore((state) => state.closeAddFolderModal);
  const addFolder = useLibraryStore((state) => state.addFolder);

  const [customPath, setCustomPath] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeAddFolderModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeAddFolderModal]);

  if (!isOpen) return null;

  const handleAddPreset = (preset: PresetFolderOption) => {
    addFolder(preset.folderPath, preset.displayName, preset.tracks);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;

    const folderName = customName.trim() || customPath.trim().split("/").pop() || "Custom Music";
    const simulatedTracks: LibraryTrack[] = [
      {
        id: `custom-track-${Date.now()}-1`,
        title: `${folderName} Track 01`,
        artist: "Independent Artist",
        album: folderName,
        durationSeconds: 210,
        artworkUrl:
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
        playsCount: 1200,
        isLiked: false,
        filePath: `${customPath.trim()}/Track_01.mp3`,
        folderId: "",
        dateAdded: new Date().toISOString().split("T")[0],
        genre: "Various",
        bitrate: 320,
        fileSizeBytes: 8400000,
      },
      {
        id: `custom-track-${Date.now()}-2`,
        title: `${folderName} Track 02`,
        artist: "Independent Artist",
        album: folderName,
        durationSeconds: 245,
        artworkUrl:
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
        playsCount: 850,
        isLiked: false,
        filePath: `${customPath.trim()}/Track_02.mp3`,
        folderId: "",
        dateAdded: new Date().toISOString().split("T")[0],
        genre: "Various",
        bitrate: 320,
        fileSizeBytes: 9800000,
      },
    ];

    addFolder(customPath.trim(), folderName, simulatedTracks);
    setCustomPath("");
    setCustomName("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-folder-title"
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
        if (e.target === e.currentTarget) closeAddFolderModal();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#18110f",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          color: "var(--t)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(240, 169, 130, 0.18)",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg
                className="i"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <h2
              id="add-folder-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Add Music Folder
            </h2>
          </div>

          <button
            onClick={closeAddFolderModal}
            aria-label="Close dialog"
            style={{
              background: "none",
              border: 0,
              padding: "6px",
              color: "var(--m)",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", lineHeight: 1.5 }}>
          Index audio tracks from your local storage. Choose from preset demonstration collections
          or specify a custom directory path.
        </p>

        {/* Presets section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--m)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Preset Demo Collections
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {presetFolderOptions.map((preset) => {
              const alreadyAdded = existingFolders.some(
                (f) => f.folderPath.toLowerCase() === preset.folderPath.toLowerCase()
              );

              return (
                <div
                  key={preset.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--t)" }}>
                      {preset.displayName}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--m)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {preset.description} ({preset.tracks.length} tracks)
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "rgba(244, 235, 228, 0.4)",
                        fontFamily: "monospace",
                      }}
                    >
                      {preset.folderPath}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddPreset(preset)}
                    disabled={alreadyAdded}
                    aria-label={`Add preset folder ${preset.displayName}`}
                    style={{
                      flexShrink: 0,
                      padding: "6px 14px",
                      borderRadius: "16px",
                      background: alreadyAdded
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(240, 169, 130, 0.2)",
                      color: alreadyAdded ? "var(--m)" : "var(--accent)",
                      border: alreadyAdded
                        ? "1px solid rgba(255, 255, 255, 0.06)"
                        : "1px solid rgba(240, 169, 130, 0.4)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: alreadyAdded ? "default" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {alreadyAdded ? "Added" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Folder Input */}
        <form
          onSubmit={handleAddCustom}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--m)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Or Enter Custom Folder Path
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. C:/Users/Music/Soundtracks"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              aria-label="Custom folder path"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />

            <input
              type="text"
              placeholder="Display name (optional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              aria-label="Custom folder display name"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

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
              onClick={closeAddFolderModal}
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
              type="submit"
              disabled={!customPath.trim()}
              style={{
                padding: "8px 18px",
                borderRadius: "18px",
                background: !customPath.trim() ? "rgba(255, 255, 255, 0.08)" : "var(--accent)",
                color: !customPath.trim() ? "var(--m)" : "#18110f",
                border: 0,
                fontWeight: 600,
                fontSize: "13px",
                cursor: !customPath.trim() ? "not-allowed" : "pointer",
              }}
            >
              Add Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
