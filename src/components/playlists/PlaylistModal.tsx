import { useState } from "react";
import type { Playlist } from "../../types/playlist";
import { MIDNIGHT_GRADIENT_PRESETS } from "../../data/playlistFixtures";
import {
  useActivePlaylist,
  useIsCreateModalOpen,
  useIsEditModalOpen,
  usePlaylistStore,
} from "../../store/usePlaylistStore";

interface PlaylistModalProps {
  mode: "create" | "edit";
}

interface ModalFormProps {
  mode: "create" | "edit";
  activePlaylist: Playlist | null;
  onClose: () => void;
  onSubmitCreate: (data: {
    title: string;
    description: string;
    coverGradient: string;
    coverUrl?: string;
  }) => void;
  onSubmitUpdate: (
    id: string,
    data: {
      title: string;
      description: string;
      coverGradient: string;
      coverUrl?: string;
    }
  ) => void;
}

function PlaylistModalContent({
  mode,
  activePlaylist,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: ModalFormProps) {
  const [title, setTitle] = useState(mode === "edit" && activePlaylist ? activePlaylist.title : "");
  const [description, setDescription] = useState(
    mode === "edit" && activePlaylist ? activePlaylist.description : ""
  );
  const [selectedGradient, setSelectedGradient] = useState(
    mode === "edit" && activePlaylist
      ? activePlaylist.coverGradient
      : MIDNIGHT_GRADIENT_PRESETS[0].gradient
  );
  const [coverUrl, setCoverUrl] = useState(
    mode === "edit" && activePlaylist?.coverUrl ? activePlaylist.coverUrl : ""
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Please enter a playlist name");
      return;
    }

    if (mode === "create") {
      onSubmitCreate({
        title: trimmedTitle,
        description: description.trim(),
        coverGradient: selectedGradient,
        coverUrl: coverUrl.trim() || undefined,
      });
    } else if (activePlaylist) {
      onSubmitUpdate(activePlaylist.id, {
        title: trimmedTitle,
        description: description.trim(),
        coverGradient: selectedGradient,
        coverUrl: coverUrl.trim() || undefined,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
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
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#18110f",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            id="playlist-modal-title"
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--t)",
            }}
          >
            {mode === "create" ? "Create New Playlist" : "Edit Playlist Details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: 0,
              color: "var(--m)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Live Cover Preview */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "10px",
                background: selectedGradient,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              {coverUrl.trim() && (
                <img
                  src={coverUrl.trim()}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
              <span style={{ fontSize: "12px", color: "var(--m)" }}>Cover Artwork Preview</span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--t)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title.trim() || "Untitled Playlist"}
              </span>
              <span style={{ fontSize: "12px", color: "var(--m)", opacity: 0.8 }}>
                {description.trim() || "No description"}
              </span>
            </div>
          </div>

          {/* Title Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="playlist-title-input"
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}
            >
              Playlist Name <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <input
              id="playlist-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder="e.g. Midnight Beats, Sunset Drive"
              autoFocus
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: errorMessage ? "1px solid #ff6b6b" : "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--t)",
                fontSize: "14px",
                outline: "none",
              }}
            />
            {errorMessage && (
              <span style={{ fontSize: "12px", color: "#ff6b6b" }}>{errorMessage}</span>
            )}
          </div>

          {/* Description Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="playlist-description-input"
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}
            >
              Description <span style={{ fontSize: "11px", color: "var(--m)" }}>(Optional)</span>
            </label>
            <textarea
              id="playlist-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe or notes..."
              rows={2}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--t)",
                fontSize: "13px",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Midnight Gradient Swatches */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}>
              Midnight Gradient Preset
            </label>
            <div
              role="radiogroup"
              aria-label="Choose cover gradient preset"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "8px",
              }}
            >
              {MIDNIGHT_GRADIENT_PRESETS.map((preset) => {
                const isSelected = selectedGradient === preset.gradient;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={preset.name}
                    onClick={() => setSelectedGradient(preset.gradient)}
                    style={{
                      height: "44px",
                      borderRadius: "8px",
                      background: preset.gradient,
                      border: isSelected
                        ? "2px solid var(--accent)"
                        : "1px solid rgba(255, 255, 255, 0.15)",
                      cursor: "pointer",
                      position: "relative",
                      transition: "transform 0.15s ease",
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 700,
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Artwork URL */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="playlist-cover-url-input"
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}
            >
              Custom Cover Image URL{" "}
              <span style={{ fontSize: "11px", color: "var(--m)" }}>(Optional)</span>
            </label>
            <input
              id="playlist-cover-url-input"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--t)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 18px",
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
              type="submit"
              style={{
                padding: "9px 22px",
                borderRadius: "20px",
                background: "var(--accent)",
                color: "#18110f",
                border: 0,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {mode === "create" ? "Create Playlist" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PlaylistModal({ mode }: PlaylistModalProps) {
  const isCreateOpen = useIsCreateModalOpen();
  const isEditOpen = useIsEditModalOpen();
  const activePlaylist = useActivePlaylist();

  const setCreateModalOpen = usePlaylistStore((state) => state.setCreateModalOpen);
  const setEditModalOpen = usePlaylistStore((state) => state.setEditModalOpen);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const updatePlaylist = usePlaylistStore((state) => state.updatePlaylist);

  const isOpen = mode === "create" ? isCreateOpen : isEditOpen;

  if (!isOpen) return null;

  const handleClose = () => {
    if (mode === "create") {
      setCreateModalOpen(false);
    } else {
      setEditModalOpen(false);
    }
  };

  return (
    <PlaylistModalContent
      key={`${mode}-${activePlaylist?.id ?? "new"}`}
      mode={mode}
      activePlaylist={activePlaylist}
      onClose={handleClose}
      onSubmitCreate={createPlaylist}
      onSubmitUpdate={updatePlaylist}
    />
  );
}
