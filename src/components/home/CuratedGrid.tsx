import { useState } from "react";
import { CuratedCard } from "../../types/discovery";
import { usePlayerStore } from "../../store/usePlayerStore";

interface CuratedGridProps {
  cards: CuratedCard[];
  title?: string;
}

export function CuratedGrid({ cards, title = "Made for you" }: CuratedGridProps) {
  const playCollection = usePlayerStore((state) => state.playCollection);

  return (
    <section aria-label={title}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500, color: "var(--t)" }}>{title}</h2>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{ color: "var(--m)", fontSize: "13px", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
        >
          See all
        </a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
        {cards.map((card) => (
          <CuratedCardItem key={card.id} card={card} onPlay={() => playCollection(card.tracks, 0)} />
        ))}
      </div>
    </section>
  );
}

interface CuratedCardItemProps {
  card: CuratedCard;
  onPlay: () => void;
}

function CuratedCardItem({ card, onPlay }: CuratedCardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const defaultBg =
    card.accentGradient ??
    "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#12141e,#2b2230 62%,#5a3630)";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play playlist ${card.title}`}
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
        position: "relative",
        height: "150px",
        borderRadius: "14px",
        overflow: "hidden",
        background: defaultBg,
        display: "block",
        cursor: "pointer",
        outline: "none",
        transform: isHovered ? "translateY(-3px)" : "none",
        boxShadow: isHovered ? "0 12px 30px rgba(0,0,0,0.5)" : "0 4px 14px rgba(0,0,0,0.25)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {!imageError && card.coverUrl ? (
        <img
          src={card.coverUrl}
          alt={card.title}
          onError={() => setImageError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.28,
            mixBlendMode: "luminosity",
            transition: "opacity 0.2s ease, transform 0.3s ease",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        />
      ) : null}

      {/* Dark gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 35%, rgba(11,7,6,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "absolute", left: "14px", bottom: "12px", right: "52px", zIndex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: "14px", lineHeight: 1.2, color: "var(--t)" }}>
          {card.title}
        </div>
        <div style={{ fontSize: "11px", color: "#c9bbb0", marginTop: "3px" }}>
          {card.subtitle}
        </div>
      </div>

      <button
        aria-label={`Quick play ${card.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: 0,
          background: isHovered ? "var(--accent)" : "var(--t)",
          color: "#1a110d",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          zIndex: 2,
          transform: isHovered ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.15s ease, background-color 0.15s ease",
        }}
      >
        <svg className="i" width="13" height="13" aria-hidden="true">
          <use href="#play" />
        </svg>
      </button>
    </div>
  );
}
