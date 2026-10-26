import { useState } from "react";
import type { Album } from "../../types/album";
import { useAlbumStore, useAlbumTracks, useFavoriteAlbumIds } from "../../store/useAlbumStore";
import { AlbumVinylPlaceholder } from "./AlbumVinylPlaceholder";

interface AlbumDetailBannerProps {
  album: Album;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  onNavigate?: (nav: string) => void;
}

export function AlbumDetailBanner({ album, onNavigateArtist, onNavigate }: AlbumDetailBannerProps) {
  const [imageError, setImageError] = useState(false);
  const setActiveAlbumId = useAlbumStore((state) => state.setActiveAlbumId);
  const playAlbum = useAlbumStore((state) => state.playAlbum);
  const shuffleAlbum = useAlbumStore((state) => state.shuffleAlbum);
  const toggleFavoriteAlbum = useAlbumStore((state) => state.toggleFavoriteAlbum);
  const favoriteAlbumIds = useFavoriteAlbumIds();
  const tracks = useAlbumTracks(album.id);

  const isFavorite = favoriteAlbumIds.includes(album.id);
  const totalDuration = tracks.reduce((acc, t) => acc + t.duration, 0) || album.totalDuration;
  const trackCount = tracks.length || album.trackCount;

  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    if (seconds > 0) {
      return `${minutes} min ${seconds} sec`;
    }
    return `${minutes} min`;
  };

  const handleArtistClick = () => {
    if (onNavigateArtist) {
      onNavigateArtist(album.artistId, album.artistName);
    } else if (onNavigate) {
      onNavigate("Artists");
    }
  };

  const hasImage = Boolean(album.coverUrl) && !imageError;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* Top Navigation Row: Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setActiveAlbumId(null)}
          aria-label="Back to all albums"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "8px 16px",
            borderRadius: "20px",
            color: "var(--t)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#cl" />
          </svg>
          <span>All Albums</span>
        </button>
      </div>

      {/* Hero Banner with Glowing Cover Art */}
      <div
        style={{
          display: "flex",
          gap: "28px",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {/* Cover Art Container with Ambient Glow */}
        <div
          style={{
            position: "relative",
            width: "200px",
            height: "200px",
            flexShrink: 0,
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6), 0 0 40px rgba(240, 169, 130, 0.12)",
            background: "#18110f",
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
              }}
            />
          ) : (
            <AlbumVinylPlaceholder title={album.title} />
          )}
        </div>

        {/* Hero Metadata Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
            minWidth: "260px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: ".12em",
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            <span>Album</span>
            {album.label && (
              <>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ color: "var(--m)" }}>{album.label}</span>
              </>
            )}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--t)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {album.title}
          </h1>

          {album.description && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                color: "var(--m)",
                lineHeight: 1.45,
                maxWidth: "640px",
              }}
            >
              {album.description}
            </p>
          )}

          {/* Stats & Artist Line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--m)",
              fontSize: "13px",
              marginTop: "4px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleArtistClick}
              aria-label={`View artist profile for ${album.artistName}`}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "var(--t)",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {album.artistName}
            </button>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{album.releaseYear}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span
              style={{
                background: "rgba(240, 169, 130, 0.12)",
                color: "var(--accent)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {album.genre}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>
              {trackCount} {trackCount === 1 ? "track" : "tracks"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          paddingTop: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Play All Button */}
          <button
            type="button"
            onClick={() => playAlbum(album.id)}
            disabled={trackCount === 0}
            aria-label="Play all album tracks"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "24px",
              background: trackCount === 0 ? "rgba(255,255,255,0.08)" : "var(--accent)",
              color: trackCount === 0 ? "var(--m)" : "#18110f",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: trackCount === 0 ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#play" />
            </svg>
            <span>Play All</span>
          </button>

          {/* Shuffle Button */}
          <button
            type="button"
            onClick={() => shuffleAlbum(album.id)}
            disabled={trackCount === 0}
            aria-label="Shuffle album tracks"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "var(--t)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: trackCount === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#shuffle" />
            </svg>
            <span>Shuffle</span>
          </button>

          {/* Favorite Album Heart Toggle */}
          <button
            type="button"
            onClick={() => toggleFavoriteAlbum(album.id)}
            aria-label={isFavorite ? "Remove album from favorites" : "Save album to favorites"}
            style={{
              display: "grid",
              placeItems: "center",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: isFavorite ? "rgba(240, 169, 130, 0.16)" : "rgba(255, 255, 255, 0.04)",
              border: isFavorite
                ? "1px solid rgba(240, 169, 130, 0.3)"
                : "1px solid rgba(255, 255, 255, 0.08)",
              color: isFavorite ? "var(--accent)" : "var(--m)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              className="i"
              width="18"
              height="18"
              aria-hidden="true"
              style={{
                fill: isFavorite ? "currentColor" : "none",
                stroke: "currentColor",
                strokeWidth: 2,
              }}
            >
              <use href="#heart" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
