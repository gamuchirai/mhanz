import {
  useIsFolderPanelExpanded,
  useLibraryFolders,
  useLibraryStore,
  useSelectedFolderId,
} from "../../store/useLibraryStore";
import type { MusicFolder } from "../../types/library";
import { formatBytes } from "../../utils/format";

export function FolderManagerPanel() {
  const isExpanded = useIsFolderPanelExpanded();
  const folders = useLibraryFolders();
  const selectedFolderId = useSelectedFolderId();

  const setSelectedFolder = useLibraryStore((state) => state.setSelectedFolder);
  const openAddFolderModal = useLibraryStore((state) => state.openAddFolderModal);
  const openRemoveFolderDialog = useLibraryStore((state) => state.openRemoveFolderDialog);
  const rescanFolder = useLibraryStore((state) => state.rescanFolder);

  if (!isExpanded) return null;

  return (
    <section
      aria-label="Monitored music folders"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "16px 20px",
        borderRadius: "14px",
        background: "rgba(24, 17, 15, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Panel bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--t)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Monitored Music Folders
          </h2>
          <span
            style={{
              fontSize: "12px",
              color: "var(--m)",
            }}
          >
            ({folders.length})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedFolderId && (
            <button
              onClick={() => setSelectedFolder(null)}
              aria-label="Clear active folder filter"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "14px",
                background: "rgba(240, 169, 130, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(240, 169, 130, 0.3)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <span>Showing filtered folder</span>
              <span style={{ fontWeight: 700 }}>✕</span>
            </button>
          )}

          <button
            onClick={openAddFolderModal}
            aria-label="Add music folder"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.07)",
              color: "var(--t)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>+</span>
            <span>Add Folder</span>
          </button>
        </div>
      </div>

      {/* Folders Cards Grid */}
      {folders.length === 0 ? (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            color: "var(--m)",
            fontSize: "13px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
          }}
        >
          No music folders currently monitored. Click Add Folder to index your local audio files.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {folders.map((folder: MusicFolder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Select folder ${folder.displayName}`}
                onClick={() => setSelectedFolder(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedFolder(folder.id);
                  }
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(240, 169, 130, 0.14), rgba(24, 17, 15, 0.8))"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isSelected
                    ? "1px solid rgba(240, 169, 130, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: isSelected ? "0 4px 20px rgba(240, 169, 130, 0.08)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Folder Top Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isSelected
                          ? "rgba(240, 169, 130, 0.2)"
                          : "rgba(255, 255, 255, 0.06)",
                        color: isSelected ? "var(--accent)" : "var(--m)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
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

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: isSelected ? "var(--accent)" : "var(--t)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {folder.displayName}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--m)",
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          opacity: 0.85,
                        }}
                        title={folder.folderPath}
                      >
                        {folder.folderPath}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        background: "var(--accent)",
                        color: "#18110f",
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>

                {/* Folder Stats Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "var(--m)",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <span>
                    {folder.trackCount} {folder.trackCount === 1 ? "song" : "songs"} (
                    {formatBytes(folder.totalSizeBytes)})
                  </span>
                  <span style={{ fontSize: "11px", opacity: 0.8 }}>{folder.lastScanned}</span>
                </div>

                {/* Folder Actions Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "8px",
                    paddingTop: "4px",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rescanFolder(folder.id);
                    }}
                    disabled={folder.isScanning}
                    aria-label={`Rescan folder ${folder.displayName}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: folder.isScanning ? "var(--accent)" : "var(--t)",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: folder.isScanning ? "wait" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <svg
                      className="i"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: folder.isScanning ? "spin 1s linear infinite" : "none",
                      }}
                      aria-hidden="true"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>{folder.isScanning ? "Scanning..." : "Rescan"}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openRemoveFolderDialog(folder);
                    }}
                    aria-label={`Remove folder ${folder.displayName}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      background: "rgba(240, 80, 80, 0.08)",
                      color: "#f67e7e",
                      border: "1px solid rgba(240, 80, 80, 0.2)",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <svg
                      className="i"
                      width="12"
                      height="12"
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
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
