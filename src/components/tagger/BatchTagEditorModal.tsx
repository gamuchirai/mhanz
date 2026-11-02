import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useTagEditorStore } from "../../store/useTagEditorStore";
import type { BatchTrackUpdates } from "../../types/tagger";

export function BatchTagEditorModal() {
  const isBatchOpen = useTagEditorStore((state) => state.isBatchOpen);
  const isBatchSaving = useTagEditorStore((state) => state.isBatchSaving);
  const batchError = useTagEditorStore((state) => state.batchError);
  const batchTracks = useTagEditorStore((state) => state.batchTracks);
  const batchFields = useTagEditorStore((state) => state.batchFields);
  const batchCoverPreviewUrl = useTagEditorStore((state) => state.batchCoverPreviewUrl);
  const batchSaveResult = useTagEditorStore((state) => state.batchSaveResult);
  const closeBatchEditor = useTagEditorStore((state) => state.closeBatchEditor);
  const setBatchCoverArtAction = useTagEditorStore((state) => state.setBatchCoverArtAction);
  const saveBatch = useTagEditorStore((state) => state.saveBatch);
  const clearBatchSaveResult = useTagEditorStore((state) => state.clearBatchSaveResult);

  // Form values
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState<string>("");
  const [discNumber, setDiscNumber] = useState<string>("");

  // Tracking touched/modified fields to satisfy AC-4 (only commit explicitly changed fields)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (batchFields) {
      setArtistName(batchFields.artist ?? "");
      setAlbumName(batchFields.album ?? "");
      setAlbumArtist(batchFields.albumArtist ?? "");
      setGenre(batchFields.genre ?? "");
      setYear(batchFields.year !== null ? String(batchFields.year) : "");
      setDiscNumber(batchFields.discNumber !== null ? String(batchFields.discNumber) : "");
      setTouchedFields({});
      setValidationError(null);
    }
  }, [batchFields]);

  if (!isBatchOpen) {
    return null;
  }

  const markTouched = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleFileReplacement = (file: File) => {
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
        setBatchCoverArtAction(
          {
            type: "replace_bytes",
            imageBytesBase64: base64Data,
            mimeType: file.type || "image/jpeg",
          },
          preview,
        );
        markTouched("cover");
        setValidationError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNativeFilePick = async () => {
    try {
      if (isTauri()) {
        const selected = await openDialog({
          title: "Select Batch Cover Artwork",
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
          setBatchCoverArtAction(
            {
              type: "replace_path",
              sourceFilePath: selected,
            },
            preview,
          );
          markTouched("cover");
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
    setBatchCoverArtAction({ type: "remove" }, null);
    markTouched("cover");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: BatchTrackUpdates = {};

    if (touchedFields["artistName"]) {
      updates.artistName = artistName.trim();
    }
    if (touchedFields["albumName"]) {
      updates.albumName = albumName.trim() || undefined;
    }
    if (touchedFields["albumArtist"]) {
      updates.albumArtist = albumArtist.trim() || null;
    }
    if (touchedFields["genre"]) {
      updates.genre = genre.trim() || null;
    }
    if (touchedFields["year"]) {
      const parsed = year.trim() ? parseInt(year.trim(), 10) : null;
      if (parsed !== null && (isNaN(parsed) || parsed < 1000 || parsed > 2200)) {
        setValidationError("Please enter a valid four digit release year.");
        return;
      }
      updates.year = parsed;
    }
    if (touchedFields["discNumber"]) {
      const parsed = discNumber.trim() ? parseInt(discNumber.trim(), 10) : undefined;
      updates.discNumber = parsed;
    }

    setValidationError(null);
    await saveBatch(updates);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-tag-editor-title"
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
        if (e.target === e.currentTarget && !isBatchSaving) {
          closeBatchEditor();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isBatchSaving) {
          closeBatchEditor();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
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
              id="batch-tag-editor-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--t)",
              }}
            >
              Batch Edit Details
            </h2>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>
              Applying changes across {batchTracks.length} tracks. Album ID and favorite status will be preserved.
            </span>
          </div>

          <button
            type="button"
            onClick={closeBatchEditor}
            disabled={isBatchSaving}
            aria-label="Close modal"
            style={{
              background: "none",
              border: 0,
              color: "var(--m)",
              fontSize: "18px",
              cursor: isBatchSaving ? "not-allowed" : "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Partial failure notice from previous attempt if any */}
        {batchSaveResult && batchSaveResult.failed.length > 0 && (
          <div
            role="alert"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fcd34d",
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              Saved {batchSaveResult.totalUpdated} tracks with {batchSaveResult.failed.length} failure(s):
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {batchSaveResult.failed.map((fail) => (
                <li key={fail.trackId}>
                  <span style={{ fontFamily: "monospace" }}>{fail.filePath}</span>: {fail.error}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={clearBatchSaveResult}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                color: "var(--t)",
                textDecoration: "underline",
                fontSize: "11px",
                cursor: "pointer",
                padding: 0,
                marginTop: "4px",
              }}
            >
              Dismiss notice
            </button>
          </div>
        )}

        {(batchError || validationError) && (
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
            {batchError || validationError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Top cover preview block */}
          <div
            style={{
              display: "flex",
              gap: "18px",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.2)",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
                background: "#241a16",
                border: isDragOver
                  ? "2px dashed var(--accent)"
                  : "1px solid rgba(255, 255, 255, 0.12)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {batchCoverPreviewUrl ? (
                <img
                  src={batchCoverPreviewUrl}
                  alt="Batch cover artwork preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "6px",
                    color: "var(--m)",
                    fontSize: "11px",
                  }}
                >
                  {batchFields?.hasMultipleCovers ? "(Multiple artwork)" : "No Artwork"}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <div style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
                Album Artwork
              </div>
              <div style={{ fontSize: "11px", color: "var(--m)" }}>
                Drop or select an image to replace embedded cover across all {batchTracks.length} tracks.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleNativeFilePick}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    color: "var(--t)",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Replace Artwork
                </button>
                {(batchCoverPreviewUrl || !batchFields?.hasMultipleCovers) && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "6px",
                      color: "#fca5a5",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Remove Artwork
                  </button>
                )}
              </div>
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

          {/* Form grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-artist" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Artist
                </label>
                <input id="batch-artist"
                type="text"
                value={artistName}
                placeholder={batchFields?.hasMultipleArtists ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setArtistName(e.target.value);
                  markTouched("artistName");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["artistName"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-album-title" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Album Title
                </label>
                <input id="batch-album-title"
                type="text"
                value={albumName}
                placeholder={batchFields?.hasMultipleAlbums ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setAlbumName(e.target.value);
                  markTouched("albumName");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["albumName"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-album-artist" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Album Artist
                </label>
                <input id="batch-album-artist"
                type="text"
                value={albumArtist}
                placeholder={batchFields?.hasMultipleAlbumArtists ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setAlbumArtist(e.target.value);
                  markTouched("albumArtist");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["albumArtist"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-genre" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Genre
                </label>
                <input id="batch-genre"
                type="text"
                value={genre}
                placeholder={batchFields?.hasMultipleGenres ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setGenre(e.target.value);
                  markTouched("genre");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["genre"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-release-year" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Release Year
                </label>
                <input id="batch-release-year"
                type="number"
                value={year}
                placeholder={batchFields?.hasMultipleYears ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setYear(e.target.value);
                  markTouched("year");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["year"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="batch-disc-number" style={{ fontSize: "11px", color: "var(--m)", fontWeight: 500 }}>
                  Disc Number
                </label>
                <input id="batch-disc-number"
                type="number"
                min="1"
                value={discNumber}
                placeholder={batchFields?.hasMultipleDiscs ? "(Multiple values)" : ""}
                onChange={(e) => {
                  setDiscNumber(e.target.value);
                  markTouched("discNumber");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: touchedFields["discNumber"]
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "var(--t)",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>

          {/* Modal action buttons */}
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
              onClick={closeBatchEditor}
              disabled={isBatchSaving}
              style={{
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                color: "var(--t)",
                fontSize: "13px",
                cursor: isBatchSaving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isBatchSaving}
              style={{
                padding: "8px 20px",
                background: isBatchSaving ? "rgba(240, 169, 130, 0.5)" : "var(--accent)",
                border: 0,
                borderRadius: "20px",
                color: "#18110f",
                fontWeight: 600,
                fontSize: "13px",
                cursor: isBatchSaving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isBatchSaving ? "Updating files..." : `Save changes (${batchTracks.length} tracks)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

