import { useState, useEffect } from "react";
import type {
  HomeRecommendationCollection,
  HomeRecommendationKind,
} from "../../types/discovery";
import {
  useIsRecommendationsLoaded,
  useIsRecommendationsLoading,
  useRecommendations,
  useRecommendationsError,
  useRecommendationsStore,
} from "../../store/useRecommendationsStore";

const KIND_GRADIENTS: Record<HomeRecommendationKind, string> = {
  recently_added: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #1e1b4b 100%)",
  most_played: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #31103f 100%)",
  best_artist: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #450a0a 100%)",
  trending_genre: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #042f2e 100%)",
};

export interface RecommendationsGridProps {
  onNavigate?: (nav: string) => void;
}

export function RecommendationsGrid({ onNavigate }: RecommendationsGridProps) {
  const recommendations = useRecommendations();
  const isLoading = useIsRecommendationsLoading();
  const isLoaded = useIsRecommendationsLoaded();
  const error = useRecommendationsError();

  const initializeRecommendations = useRecommendationsStore(
    (state) => state.initializeRecommendations
  );
  const refreshRecommendations = useRecommendationsStore(
    (state) => state.refreshRecommendations
  );

  useEffect(() => {
    initializeRecommendations().catch(() => {});
  }, [initializeRecommendations]);

  const collections: HomeRecommendationCollection[] = recommendations
    ? [
        recommendations.recentlyAdded,
        recommendations.mostPlayed,
        recommendations.bestArtist,
        recommendations.trendingGenre,
      ]
    : [];

  const libraryTrackCount = recommendations?.libraryTrackCount ?? 0;

  return (
    <section aria-label="Based on Your Listening">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500, color: "var(--t)" }}>
            Based on Your Listening
          </h2>
          <span style={{ fontSize: "12px", color: "var(--m)" }}>Recommended for you</span>
        </div>
      </div>

      {/* Loading Skeletons State (AC-1) */}
      {isLoading && !isLoaded ? (
        <div
          role="region"
          aria-label="Loading recommendations"
          className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <RecommendationSkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        /* Error Retry State (AC-10) */
        <div
          role="alert"
          aria-label="Failed to load recommendations"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "36px 20px",
            textAlign: "center",
            background: "rgba(239, 68, 68, 0.04)",
            borderRadius: "14px",
            border: "1px dashed rgba(239, 68, 68, 0.25)",
          }}
        >
          <div style={{ color: "var(--t)", fontSize: "15px", fontWeight: 600 }}>
            Failed to load recommendations
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", maxWidth: "380px" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => refreshRecommendations()}
            aria-label="Retry loading recommendations"
            style={{
              padding: "7px 18px",
              borderRadius: "20px",
              background: "var(--accent)",
              color: "#18110f",
              border: 0,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        /* Four Recommendation Cards (AC-1, AC-6, AC-7) */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3">
          {collections.map((collection) => (
            <RecommendationCardItem
              key={collection.kind}
              collection={collection}
              libraryTrackCount={libraryTrackCount}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendationSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse"
      style={{
        height: "150px",
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    />
  );
}

interface RecommendationCardItemProps {
  collection: HomeRecommendationCollection;
  libraryTrackCount: number;
  onNavigate?: (nav: string) => void;
}

function RecommendationCardItem({
  collection,
  libraryTrackCount,
  onNavigate,
}: RecommendationCardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const playRecommendationCollection = useRecommendationsStore(
    (state) => state.playRecommendationCollection
  );

  const firstTrack = collection.tracks[0];
  const coverUrl = firstTrack?.artworkUrl;
  const hasCover = Boolean(coverUrl && !imageError);
  const defaultGradient = KIND_GRADIENTS[collection.kind];

  const hasTracks = collection.tracks.length > 0;
  const isLibraryFallback = collection.source === "library";

  // Handle card body click (AC-7)
  const handleCardClick = () => {
    if (hasTracks) {
      playRecommendationCollection(collection);
    } else if (libraryTrackCount === 0) {
      onNavigate?.("Your Library");
    }
  };

  // Handle play button click (AC-7)
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasTracks) {
      playRecommendationCollection(collection);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${collection.title}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        height: "150px",
        borderRadius: "14px",
        overflow: "hidden",
        background: defaultGradient,
        display: "block",
        cursor: hasTracks ? "pointer" : "default",
        outline: "none",
        transform: isHovered && hasTracks ? "translateY(-3px)" : "none",
        boxShadow:
          isHovered && hasTracks
            ? "0 12px 30px rgba(0,0,0,0.5)"
            : "0 4px 14px rgba(0,0,0,0.25)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Track Artwork with Fallback Gradient (AC-1) */}
      {hasCover && (
        <img
          src={coverUrl}
          alt=""
          aria-hidden="true"
          onError={() => setImageError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.55,
            transition: "opacity 0.2s ease",
          }}
        />
      )}

      {/* Dark overlay for contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(8, 5, 4, 0.2) 0%, rgba(8, 5, 4, 0.85) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        {/* Source label badge (AC-1, AC-6) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {isLibraryFallback ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#18110f",
                background: "var(--accent, #f97316)",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              From your library
            </span>
          ) : (
            <span />
          )}

          {/* Quick Play Button (AC-7) */}
          {hasTracks && (
            <button
              type="button"
              aria-label={`Play collection ${collection.title}`}
              onClick={handlePlayClick}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--accent, #f97316)",
                color: "#18110f",
                border: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: isHovered ? 1 : 0.85,
                transform: isHovered ? "scale(1.08)" : "scale(1)",
                transition: "opacity 0.15s ease, transform 0.15s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </div>

        {/* Title and Track count / Guidance */}
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#ffffff",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {collection.title}
          </h3>
          <p
            style={{
              margin: "3px 0 0 0",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.75)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hasTracks
              ? `${collection.tracks.length} ${collection.tracks.length === 1 ? "song" : "songs"}`
              : libraryTrackCount === 0
                ? "Add music to your library"
                : "No matching music yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
