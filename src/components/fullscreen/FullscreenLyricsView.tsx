import { useEffect, useRef, useCallback, useState } from "react";
import type { Track } from "../../types/discovery";
import { getLyricsForTrack } from "../../data/mockLyrics";

interface FullscreenLyricsViewProps {
  track: Track;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export function FullscreenLyricsView({
  track,
  currentTime,
  onSeek,
}: FullscreenLyricsViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeElement, setActiveElement] = useState<HTMLButtonElement | null>(null);

  const lyrics = getLyricsForTrack(track.id, track.title, track.artist);

  // Compute active lyric line index
  let activeIndex = -1;
  if (lyrics.isSynced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (currentTime >= lyrics.lines[i].timeSeconds) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Handle manual scroll pause
  const handleUserScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 3000);
  }, [activeElement]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Smooth auto-scroll to active element when playback advances
  useEffect(() => {
    if (activeElement && !isUserScrollingRef.current) {
      activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeElement, activeIndex]);

  const handleLineClick = (timeSeconds: number) => {
    isUserScrollingRef.current = false;
    onSeek(timeSeconds);
  };

  if (!lyrics.lines || lyrics.lines.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          color: "var(--m)",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          animation: "fadeIn 0.3s ease",
        }}
      >
        <svg className="i" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h14" />
        </svg>
        <p style={{ fontSize: "18px", color: "var(--t)", margin: 0, fontWeight: 500 }}>
          No lyrics available for this song
        </p>
        <p style={{ fontSize: "14px", margin: 0, maxWidth: "340px" }}>
          We could not find synchronized lyrics for {track.title}. Enjoy the immersion!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onWheel={handleUserScroll}
      onTouchMove={handleUserScroll}
      role="region"
      aria-label="Synchronized lyrics stream"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "60px 24px",
        scrollBehavior: "smooth",
        zIndex: 10,
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          maxWidth: "800px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {lyrics.lines.map((line, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={line.id}
              ref={isActive ? setActiveElement : null}
              onClick={() => handleLineClick(line.timeSeconds)}
              aria-label={`Jump to ${line.text}`}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "12px",
                textAlign: "center",
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontSize: isActive ? "clamp(24px, 3.8vw, 36px)" : "clamp(18px, 2.6vw, 24px)",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--accent)" : "rgba(244, 235, 228, 0.4)",
                textShadow: isActive ? "0 0 24px rgba(240, 169, 130, 0.45)" : "none",
                transform: isActive ? "scale(1.04)" : "scale(1)",
                transition: "all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
                lineHeight: 1.35,
              }}
            >
              {line.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
