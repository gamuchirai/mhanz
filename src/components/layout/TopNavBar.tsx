import { useCallback, useEffect } from "react";
import type { NavHistoryEntry } from "../../types/navigation";
import { useAlbumStore } from "../../store/useAlbumStore";
import { useArtistStore } from "../../store/useArtistStore";
import { usePlaylistStore } from "../../store/usePlaylistStore";
import {
  useCanGoBack,
  useCanGoForward,
  useNavigationStore,
} from "../../store/useNavigationStore";
import { IconButton } from "../ui/IconButton";

export interface TopNavBarProps {
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  title?: string;
  className?: string;
}

/**
 * Resolves the display title or breadcrumb for a given navigation entry.
 */
export function getNavTitle(entry: NavHistoryEntry): string {
  if (entry.params?.albumId) {
    const album = useAlbumStore
      .getState()
      .albums.find((a) => a.id === entry.params?.albumId);
    return album?.title ?? "Album";
  }
  if (entry.params?.playlistId) {
    const playlist = usePlaylistStore
      .getState()
      .playlists.find((p) => p.id === entry.params?.playlistId);
    return (
      playlist?.title ??
      (playlist as unknown as { name?: string })?.name ??
      "Playlist"
    );
  }
  if (entry.params?.artistId) {
    const artist = useArtistStore
      .getState()
      .artists.find((a) => a.id === entry.params?.artistId);
    return artist?.name ?? "Artist";
  }
  return entry.view;
}

/**
 * Top desktop navigation bar providing back and forward controls,
 * active view title breadcrumb, and desktop shortcut listeners.
 */
export function TopNavBar({
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  title,
  className = "",
}: TopNavBarProps) {
  const storeCanGoBack = useCanGoBack();
  const storeCanGoForward = useCanGoForward();
  const currentEntry = useNavigationStore((s) => s.current);
  const goBack = useNavigationStore((s) => s.goBack);
  const goForward = useNavigationStore((s) => s.goForward);

  const effectiveCanGoBack = canGoBack ?? storeCanGoBack;
  const effectiveCanGoForward = canGoForward ?? storeCanGoForward;

  const handleBack = useCallback(() => {
    if (!effectiveCanGoBack) return;
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  }, [effectiveCanGoBack, onBack, goBack]);

  const handleForward = useCallback(() => {
    if (!effectiveCanGoForward) return;
    if (onForward) {
      onForward();
    } else {
      goForward();
    }
  }, [effectiveCanGoForward, onForward, goForward]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleForward();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Mouse button 3 is back (4th physical button)
      // Mouse button 4 is forward (5th physical button)
      if (e.button === 3) {
        e.preventDefault();
        handleBack();
      } else if (e.button === 4) {
        e.preventDefault();
        handleForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleBack, handleForward]);

  const displayTitle = title ?? getNavTitle(currentEntry);

  return (
    <header
      role="banner"
      aria-label="Top navigation"
      className={`h-14 px-6 py-2.5 flex items-center justify-between gap-4 border-b border-white/5 bg-midnight-bg/85 backdrop-blur-md select-none shrink-0 ${className}`}
      data-tauri-drag-region
    >
      {/* Left controls: back, forward, and title */}
      <div className="flex items-center gap-3 min-w-0" data-tauri-drag-region>
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton
            icon="#cl"
            label="Go back (Alt+Left)"
            size="sm"
            variant="panel"
            disabled={!effectiveCanGoBack}
            onClick={handleBack}
            data-testid="nav-back-button"
          />
          <IconButton
            icon="#cr"
            label="Go forward (Alt+Right)"
            size="sm"
            variant="panel"
            disabled={!effectiveCanGoForward}
            onClick={handleForward}
            data-testid="nav-forward-button"
          />
        </div>

        <div className="h-4 w-px bg-white/10 mx-1 shrink-0" aria-hidden="true" />

        <span
          data-testid="nav-current-title"
          className="text-sm font-medium text-midnight-text truncate tracking-tight select-none"
        >
          {displayTitle}
        </span>
      </div>

      {/* Center and right desktop drag zone */}
      <div
        className="flex-1 h-full min-w-4"
        data-tauri-drag-region
        aria-hidden="true"
      />
    </header>
  );
}
