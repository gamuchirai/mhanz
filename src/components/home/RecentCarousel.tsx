import { useState } from "react";
import { PlayHistoryItem } from "../../types/discovery";
import { usePlayerStore } from "../../store/usePlayerStore";
import { MarqueeText } from "./MarqueeText";

interface RecentCarouselProps {
  items: PlayHistoryItem[];
}

export function RecentCarousel({ items }: RecentCarouselProps) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const loadSampleHistory = usePlayerStore((state) => state.loadSampleHistory);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  if (items.length === 0) {
    return (
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 500, color: "var(--t)" }}>
          Recently played
        </h2>
        <div
          role="region"
          aria-label="Empty recently played section"
          style={{
            padding: "32px 24px",
            borderRadius: "14px",
            background: "rgba(24,17,15,0.7)",
            border: "1px dashed var(--l)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(240,169,130,0.1)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg className="i" width="22" height="22" aria-hidden="true">
              <use href="#lib" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: "15px", color: "var(--t)" }}>
              No recent listening history yet
            </div>
            <div
              style={{ fontSize: "13px", color: "var(--m)", marginTop: "4px", maxWidth: "340px" }}
            >
              Listen to songs from your library or explore curated tracks to build your listening
              history.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={loadSampleHistory}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: "var(--accent)",
                color: "#1c0f09",
                border: 0,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
            >
              Load sample tracks
            </button>
            <button
              onClick={() => {
                // Future Tauri folder scanner trigger
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: "transparent",
                color: "var(--t)",
                border: "1px solid var(--l)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Scan music folder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500, color: "var(--t)" }}>
          Recently played
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
        {items.slice(0, 5).map((history) => {
          const isCurrent = currentTrack?.id === history.track.id;
          return (
            <RecentItemCard
              key={history.id}
              item={history}
              isActive={isCurrent}
              isPlaying={isCurrent && isPlaying}
              onPlay={() => playTrack(history.track)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RecentItemCardProps {
  item: PlayHistoryItem;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

function RecentItemCard({ item, isActive, isPlaying, onPlay }: RecentItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const fallbackGradients = [
    "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)",
    "linear-gradient(180deg,#4a3350,#c4655a 58%,#1b100d 59%)",
    "linear-gradient(180deg,#2a2a30,#121216)",
    "linear-gradient(180deg,#25201f,#0f0c0c)",
    "linear-gradient(180deg,#3a2c2c,#171010)",
  ];
  const charCode = item.track.title.charCodeAt(0) || 0;
  const gradient = fallbackGradients[charCode % fallbackGradients.length];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${item.track.title} by ${item.track.artist}`}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "block",
        minWidth: 0,
        cursor: "pointer",
        outline: "none",
        transition: "transform 0.15s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          borderRadius: "10px",
          overflow: "hidden",
          background: gradient,
          boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {!imageError && item.track.artworkUrl ? (
          <img
            src={item.track.artworkUrl}
            alt={item.track.title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
          />
        ) : null}

        {/* Play indicator overlay on hover or active */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.38)",
            display: "grid",
            placeItems: "center",
            opacity: isHovered || isPlaying ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#1c0f09",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg className="i" width="14" height="14" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        <MarqueeText
          text={item.track.title}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: isActive ? "var(--accent)" : "var(--t)",
          }}
        />
        <div
          style={{
            fontSize: "12px",
            color: "var(--m)",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.track.artist}
        </div>
      </div>
    </div>
  );
}
