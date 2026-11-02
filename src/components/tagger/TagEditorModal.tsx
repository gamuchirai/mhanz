import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useTagEditorStore } from "../../store/useTagEditorStore";
import { formatDuration } from "../../utils/format";

export function TagEditorModal() {
  const isOpen = useTagEditorStore((state) => state.isOpen);
  const isLoading = useTagEditorStore((state) => state.isLoading);
  const isSaving = useTagEditorStore((state) => state.isSaving);
  const error = useTagEditorStore((state) => state.error);
  const tags = useTagEditorStore((state) => state.tags);
  const coverPreviewUrl = useTagEditorStore((state) => state.coverPreviewUrl);
  const closeTrackEditor = useTagEditorStore((state) => state.closeTrackEditor);
  const setCoverArtAction = useTagEditorStore((state) => state.setCoverArtAction);
  const saveCurrentTrack = useTagEditorStore((state) => state.saveCurrentTrack);

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState<string>("");
  const [trackNumber, setTrackNumber] = useState<string>("");
  const [discNumber, setDiscNumber] = useState<string>("1");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form inputs when fresh probed tags arrive
  useEffect(() => {
    if (tags) {
      setTitle(tags.title || "");
      setArtistName(tags.artist || "");
      setAlbumName(tags.album || "");
      setAlbumArtist(tags.albumArtist || "");
      setGenre(tags.genre || "");
      setYear(tags.year !== null ? String(tags.year) : "");
      setTrackNumber(tags.trackNumber !== null ? String(tags.trackNumber) : "");
      setDiscNumber(String(tags.discNumber || 1));
      setValidationError(null);
    }
  }, [tags]);

  if (!isOpen) {
    return null;
  }

  const handleFileReplacement = (file: File) => {
    // 15 megabyte cap check (AC-5)
    if (file.size > 15 * 1024 * 1024) {
      setValidationError("Cover artwork image exceeds 15 MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64Data = result.split(",")[1] || "";
        const preview = URL.createObjectURL(file);
        setCoverArtAction(
          {
            type: "replace_bytes",
            imageBytesBase64: base64Data,
            mimeType: file.type || "image/jpeg",
          },
          preview,
        );
        setValidationError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNativeFilePick = async () => {
    try {
      if (isTauri()) {
        const selected = await openDialog({
          title: "Select Cover Artwork",
          multiple: false,
          filters: [
            {
              name: "Image Files",
              extensions: ["png", "jpg", "jpeg", "webp"],
            },
          ],
        });

        if (typeof selected === "string") {
          const preview = `asset://localhost/${encodeURIComponent(selected)}`;
          setCoverArtAction(
            {
              type: "replace_path",
              sourceFilePath: selected,
            },
            preview,
          );
          setValidationError(null);
        }
      } else {
        fileInputRef.current?.click();
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setValidationError("Please drop a valid image file (PNG, JPEG, WebP).");
        return;
      }
      handleFileReplacement(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverArtAction({ type: "remove" }, null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError("Track title cannot be empty.");
      return;
    }
    if (!artistName.trim()) {
      setValidationError("Artist name cannot be empty.");
      return;
    }

    const parsedYear = year.trim() ? parseInt(year.trim(), 10) : null;
    if (parsedYear !== null && (isNaN(parsedYear) || parsedYear < 1000 || parsedYear > 2200)) {
      setValidationError("Please enter a valid four digit release year.");
      return;
    }

    const parsedTrackNo = trackNumber.trim() ? parseInt(trackNumber.trim(), 10) : null;
    const parsedDiscNo = discNumber.trim() ? parseInt(discNumber.trim(), 10) : 1;

    setValidationError(null);
    await saveCurrentTrack({
      title: title.trim(),
      artistName: artistName.trim(),
      albumName: albumName.trim() || null,
      albumArtist: albumArtist.trim() || null,
      genre: genre.trim() || null,
      year: parsedYear,
      trackNumber: parsedTrackNo,
      discNumber: parsedDiscNo,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-editor-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          closeTrackEditor();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isSaving) {
          closeTrackEditor();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          background: "#18110f",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <h2
              id="tag-editor-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--t)",
              }}
            >
              Edit Audio Metadata
            </h2>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>
              Physical tags are updated on disk and synced to SQLite
            </span>
          </div>

          <button
            type="button"
            onClick={closeTrackEditor}
            disabled={isSaving}
            aria-label="Close modal"
            style={{
              background: "none",
              border: 0,
              color: "var(--m)",
              fontSize: "18px",
              cursor: isSaving ? "not-allowed" : "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Probing loader or errors */}
        {isLoading && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "var(--accent)",
              fontSize: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "2px solid rgba(240, 169, 130, 0.2)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span>Reading physical audio file tags...</span>
          </div>
        )}

        {(error || validationError) && (
          <div
            role="alert"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
            }}
          >
            {error || validationError}
          </div>
        )}

        {!isLoading && tags && (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Top row: Cover artwork & Technical properties */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                gap: "16px",
                alignItems: "start",
                background: "rgba(0, 0, 0, 0.2)",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Artwork preview box with drag & drop */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    position: "relative",
                    background: "#241a16",
                    border: isDragOver
                      ? "2px dashed var(--accent)"
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Cover artwork preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        color: "var(--m)",
                        fontSize: "11px",
                      }}
                    >
                      <span>No Artwork</span>
                    </div>
                  )}

                  {isDragOver && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(240, 169, 130, 0.35)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "11px",
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      Drop Image
                    </div>
                  )}
                </div>

                {/* Artwork buttons */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handleNativeFilePick}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      color: "var(--t)",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Replace
                  </button>
                  {coverPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      style={{
                        padding: "5px 8px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "6px",
                        color: "#fca5a5",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileReplacement(files[0]);
                    }
                  }}
                />
              </div>

              {/* Physical file info pill badges */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--m)",
                }}
              >
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "rgba(240, 169, 130, 0.15)",
                      color: "var(--accent)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {tags.format}
                  </span>
                  {tags.bitrate && (
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontFamily: "monospace",
                      }}
                    >
                      {tags.bitrate} kbps
                    </span>
                  )}
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatDuration(tags.duration)}
                  </span>
                </div>

                <div
                  style={{
                    wordBreak: "break-all",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    opacity: 0.75,
                    marginTop: "4px",
                  }}
                >
                  {tags.filePath}
                </div>
              </div>
            </div>

            {/* Editable metadata input fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-title" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Title *
                </label>
                <input id="tag-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-artist" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Artist *
                </label>
                <input id="tag-artist"
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-album" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Album
                </label>
                <input id="tag-album"
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-album-artist" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Album Artist
                </label>
                <input id="tag-album-artist"
                  type="text"
                  value={albumArtist}
                  onChange={(e) => setAlbumArtist(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-genre" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Genre
                </label>
                <input id="tag-genre"
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-year" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Year
                </label>
                <input id="tag-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2024"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-track-number" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Track Number
                </label>
                <input id="tag-track-number"
                  type="number"
                  min="1"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="tag-disc-number" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Disc Number
                </label>
                <input id="tag-disc-number"
                  type="number"
                  min="1"
                  value={discNumber}
                  onChange={(e) => setDiscNumber(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--t)",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>

            {/* Modal actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                paddingTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={closeTrackEditor}
                disabled={isSaving}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "20px",
                  color: "var(--t)",
                  fontSize: "13px",
                  cursor: isSaving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: "8px 20px",
                  background: isSaving ? "rgba(240, 169, 130, 0.5)" : "var(--accent)",
                  border: 0,
                  borderRadius: "20px",
                  color: "#18110f",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: isSaving ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isSaving ? "Saving tags..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

