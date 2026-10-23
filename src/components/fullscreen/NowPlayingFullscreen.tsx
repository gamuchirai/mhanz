import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useCurrentTime, useCurrentTrack, usePlayerStore } from "../../store/usePlayerStore";
import { useFullscreenViewMode, useOverlayStore } from "../../store/useOverlayStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { FullscreenViewMode } from "../../types/overlays";
import { FullscreenHeader } from "./FullscreenHeader";
import { FullscreenArtwork } from "./FullscreenArtwork";
import { FullscreenLyricsView } from "./FullscreenLyricsView";
import { FullscreenVisualizer } from "./FullscreenVisualizer";
import { FullscreenDeck } from "./FullscreenDeck";

export function NowPlayingFullscreen() {
  const currentTrack = useCurrentTrack();
  const currentTime = useCurrentTime();
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const viewMode = useFullscreenViewMode();
  const setFullscreenViewMode = useOverlayStore((state) => state.setFullscreenViewMode);
  const closeOverlay = useOverlayStore((state) => state.closeOverlay);

  const visualizerStyle = useSettingsStore((state) => state.settings.visualizerStyle);
  const autoHideChrome = useSettingsStore((state) => state.settings.fullscreenAutoHideChrome);
  const setFullscreenDefaultView = useSettingsStore((state) => state.setFullscreenDefaultView);

  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const duration = currentTrack?.durationSeconds ?? 0;
  const isLiked = currentTrack ? Boolean(likedTrackIds[currentTrack.id]) : false;

  // Track originating element for focus restoration (AC-13, AC-15)
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Inactivity auto-hide timer for chrome and cursor (AC-11)
  useEffect(() => {
    if (autoHideChrome) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsInactive(true);
      }, 4000);
    }

    const handleActivity = () => {
      setIsInactive(false);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (autoHideChrome) {
        inactivityTimerRef.current = setTimeout(() => {
          setIsInactive(true);
        }, 4000);
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [autoHideChrome]);

  // Scoped keyboard listener (AC-12, AC-13)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't intercept if an input or range is being typed into directly (unless it's space or arrows in overlay)
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" && (target as HTMLInputElement).type === "text";
      if (isInput) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      } else if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        togglePlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const nextMode = viewMode === "lyrics" ? "artwork" : "lyrics";
        setFullscreenViewMode(nextMode);
        setFullscreenDefaultView(nextMode);
      } else if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const nextMode = viewMode === "visualizer" ? "artwork" : "visualizer";
        setFullscreenViewMode(nextMode);
        setFullscreenDefaultView(nextMode);
      } else if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    currentTime,
    duration,
    viewMode,
    closeOverlay,
    togglePlayPause,
    seekTo,
    setFullscreenViewMode,
    setFullscreenDefaultView,
    toggleMute,
  ]);

  // Accessibility focus trap (AC-15)
  const handleKeyDownTrap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  const handleViewModeChange = (mode: FullscreenViewMode) => {
    setFullscreenViewMode(mode);
    setFullscreenDefaultView(mode);
  };

  // Ambient gradient mesh colors (AC-5)
  const primaryMesh = currentTrack?.ambientColors?.primary ?? "rgba(162, 79, 90, 0.4)";
  const secondaryMesh = currentTrack?.ambientColors?.secondary ?? "rgba(232, 149, 95, 0.3)";
  const accentMesh = currentTrack?.ambientColors?.accent ?? "#f0a982";

  // Graceful empty state when track is null (AC-3)
  if (!currentTrack) {
    return (
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Now playing fullscreen view"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "#0b0706",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--m)",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(240, 169, 130, 0.1)",
            color: "var(--accent)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg className="i" width="36" height="36" aria-hidden="true">
            <use href="#disc" />
          </svg>
        </div>
        <h2 style={{ fontSize: "22px", color: "var(--t)", margin: 0, fontWeight: 600 }}>
          No track playing
        </h2>
        <p style={{ margin: 0, fontSize: "14px", maxWidth: "340px", textAlign: "center" }}>
          Playback has finished. Select a song from your library or playlist to immerse yourself.
        </p>
        <button
          onClick={closeOverlay}
          style={{
            marginTop: "8px",
            padding: "10px 24px",
            borderRadius: "24px",
            background: "var(--accent)",
            color: "#1c0f09",
            border: 0,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Return to app
        </button>
      </div>
    );
  }

  const chromeOpacity = isInactive ? 0 : 1;
  const pointerEvents = isInactive ? "none" : "auto";

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Now playing fullscreen view"
      onKeyDown={handleKeyDownTrap}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "#0b0706",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        cursor: isInactive ? "none" : "default",
        userSelect: "none",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Atmospheric ambient gradient mesh backdrop (AC-5) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 18% 25%, ${primaryMesh} 0%, transparent 55%),
            radial-gradient(circle at 82% 75%, ${secondaryMesh} 0%, transparent 60%),
            radial-gradient(circle at 50% 50%, ${accentMesh}1a 0%, transparent 70%)
          `,
          filter: "blur(60px)",
          opacity: 0.9,
          pointerEvents: "none",
          transform: "scale(1.1)",
          transition: "background 0.8s ease",
        }}
      />

      {/* Top utility bar header (AC-4, AC-11) */}
      <div
        style={{
          opacity: chromeOpacity,
          pointerEvents,
          transition: "opacity 0.35s ease",
        }}
      >
        <FullscreenHeader
          track={currentTrack}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onClose={closeOverlay}
        />
      </div>

      {/* Multi-mode center stage (AC-6, AC-7, AC-8) */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          position: "relative",
          zIndex: 10,
        }}
      >
        {viewMode === "artwork" && (
          <FullscreenArtwork
            track={currentTrack}
            isLiked={isLiked}
            onToggleLike={() => toggleLike(currentTrack.id)}
          />
        )}

        {viewMode === "lyrics" && (
          <FullscreenLyricsView
            track={currentTrack}
            currentTime={currentTime}
            onSeek={seekTo}
          />
        )}

        {viewMode === "visualizer" && (
          <FullscreenVisualizer
            style={visualizerStyle}
            isPlaying={isPlaying}
            ambientColors={currentTrack.ambientColors}
          />
        )}
      </main>

      {/* Bottom playback controls deck (AC-9, AC-10, AC-11) */}
      <div
        style={{
          opacity: chromeOpacity,
          pointerEvents,
          transition: "opacity 0.35s ease",
        }}
      >
        <FullscreenDeck
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          volume={volume}
          isMuted={isMuted}
          onTogglePlayPause={togglePlayPause}
          onNext={nextTrack}
          onPrevious={previousTrack}
          onSeek={seekTo}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSetVolume={setVolume}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  );
}
