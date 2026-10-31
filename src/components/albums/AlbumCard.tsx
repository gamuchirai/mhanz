import { useState } from "react";
import type { Album } from "../../types/album";
import { useAlbumStore } from "../../store/useAlbumStore";
import { useNavigationStore } from "../../store/useNavigationStore";
import { AlbumVinylPlaceholder } from "./AlbumVinylPlaceholder";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const setActiveAlbumId = useAlbumStore((state) => state.setActiveAlbumId);
  const playAlbum = useAlbumStore((state) => state.playAlbum);

  const hasImage = Boolean(album.coverUrl) && !imageError;

  return (
    <article
      aria-label={`Album ${album.title} by ${album.artistName}`}
      onClick={() => {
        setActiveAlbumId(album.id);
        useNavigationStore.getState().navigate("Albums", { albumId: album.id });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px",
        borderRadius: "14px",
        background: isHovered ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
        border: isHovered
          ? "1px solid rgba(240, 169, 130, 0.25)"
          : "1px solid rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: isHovered ? "translateY(-3px)" : "none",
        boxShadow: isHovered
          ? "0 10px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(240, 169, 130, 0.08)"
          : "none",
      }}
    >
      {/* Cover Image Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#18110f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {hasImage ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.3s ease",
              transform: isHovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        ) : (
          <AlbumVinylPlaceholder title={album.title} />
        )}

        {/* Hover Quick Play Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playAlbum(album.id);
          }}
          aria-label={`Play album ${album.title}`}
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#18110f",
            border: "none",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.5)",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "scale(1)" : "scale(0.85)",
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <svg className="i" width="18" height="18" aria-hidden="true">
            <use href="#play" />
          </svg>
        </button>
      </div>

      {/* Album Text Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h3
          title={album.title}
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}
        >
          {album.title}
        </h3>

        <div
          title={album.artistName}
          style={{
            fontSize: "13px",
            color: "var(--m)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {album.artistName}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
            marginTop: "2px",
          }}
        >
          <span>{album.releaseYear}</span>
          <span>•</span>
          <span>{album.trackCount} tracks</span>
        </div>
      </div>
    </article>
  );
}
