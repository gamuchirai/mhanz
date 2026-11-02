import { useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useTagEditorStore } from "../../store/useTagEditorStore";
import { formatDuration } from "../../utils/format";

export function TagEditorModal() {
  const isOpen = useTagEditorStore((state) => state.isOpen);
  const trackId = useTagEditorStore((state) => state.trackId);
  const isLoading = useTagEditorStore((state) => state.isLoading);
  const isSaving = useTagEditorStore((state) => state.isSaving);
  const closeTrackEditor = useTagEditorStore((state) => state.closeTrackEditor);

  if (!isOpen) {
    return null;
  }

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
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          closeTrackEditor();
        }
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          padding: "24px",
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

        {/* Probing loader */}
        {isLoading ? (
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
        ) : (
          <TagEditorForm key={trackId || "tag-editor-form"} />
        )}
      </div>
    </div>
  );
}

function TagEditorForm() {
  const isSaving = useTagEditorStore((state) => state.isSaving);
  const error = useTagEditorStore((state) => state.error);
  const tags = useTagEditorStore((state) => state.tags);
  const coverPreviewUrl = useTagEditorStore((state) => state.coverPreviewUrl);
  const closeTrackEditor = useTagEditorStore((state) => state.closeTrackEditor);
  const setCoverArtAction = useTagEditorStore((state) => state.setCoverArtAction);
  const saveCurrentTrack = useTagEditorStore((state) => state.saveCurrentTrack);

  const [title, setTitle] = useState(tags?.title || "");
  const [artistName, setArtistName] = useState(tags?.artist || "");
  const [albumName, setAlbumName] = useState(tags?.album || "");
  const [albumArtist, setAlbumArtist] = useState(tags?.albumArtist || "");
  const [genre, setGenre] = useState(tags?.genre || "");
  const [year, setYear] = useState<string>(
    tags?.year !== null && tags?.year !== undefined ? String(tags.year) : ""
  );
  const [trackNumber, setTrackNumber] = useState<string>(
    tags?.trackNumber !== null && tags?.trackNumber !== undefined ? String(tags.trackNumber) : ""
  );
  const [discNumber, setDiscNumber] = useState<string>(String(tags?.discNumber || 1));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
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
    <>
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

      {tags && (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Top row: Cover artwork & Technical properties */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "18px",
              background: "rgba(255, 255, 255, 0.02)",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Cover art preview & drop target */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                position: "relative",
                width: "140px",
                height: "140px",
                borderRadius: "8px",
                overflow: "hidden",
                border: isDragOver
                  ? "2px dashed var(--accent)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
                  alt="Track cover artwork"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--m)",
                    fontSize: "11px",
                    textAlign: "center",
                    padding: "8px",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>No cover art</span>
                </div>
              )}

              {/* Cover action overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(0, 0, 0, 0.75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "6px 4px",
                }}
              >
                <button
                  type="button"
                  onClick={handleNativeFilePick}
                  disabled={isSaving}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: 0,
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "10px",
                    padding: "3px 6px",
                    cursor: "pointer",
                  }}
                >
                  Replace
                </button>
                {coverPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    disabled={isSaving}
                    style={{
                      background: "rgba(239, 68, 68, 0.3)",
                      border: 0,
                      borderRadius: "4px",
                      color: "#fca5a5",
                      fontSize: "10px",
                      padding: "3px 6px",
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
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileReplacement(f);
                }}
              />
            </div>

            {/* Technical Stream Properties (read only badges) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--m)",
                }}
              >
                Audio File Details
              </span>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    color: "var(--t)",
                  }}
                >
                  Format: <strong>{tags.format.toUpperCase()}</strong>
                </span>

                {tags.bitrate && (
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      color: "var(--t)",
                    }}
                  >
                    Bitrate: <strong>{tags.bitrate} kbps</strong>
                  </span>
                )}

                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    color: "var(--t)",
                  }}
                >
                  Length: <strong>{formatDuration(tags.duration)}</strong>
                </span>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  fontSize: "11px",
                  color: "var(--m)",
                  wordBreak: "break-all",
                  lineHeight: "1.4",
                }}
              >
                <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>Path: </span>
                {tags.filePath}
              </div>
            </div>
          </div>

          {/* Form fields: Row 1 Title & Artist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-title" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Title *
              </label>
              <input
                id="single-edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                placeholder="Track title"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-artist" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Artist *
              </label>
              <input
                id="single-edit-artist"
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                disabled={isSaving}
                placeholder="Contributing artist"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Form fields: Row 2 Album & Album Artist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-album" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Album
              </label>
              <input
                id="single-edit-album"
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                disabled={isSaving}
                placeholder="Album title"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-album-artist" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Album Artist
              </label>
              <input
                id="single-edit-album-artist"
                type="text"
                value={albumArtist}
                onChange={(e) => setAlbumArtist(e.target.value)}
                disabled={isSaving}
                placeholder="Primary album artist"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Form fields: Row 3 Genre, Year, Track Number, Disc Number */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-genre" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Genre
              </label>
              <input
                id="single-edit-genre"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                disabled={isSaving}
                placeholder="Genre"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-year" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Year
              </label>
              <input
                id="single-edit-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isSaving}
                placeholder="YYYY"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-track-number" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Track #
              </label>
              <input
                id="single-edit-track-number"
                type="number"
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                disabled={isSaving}
                placeholder="1"
                min="1"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="single-edit-disc-number" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Disc #
              </label>
              <input
                id="single-edit-disc-number"
                type="number"
                value={discNumber}
                onChange={(e) => setDiscNumber(e.target.value)}
                disabled={isSaving}
                placeholder="1"
                min="1"
                style={{
                  background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "var(--t)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              type="button"
              onClick={closeTrackEditor}
              disabled={isSaving}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
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
    </>
  );
}
