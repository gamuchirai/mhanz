import { useState } from "react";
import type { Track } from "../../types/discovery";

interface FullscreenArtworkProps {
  track: Track;
  isLiked: boolean;
  onToggleLike: () => void;
}

export function FullscreenArtwork({
  track,
  isLiked,
  onToggleLike,
}: FullscreenArtworkProps) {
  const [imageError, setImageError] = useState(false);

  const fallbackGradient =
    "linear-gradient(135deg, rgba(47, 39, 66, 0.9), rgba(162, 79, 90, 0.8) 50%, rgba(232, 149, 95, 0.7))";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "16px 24px",
        minHeight: 0,
        zIndex: 10,
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Artwork frame */}
      <div
        style={{
          width: "min(380px, 38vh)",
          height: "min(380px, 38vh)",
          borderRadius: "20px",
          overflow: "hidden",
          position: "relative",
          boxShadow:
            "0 24px 60px rgba(0, 0, 0, 0.65), 0 0 50px rgba(240, 169, 130, 0.18)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: fallbackGradient,
          display: "grid",
          placeItems: "center",
          flex: "none",
        }}
      >
        {!imageError && track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              gap: "8px",
            }}
          >
            <svg className="i" width="64" height="64" aria-hidden="true">
              <use href="#disc" />
            </svg>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>Mumhanzi</span>
          </div>
        )}
      </div>

      {/* Track metadata details */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          marginTop: "28px",
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 3.2vw, 32px)",
              fontWeight: 700,
              color: "var(--t)",
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {track.title}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
              fontSize: "clamp(14px, 2vw, 18px)",
              color: "var(--m)",
            }}
          >
            <span style={{ fontWeight: 500 }}>{track.artist}</span>
            {track.album ? (
              <>
                <span style={{ opacity: 0.5 }}>•</span>
                <span style={{ opacity: 0.85 }}>{track.album}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Favorite like button */}
        <button
          onClick={onToggleLike}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
          style={{
            background: isLiked
              ? "rgba(240, 169, 130, 0.15)"
              : "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            display: "grid",
            placeItems: "center",
            color: isLiked ? "var(--accent)" : "var(--m)",
            cursor: "pointer",
            flex: "none",
            transition: "all 0.2s ease",
          }}
        >
          <svg
            className="i"
            width="20"
            height="20"
            aria-hidden="true"
            style={{ fill: isLiked ? "var(--accent)" : "none" }}
          >
            <use href="#heart" />
          </svg>
        </button>
      </div>
    </div>
  );
}
