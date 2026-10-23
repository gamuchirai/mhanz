import { useState } from "react";
import type { Artist } from "../../types/artists";
import { useArtistStore } from "../../store/useArtistStore";
import {
  getArtistGradient,
  getArtistInitials,
  formatCompactNumber,
} from "../../utils/avatarUtils";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const setActiveArtistId = useArtistStore((state) => state.setActiveArtistId);
  const toggleFollowArtist = useArtistStore((state) => state.toggleFollowArtist);
  const playArtistTopTracks = useArtistStore((state) => state.playArtistTopTracks);

  const hasImage = Boolean(artist.avatarUrl) && !imageError;
  const avatarScheme = getArtistGradient(artist.id || artist.name);
  const initials = getArtistInitials(artist.name);

  const handleCardClick = () => {
    setActiveArtistId(artist.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFollowArtist(artist.id);
  };

  const handleQuickPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playArtistTopTracks(artist.id);
  };

  return (
    <article
      aria-label={`Artist ${artist.name}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        padding: "16px 14px",
        borderRadius: "16px",
        background: isHovered
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(255, 255, 255, 0.02)",
        border: isHovered
          ? "1px solid rgba(240, 169, 130, 0.25)"
          : "1px solid rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: isHovered ? "translateY(-3px)" : "none",
        boxShadow: isHovered
          ? "0 10px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(240, 169, 130, 0.08)"
          : "none",
        textAlign: "center",
      }}
    >
      {/* Circular Avatar Container with Procedural Gradient Fallback */}
      <div
        style={{
          position: "relative",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          overflow: "hidden",
          background: avatarScheme.gradient,
          boxShadow: isHovered
            ? `0 6px 20px ${avatarScheme.glow}`
            : "0 4px 12px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          transform: isHovered ? "scale(1.03)" : "scale(1)",
        }}
      >
        {hasImage ? (
          <img
            src={artist.avatarUrl}
            alt={artist.name}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          /* Procedural Fallback Placeholder (AC-11) */
          <div
            role="img"
            aria-label={`Procedural avatar for ${artist.name}`}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Ambient Microphone Icon Backdrop */}
            <svg
              className="i"
              width="44"
              height="44"
              aria-hidden="true"
              style={{
                color: "rgba(255, 255, 255, 0.15)",
                position: "absolute",
              }}
            >
              <use href="#user" />
            </svg>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.05em",
                textShadow: "0 2px 6px rgba(0, 0, 0, 0.7)",
                zIndex: 1,
              }}
            >
              {initials}
            </span>
          </div>
        )}

        {/* Hover Quick-Play Button Overlay */}
        {isHovered && (
          <button
            type="button"
            onClick={handleQuickPlay}
            aria-label={`Play top tracks by ${artist.name}`}
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#18110f",
              border: "none",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
              transform: "scale(1)",
              zIndex: 3,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#play" />
            </svg>
          </button>
        )}
      </div>

      {/* Artist Information */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "100%",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--t)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "140px",
            }}
            title={artist.name}
          >
            {artist.name}
          </span>
          {artist.verified && (
            <span
              title="Verified Artist"
              aria-label="Verified Artist"
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#1c0f09",
                flexShrink: 0,
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: "12px",
            color: "var(--m)",
            fontWeight: 400,
          }}
        >
          {formatCompactNumber(artist.followerCount)} followers
        </span>
      </div>

      {/* Follow / Following Button (AC-1, AC-10) */}
      <button
        type="button"
        onClick={handleFollowClick}
        aria-label={artist.isFollowed ? `Following ${artist.name}` : `Follow ${artist.name}`}
        aria-pressed={artist.isFollowed}
        style={{
          marginTop: "2px",
          padding: "6px 16px",
          borderRadius: "16px",
          border: artist.isFollowed
            ? "1px solid rgba(240, 169, 130, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          background: artist.isFollowed
            ? "rgba(240, 169, 130, 0.12)"
            : "rgba(255, 255, 255, 0.04)",
          color: artist.isFollowed ? "var(--accent)" : "var(--t)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (artist.isFollowed) {
            e.currentTarget.style.background = "rgba(240, 169, 130, 0.2)";
          } else {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--accent)";
          }
        }}
        onMouseLeave={(e) => {
          if (artist.isFollowed) {
            e.currentTarget.style.background = "rgba(240, 169, 130, 0.12)";
          } else {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.color = "var(--t)";
          }
        }}
      >
        {artist.isFollowed ? "Following" : "Follow"}
      </button>
    </article>
  );
}
