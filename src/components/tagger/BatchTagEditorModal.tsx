import { useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useTagEditorStore } from "../../store/useTagEditorStore";
import type { BatchTrackUpdates } from "../../types/tagger";

export function BatchTagEditorModal() {
  const isBatchOpen = useTagEditorStore((state) => state.isBatchOpen);
  const isBatchSaving = useTagEditorStore((state) => state.isBatchSaving);
  const batchAlbumId = useTagEditorStore((state) => state.batchAlbumId);
  const batchTrackIds = useTagEditorStore((state) => state.batchTrackIds);
  const closeBatchEditor = useTagEditorStore((state) => state.closeBatchEditor);

  if (!isBatchOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-editor-title"
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
        if (e.target === e.currentTarget && !isBatchSaving) {
          closeBatchEditor();
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
        <BatchTagEditorForm key={batchAlbumId || batchTrackIds.join(",")} />
      </div>
    </div>
  );
}

function BatchTagEditorForm() {
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
  const [artistName, setArtistName] = useState(batchFields?.artist ?? "");
  const [albumName, setAlbumName] = useState(batchFields?.album ?? "");
  const [albumArtist, setAlbumArtist] = useState(batchFields?.albumArtist ?? "");
  const [genre, setGenre] = useState(batchFields?.genre ?? "");
  const [year, setYear] = useState<string>(
    batchFields?.year !== null && batchFields?.year !== undefined ? String(batchFields.year) : ""
  );
  const [discNumber, setDiscNumber] = useState<string>(
    batchFields?.discNumber !== null && batchFields?.discNumber !== undefined ? String(batchFields.discNumber) : ""
  );

  // Tracking touched/modified fields to satisfy AC-4 (only commit explicitly changed fields)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setBatchCoverArtAction({ type: "remove" }, null);
    markTouched("cover");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedYear = year.trim() ? parseInt(year.trim(), 10) : null;
    if (touchedFields.year && parsedYear !== null && (isNaN(parsedYear) || parsedYear < 1000 || parsedYear > 2200)) {
      setValidationError("Please enter a valid four digit release year.");
      return;
    }

    const parsedDiscNo = discNumber.trim() ? parseInt(discNumber.trim(), 10) : null;
    if (touchedFields.discNumber && parsedDiscNo !== null && (isNaN(parsedDiscNo) || parsedDiscNo < 1)) {
      setValidationError("Disc number must be greater than zero.");
      return;
    }

    const updates: BatchTrackUpdates = {};
    if (touchedFields.artist) updates.artistName = artistName.trim() || undefined;
    if (touchedFields.album) updates.albumName = albumName.trim() || undefined;
    if (touchedFields.albumArtist) updates.albumArtist = albumArtist.trim() || null;
    if (touchedFields.genre) updates.genre = genre.trim() || null;
    if (touchedFields.year) updates.year = parsedYear;
    if (touchedFields.discNumber) updates.discNumber = parsedDiscNo || undefined;

    setValidationError(null);
    await saveBatch(updates);
  };

  const handleDismissResult = () => {
    clearBatchSaveResult();
    closeBatchEditor();
  };

  return (
    <>
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
            id="batch-editor-title"
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--t)",
            }}
          >
            Edit Multiple Tracks ({batchTracks.length} tracks)
          </h2>
          <span style={{ fontSize: "12px", color: "var(--m)" }}>
            Applying changes across {batchTracks.length} tracks. Only touched fields are updated.
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

      {/* Partial / Full completion summary notice */}
      {batchSaveResult && (
        <div
          role="status"
          style={{
            background:
              batchSaveResult.failed.length > 0
                ? "rgba(245, 158, 11, 0.12)"
                : "rgba(16, 185, 129, 0.12)",
            border: `1px solid ${batchSaveResult.failed.length > 0 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            color: batchSaveResult.failed.length > 0 ? "#fcd34d" : "#6ee7b7",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong>
              {batchSaveResult.failed.length === 0
                ? `Successfully updated ${batchSaveResult.totalUpdated} track(s)!`
                : `Updated ${batchSaveResult.totalUpdated} track(s), with ${batchSaveResult.failed.length} failure(s).`}
            </strong>
            <button
              type="button"
              onClick={handleDismissResult}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: 0,
                borderRadius: "4px",
                color: "#fff",
                fontSize: "11px",
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>

          {batchSaveResult.failed.length > 0 && (
            <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", fontSize: "11px" }}>
              {batchSaveResult.failed.map((f) => (
                <li key={f.trackId}>
                  Track {f.trackId}: {f.error}
                </li>
              ))}
            </ul>
          )}
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
        {/* Cover artwork row */}
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
            {batchCoverPreviewUrl ? (
              <img
                src={batchCoverPreviewUrl}
                alt="Batch artwork"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                <span>(Multiple or empty artwork)</span>
              </div>
            )}

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
                disabled={isBatchSaving}
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
              {batchCoverPreviewUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isBatchSaving}
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

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--m)",
              }}
            >
              Batch Album Artwork
            </span>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--t)", lineHeight: "1.5" }}>
              Replaces the embedded cover art on all {batchTracks.length} selected files and updates the album record in place.
            </p>
          </div>
        </div>

        {/* Form fields: Row 1 Artist & Album Artist */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-artist" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Artist
            </label>
            <input
              id="batch-edit-artist"
              type="text"
              value={artistName}
              placeholder={batchFields?.hasMultipleArtists ? "(Multiple values)" : "Artist name"}
              onChange={(e) => {
                setArtistName(e.target.value);
                markTouched("artist");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.artist ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-album-artist" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Album Artist
            </label>
            <input
              id="batch-edit-album-artist"
              type="text"
              value={albumArtist}
              placeholder={batchFields?.hasMultipleAlbumArtists ? "(Multiple values)" : "Album artist"}
              onChange={(e) => {
                setAlbumArtist(e.target.value);
                markTouched("albumArtist");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.albumArtist ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Form fields: Row 2 Album title & Genre */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-album" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Album
            </label>
            <input
              id="batch-edit-album"
              type="text"
              value={albumName}
              placeholder={batchFields?.hasMultipleAlbums ? "(Multiple values)" : "Album title"}
              onChange={(e) => {
                setAlbumName(e.target.value);
                markTouched("album");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.album ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-genre" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Genre
            </label>
            <input
              id="batch-edit-genre"
              type="text"
              value={genre}
              placeholder={batchFields?.hasMultipleGenres ? "(Multiple values)" : "Genre"}
              onChange={(e) => {
                setGenre(e.target.value);
                markTouched("genre");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.genre ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Form fields: Row 3 Year & Disc Number */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-year" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Release Year
            </label>
            <input
              id="batch-edit-year"
              type="number"
              value={year}
              placeholder={batchFields?.hasMultipleYears ? "(Multiple values)" : "YYYY"}
              onChange={(e) => {
                setYear(e.target.value);
                markTouched("year");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.year ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="batch-edit-disc-number" style={{ fontSize: "12px", color: "var(--t)", fontWeight: 500 }}>
              Disc Number
            </label>
            <input
              id="batch-edit-disc-number"
              type="number"
              value={discNumber}
              placeholder={batchFields?.hasMultipleDiscs ? "(Multiple values)" : "1"}
              min="1"
              onChange={(e) => {
                setDiscNumber(e.target.value);
                markTouched("discNumber");
              }}
              disabled={isBatchSaving}
              style={{
                background: "var(--bg-input, rgba(0, 0, 0, 0.25))",
                border: `1px solid ${touchedFields.discNumber ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
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
            onClick={closeBatchEditor}
            disabled={isBatchSaving}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
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
            {isBatchSaving ? "Saving batch..." : `Save ${batchTracks.length} tracks`}
          </button>
        </div>
      </form>
    </>
  );
}
