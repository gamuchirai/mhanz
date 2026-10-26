import { useState, type MouseEvent } from "react";
import { ShowcaseItem } from "../../types/discovery";
import { usePlayerStore } from "../../store/usePlayerStore";

interface HeroBannerProps {
  item: ShowcaseItem;
}

export function HeroBanner({ item }: HeroBannerProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const toggleLike = usePlayerStore((state) => state.toggleLike);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const [imageError, setImageError] = useState(false);

  const track = item.track;
  const trackId = track?.id ?? item.targetId;
  const isCurrentHeroTrack = currentTrack?.id === trackId;
  const isCurrentlyPlaying = isCurrentHeroTrack && isPlaying;
  const isLiked = Boolean(likedTrackIds[trackId]);

  const handlePlayClick = () => {
    if (isCurrentHeroTrack) {
      togglePlayPause();
    } else if (track) {
      playTrack(track);
    }
  };

  const handleLikeClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleLike(trackId);
  };

  return (
    <section
      aria-label="Hero featured track"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "276px 1fr",
        gap: "40px",
        alignItems: "center",
      }}
    >
      {/* Vinyl Disc Background Effect */}
      <div
        style={{
          position: "absolute",
          right: "-150px",
          top: "-30px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "conic-gradient(from 210deg,rgba(255,255,255,.1),transparent 22%,rgba(255,255,255,.06) 50%,transparent 74%,rgba(255,255,255,.1)),repeating-radial-gradient(circle,#0a0706 0 3px,#1b1512 4px 5px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,.04)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Album Artwork with Silhouette SVG and Fallback */}
      <div
        style={{
          position: "relative",
          width: "276px",
          height: "276px",
          borderRadius: "14px",
          overflow: "hidden",
          background:
            "linear-gradient(180deg,#2f2742 0%,#8a4560 36%,#e0714f 62%,#f4a86a 70%,#150c0a 71%)",
          boxShadow: "0 24px 60px rgba(0,0,0,.55)",
        }}
      >
        {!imageError && item.bannerImageUrl ? (
          <img
            src={item.bannerImageUrl}
            alt={item.headline}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
              opacity: 0.35,
              mixBlendMode: "overlay",
            }}
          />
        ) : null}

        <svg
          viewBox="0 0 276 276"
          width="276"
          height="276"
          role="img"
          aria-label="Couple silhouetted on a hill at sunset under a crescent moon"
        >
          <circle cx="205" cy="52" r="11" fill="#f6e3cf" />
          <circle cx="210" cy="48" r="10" fill="#47304f" />
          <path d="M0 205C60 188 120 182 276 202V276H0z" fill="#0f0807" />
          <g fill="#0b0605">
            <path d="M118 196c0-14 6-24 14-24s14 10 14 24z" />
            <circle cx="132" cy="162" r="8" />
            <path d="M150 198c0-12 5-20 12-20s12 8 12 20z" />
            <circle cx="162" cy="170" r="7" />
          </g>
          <g fill="#f2b36b" opacity=".85">
            <circle cx="24" cy="238" r="1.5" />
            <circle cx="48" cy="230" r="1.5" />
            <circle cx="74" cy="242" r="1.5" />
            <circle cx="212" cy="236" r="1.5" />
            <circle cx="238" cy="228" r="1.5" />
            <circle cx="256" cy="244" r="1.5" />
          </g>
        </svg>
      </div>

      {/* Details */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          minWidth: 0,
        }}
      >
        <div
          style={{ fontSize: "11px", letterSpacing: ".26em", color: "#e0916c", fontWeight: 600 }}
        >
          {item.badge}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 500,
            fontSize: "104px",
            lineHeight: 1,
            letterSpacing: "-.01em",
          }}
        >
          {item.headline}
        </h1>
        <div
          style={{
            fontFamily: "'Pinyon Script', cursive",
            fontSize: "46px",
            lineHeight: 1.1,
            color: "#e8d7ca",
          }}
        >
          {item.subtitle}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--m)",
            fontSize: "13px",
            marginTop: "8px",
          }}
        >
          <svg
            className="i"
            width="14"
            height="14"
            aria-hidden="true"
            style={{
              color: isLiked ? "var(--accent)" : "currentColor",
              fill: isLiked ? "var(--accent)" : "none",
            }}
          >
            <use href="#heart" />
          </svg>
          4.8M<span aria-hidden="true">•</span>Indie Pop
        </div>
        <p style={{ margin: "4px 0 16px", color: "#c9bbb0", fontSize: "14px" }}>
          Every moment with you feels like the perfect song.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={handlePlayClick}
            aria-label={isCurrentlyPlaying ? "Pause Perfect" : "Play Perfect"}
            style={{
              height: "46px",
              padding: "0 32px",
              borderRadius: "23px",
              border: 0,
              background: "var(--accent)",
              color: "#1c0f09",
              font: "600 15px 'Outfit', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "transform 0.15s ease, background-color 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg className="i" width="14" height="14" aria-hidden="true">
              <use href={isCurrentlyPlaying ? "#pause" : "#play"} />
            </svg>
            {isCurrentlyPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleLikeClick}
            aria-label={isLiked ? "Unlike Perfect" : "Like Perfect"}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.18)",
              background: isLiked ? "rgba(240,169,130,.1)" : "none",
              color: isLiked ? "var(--accent)" : "var(--t)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg
              className="i"
              width="18"
              height="18"
              aria-hidden="true"
              style={{ fill: isLiked ? "var(--accent)" : "none" }}
            >
              <use href="#heart" />
            </svg>
          </button>
          <button
            aria-label="More options"
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.18)",
              background: "none",
              color: "var(--t)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#dots" />
            </svg>
          </button>
        </div>
      </div>

      {/* Waveform graphic */}
      <svg
        viewBox="0 0 180 28"
        width="180"
        height="28"
        style={{
          position: "absolute",
          right: 0,
          bottom: "6px",
          stroke: "var(--accent)",
          strokeWidth: 2,
          strokeLinecap: "round",
          opacity: 0.85,
        }}
        aria-hidden="true"
      >
        <path d="M3 28V14M9 28V10M15 28V18M21 28V6M27 28V12M33 28V16M39 28V8M45 28V20M51 28V11M57 28V5M63 28V15M69 28V9M75 28V19M81 28V7M87 28V13M93 28V17M99 28V4M105 28V12M111 28V18M117 28V8M123 28V14M129 28V10M135 28V6M141 28V16M147 28V11M153 28V19M159 28V7M165 28V13M171 28V9M177 28V15" />
      </svg>
    </section>
  );
}
