import { useState } from "react";
import type { Artist } from "../../types/artists";
import { useArtistStore } from "../../store/useArtistStore";
import { getArtistGradient, getArtistInitials, formatWithCommas } from "../../utils/avatarUtils";

interface ArtistProfileBannerProps {
  artist: Artist;
}

export function ArtistProfileBanner({ artist }: ArtistProfileBannerProps) {
  const [imageError, setImageError] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const setActiveArtistId = useArtistStore((state) => state.setActiveArtistId);
  const toggleFollowArtist = useArtistStore((state) => state.toggleFollowArtist);
  const playArtistTopTracks = useArtistStore((state) => state.playArtistTopTracks);

  const hasImage = Boolean(artist.avatarUrl) && !imageError;
  const avatarScheme = getArtistGradient(artist.id || artist.name);
  const initials = getArtistInitials(artist.name);

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
          onClick={() => setActiveArtistId(null)}
          aria-label="Back to all artists"
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.color = "var(--t)";
          }}
        >
          <svg className="i" width="16" height="16" aria-hidden="true">
            <use href="#cl" />
          </svg>
          <span>All Artists</span>
        </button>
      </div>

      {/* Atmospheric Hero Banner */}
      <section
        aria-label={`${artist.name} hero profile`}
        style={{
          position: "relative",
          borderRadius: "18px",
          padding: "36px 32px",
          overflow: "hidden",
          background: `radial-gradient(1200px 500px at 0% 0%, ${avatarScheme.glow}, transparent 75%), #150f0c`,
          border: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          gap: "32px",
          alignItems: "center",
          flexWrap: "wrap",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Large Circular Artist Portrait */}
        <div
          style={{
            position: "relative",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: avatarScheme.gradient,
            boxShadow: `0 12px 36px rgba(0, 0, 0, 0.6), 0 0 32px ${avatarScheme.glow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              }}
            />
          ) : (
            /* Fallback Procedural Avatar (AC-11) */
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
              <svg
                className="i"
                width="60"
                height="60"
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
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "0.05em",
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                  zIndex: 1,
                }}
              >
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Artist Information & Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flex: 1,
            minWidth: "280px",
          }}
        >
          {/* Verified Badge / Type */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {artist.verified ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: "rgba(240, 169, 130, 0.16)",
                  border: "1px solid rgba(240, 169, 130, 0.3)",
                  color: "var(--accent)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                <span>✓</span> In Library
              </span>
            ) : (
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--m)",
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                Artist
              </span>
            )}

            {artist.genres.map((genre) => (
              <span
                key={genre}
                style={{
                  fontSize: "11px",
                  color: "var(--m)",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "3px 8px",
                  borderRadius: "10px",
                }}
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Artist Name Header */}
          <h1
            style={{
              margin: 0,
              fontSize: "40px",
              fontWeight: 800,
              color: "var(--t)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {artist.name}
          </h1>

          {/* Library & Play Statistics */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "14px",
              color: "var(--m)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--t)", fontWeight: 500 }}>
              {artist.albumIds.length} {artist.albumIds.length === 1 ? "album" : "albums"}
            </span>
            <span>•</span>
            <span>{artist.popularTrackIds.length} tracks</span>
            <span>•</span>
            <span>{formatWithCommas(artist.monthlyListeners)} plays</span>
          </div>

          {/* Action Controls Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Play Button */}
            <button
              type="button"
              onClick={() => playArtistTopTracks(artist.id)}
              aria-label={`Play top tracks by ${artist.name}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                borderRadius: "24px",
                background: "var(--accent)",
                color: "#18110f",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(240, 169, 130, 0.3)",
                transition: "transform 0.15s ease, opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <svg className="i" width="16" height="16" aria-hidden="true">
                <use href="#play" />
              </svg>
              <span>Play</span>
            </button>

            {/* Favorite Toggle Button (AC-10) */}
            <button
              type="button"
              onClick={() => toggleFollowArtist(artist.id)}
              aria-label={
                artist.isFollowed ? `Favorited ${artist.name}` : `Favorite ${artist.name}`
              }
              aria-pressed={artist.isFollowed}
              style={{
                padding: "9px 20px",
                borderRadius: "24px",
                border: artist.isFollowed
                  ? "1px solid rgba(240, 169, 130, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                background: artist.isFollowed
                  ? "rgba(240, 169, 130, 0.14)"
                  : "rgba(255, 255, 255, 0.05)",
                color: artist.isFollowed ? "var(--accent)" : "var(--t)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (artist.isFollowed) {
                  e.currentTarget.style.background = "rgba(240, 169, 130, 0.22)";
                } else {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (artist.isFollowed) {
                  e.currentTarget.style.background = "rgba(240, 169, 130, 0.14)";
                } else {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.color = "var(--t)";
                }
              }}
            >
              {artist.isFollowed ? "Favorited" : "Favorite"}
            </button>

            {/* Options Menu Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsOptionsOpen((prev) => !prev)}
                aria-label="More artist options"
                aria-expanded={isOptionsOpen}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "var(--m)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--t)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--m)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <svg className="i" width="18" height="18" aria-hidden="true">
                  <use href="#dots" />
                </svg>
              </button>

              {isOptionsOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "46px",
                    left: 0,
                    minWidth: "180px",
                    background: "#1c1411",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "6px",
                    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.6)",
                    zIndex: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      playArtistTopTracks(artist.id);
                      setIsOptionsOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      color: "var(--t)",
                      fontSize: "13px",
                      textAlign: "left",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Play Artist Radio
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      navigator.clipboard?.writeText?.(artist.name);
                      setIsOptionsOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      color: "var(--t)",
                      fontSize: "13px",
                      textAlign: "left",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Copy Artist Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
