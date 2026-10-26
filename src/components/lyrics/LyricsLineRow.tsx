import { useRef, useEffect } from "react";
import type { LyricLine } from "../../types/overlays";

interface LyricsLineRowProps {
  line: LyricLine;
  isActive: boolean;
  isPast: boolean;
  fontSize: "small" | "medium" | "large";
  onClick: () => void;
  onActiveMount?: (el: HTMLButtonElement) => void;
}

export function LyricsLineRow({
  line,
  isActive,
  isPast,
  fontSize,
  onClick,
  onActiveMount,
}: LyricsLineRowProps) {
  const lineRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isActive && lineRef.current && onActiveMount) {
      onActiveMount(lineRef.current);
    }
  }, [isActive, onActiveMount]);

  const fontSizes = {
    small: "18px",
    medium: "24px",
    large: "32px",
  };

  const lineHeights = {
    small: "1.6",
    medium: "1.7",
    large: "1.8",
  };

  return (
    <button
      ref={lineRef}
      role="button"
      data-testid={`lyric-line-${line.id}`}
      data-active={isActive ? "true" : "false"}
      aria-current={isActive ? "time" : undefined}
      onClick={onClick}
      style={{
        background: "none",
        border: 0,
        padding: "10px 16px",
        margin: "0 auto",
        width: "100%",
        maxWidth: "800px",
        textAlign: "center",
        cursor: "pointer",
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: fontSizes[fontSize],
        lineHeight: lineHeights[fontSize],
        fontWeight: isActive ? 700 : 500,
        color: isActive ? "var(--accent)" : isPast ? "var(--t)" : "var(--m)",
        opacity: isActive ? 1 : isPast ? 0.75 : 0.35,
        transform: isActive ? "scale(1.05)" : "scale(1)",
        textShadow: isActive ? "0 0 24px rgba(240, 169, 130, 0.45)" : "none",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        borderRadius: "12px",
        outline: "none",
        display: "block",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.opacity = "0.9";
          e.currentTarget.style.color = "var(--t)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.opacity = isPast ? "0.75" : "0.35";
          e.currentTarget.style.color = isPast ? "var(--t)" : "var(--m)";
        }
      }}
    >
      {line.text}
    </button>
  );
}
