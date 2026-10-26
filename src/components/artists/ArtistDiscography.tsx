import { useState } from "react";
import { useArtistStore, useArtistReleases } from "../../store/useArtistStore";
import { useAlbumStore } from "../../store/useAlbumStore";
import type { DiscographyFilter, ArtistRelease } from "../../types/artists";

interface ArtistDiscographyProps {
  artistId: string;
  onNavigate?: (nav: string) => void;
}

export function ArtistDiscography({ artistId, onNavigate }: ArtistDiscographyProps) {
  const releases = useArtistReleases(artistId);
  const filter = useArtistStore((state) => state.discographyFilter);
  const setDiscographyFilter = useArtistStore((state) => state.setDiscographyFilter);

  const filters: { id: DiscographyFilter; label: string }[] = [
    { id: "all", label: "All Releases" },
    { id: "album", label: "Albums" },
    { id: "single", label: "Singles & EPs" },
  ];

  const handleReleaseClick = (release: ArtistRelease) => {
    // If the release corresponds to an album, activate it and deep-link to Albums screen (AC-6)
    const storeAlbums = useAlbumStore.getState().albums;
    const matchedAlbum = storeAlbums.find((a) => a.id === release.id);

    if (matchedAlbum || release.type === "album") {
      useAlbumStore.getState().setActiveAlbumId(release.id);
      onNavigate?.("Albums");
    }
  };

  if (releases.length === 0 && filter === "all") {
    return null;
  }

  return (
    <section
      aria-label="Artist discography"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--t)",
            letterSpacing: "-0.01em",
          }}
        >
          Discography
        </h2>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Discography category filters"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {filters.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setDiscographyFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "16px",
                  border: isActive
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isActive ? "rgba(240, 169, 130, 0.14)" : "rgba(255, 255, 255, 0.04)",
                  color: isActive ? "var(--accent)" : "var(--m)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discography Grid */}
      {releases.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "var(--m)",
            fontSize: "14px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            border: "1px dashed rgba(255, 255, 255, 0.06)",
          }}
        >
          No releases found for this category.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: "18px",
            width: "100%",
          }}
        >
          {releases.map((release) => (
            <DiscographyCard
              key={release.id}
              release={release}
              onClick={() => handleReleaseClick(release)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface DiscographyCardProps {
  release: ArtistRelease;
  onClick: () => void;
}

function DiscographyCard({ release, onClick }: DiscographyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasImage = Boolean(release.coverUrl) && !imageError;

  return (
    <article
      aria-label={`${release.title} (${release.type}, ${release.releaseYear})`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "10px",
        borderRadius: "12px",
        background: isHovered ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
        border: isHovered
          ? "1px solid rgba(240, 169, 130, 0.25)"
          : "1px solid rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#18110f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {hasImage ? (
          <img
            src={release.coverUrl}
            alt={release.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <svg
            className="i"
            width="32"
            height="32"
            aria-hidden="true"
            style={{ color: "var(--m)" }}
          >
            <use href="#disc" />
          </svg>
        )}
      </div>

      {/* Metadata */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={release.title}
        >
          {release.title}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "var(--m)",
          }}
        >
          <span>{release.releaseYear}</span>
          <span>•</span>
          <span style={{ textTransform: "capitalize" }}>{release.type}</span>
        </div>
      </div>
    </article>
  );
}
