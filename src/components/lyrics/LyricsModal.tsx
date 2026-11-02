import { useState, useRef, useEffect, useCallback } from "react";
import { useCurrentTime, useCurrentTrack, usePlayerStore } from "../../store/usePlayerStore";
import { useOverlayStore } from "../../store/useOverlayStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useLyricsStore } from "../../store/useLyricsStore";
import { getLyricsForTrack } from "../../data/mockLyrics";
import { LyricsLineRow } from "./LyricsLineRow";
import { EmptyLyricsState } from "./EmptyLyricsState";

export function LyricsModal() {
  const currentTrack = useCurrentTrack();
  const currentTime = useCurrentTime();
  const seekToLyricLine = usePlayerStore((state) => state.seekToLyricLine);
  const closeOverlay = useOverlayStore((state) => state.closeOverlay);
  const lyricsFontSize = useSettingsStore((state) => state.settings.lyricsFontSize);
  const setLyricsFontSize = useSettingsStore((state) => state.setLyricsFontSize);

  const {
    currentLyrics,
    fetchLyrics,
    nudgeUserOffset,
    resetUserOffset,
  } = useLyricsStore();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeElement, setActiveElement] = useState<HTMLButtonElement | null>(null);

  // Trigger reactive fetch on track switch
  useEffect(() => {
    if (currentTrack?.id) {
      fetchLyrics(currentTrack.id, currentTrack.title, currentTrack.artist);
    }
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, fetchLyrics]);

  // Resolve lyrics from store or synchronous fallback for zero flash rendering
  const lyrics =
    currentLyrics && currentTrack && currentLyrics.trackId === currentTrack.id
      ? currentLyrics
      : currentTrack
        ? (() => {
            const mock = getLyricsForTrack(currentTrack.id, currentTrack.title, currentTrack.artist);
            return {
              trackId: mock.trackId,
              hasLyrics: (mock.lines && mock.lines.length > 0) || Boolean(mock.plainText),
              isSynced: mock.isSynced,
              lines: mock.lines,
              plainText: mock.plainText ?? null,
              sourceType: mock.source ?? "mock",
              userOffsetMs: 0,
            };
          })()
        : {
            trackId: "",
            hasLyrics: false,
            isSynced: false,
            lines: [],
            plainText: null,
            sourceType: "none",
            userOffsetMs: 0,
          };

  const userOffsetMs = lyrics.userOffsetMs || 0;
  const userOffsetSeconds = userOffsetMs / 1000.0;
  const effectiveTime = currentTime + userOffsetSeconds;

  // Determine active lyric index with offset calculation (AC-7, AC-8, AC-9)
  let activeIndex = -1;
  if (lyrics.isSynced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (effectiveTime >= lyrics.lines[i].timeSeconds) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Handle manual scroll pause (3 second inactivity timer)
  const handleUserScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      // Re-center active element once timer expires
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

  // Smooth auto-scroll to active element
  useEffect(() => {
    if (activeElement && !isUserScrollingRef.current) {
      activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeElement, activeIndex]);

  // Click line to seek with offset arithmetic (AC-8)
  const handleLineClick = (timeSeconds: number) => {
    isUserScrollingRef.current = false;
    const seekTarget = Math.max(0, timeSeconds - userOffsetSeconds);
    seekToLyricLine(seekTarget);
  };

  const cycleFontSize = () => {
    const sequence: Record<"small" | "medium" | "large", "small" | "medium" | "large"> = {
      small: "medium",
      medium: "large",
      large: "small",
    };
    setLyricsFontSize(sequence[lyricsFontSize]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lyrics overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(11, 7, 6, 0.94)",
        backdropFilter: "blur(40px)",
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.25s ease",
      }}
    >
      {/* Ambient gradient glow in background */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "20%",
          width: "60vw",
          height: "60vh",
          background: "radial-gradient(circle, rgba(240, 169, 130, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2c1a16, #160d0a)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {currentTrack?.artworkUrl && (
              <img
                src={currentTrack.artworkUrl}
                alt=""
                aria-hidden="true"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--t)" }}>
              {currentTrack?.title ?? "No Track"}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--m)", marginTop: "2px" }}>
              {currentTrack?.artist ?? "Mutinhimira"}
            </div>
          </div>

          {lyrics.isSynced && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(240, 169, 130, 0.15)",
                color: "var(--accent)",
                fontWeight: 600,
                letterSpacing: ".06em",
                marginLeft: "8px",
              }}
            >
              SYNCED
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Timing offset adjustment controls (AC-8, AC-9) */}
          {lyrics.isSynced && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--l)",
                borderRadius: "8px",
                padding: "3px 8px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--m)" }}>Offset</span>
              <button
                aria-label="Delay lyrics timing by 0.1 seconds"
                onClick={() => nudgeUserOffset(-100)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "3px 7px",
                  color: "var(--t)",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                -0.1s
              </button>
              <span
                data-testid="lyrics-offset-value"
                style={{
                  fontSize: "11px",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: "38px",
                  textAlign: "center",
                  color: userOffsetMs !== 0 ? "var(--accent)" : "var(--m)",
                  fontWeight: 600,
                }}
              >
                {userOffsetMs > 0
                  ? `+${(userOffsetMs / 1000).toFixed(1)}s`
                  : `${(userOffsetMs / 1000).toFixed(1)}s`}
              </span>
              <button
                aria-label="Advance lyrics timing by 0.1 seconds"
                onClick={() => nudgeUserOffset(100)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "3px 7px",
                  color: "var(--t)",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                +0.1s
              </button>
              {userOffsetMs !== 0 && (
                <button
                  aria-label="Reset lyrics timing offset"
                  onClick={() => resetUserOffset()}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--m)",
                    fontSize: "11px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "0 2px",
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Font size toggle */}
          <button
            aria-label={`Current font size ${lyricsFontSize}. Click to change.`}
            onClick={cycleFontSize}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--l)",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "var(--t)",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Text: {lyricsFontSize.toUpperCase()}
          </button>

          {/* Close button */}
          <button
            aria-label="Close lyrics overlay"
            onClick={closeOverlay}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.06)",
              border: 0,
              color: "var(--t)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
          >
            <svg className="i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Lyrics Scrollable Area */}
      <div
        ref={scrollContainerRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "80px 24px 160px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          scrollBehavior: "smooth",
          zIndex: 5,
        }}
      >
        {lyrics.isSynced && lyrics.lines.length > 0 ? (
          lyrics.lines.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            return (
              <LyricsLineRow
                key={line.id}
                line={line}
                isActive={isActive}
                isPast={isPast}
                fontSize={lyricsFontSize}
                onClick={() => handleLineClick(line.timeSeconds)}
                onActiveMount={setActiveElement}
              />
            );
          })
        ) : (
          <EmptyLyricsState plainText={lyrics.plainText ?? undefined} songTitle={currentTrack?.title} />
        )}
      </div>
    </div>
  );
}
