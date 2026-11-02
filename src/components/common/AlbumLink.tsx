import { type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { useEntityNavigation } from "../../hooks/useEntityNavigation";

export interface AlbumLinkProps {
  title: string;
  albumId?: string | null;
  artistName?: string | null;
  className?: string;
  style?: CSSProperties;
}

const PLACEHOLDER_REGEX = /^(unknown artist|unknown album|unknown|various artists|-|n\/a)$/i;

/**
 * Universal interactive link for album titles.
 * Disambiguates common titles by artist name, stops row selection bubbling,
 * and conforms to Midnight tokens and keyboard accessibility standards.
 */
export function AlbumLink({
  title,
  albumId,
  artistName,
  className,
  style,
}: AlbumLinkProps) {
  const { navigateToAlbum } = useEntityNavigation();
  const trimmed = (title || "").trim();

  // AC-9: Generic placeholder tokens render as inert non-clickable text
  if (!trimmed || PLACEHOLDER_REGEX.test(trimmed)) {
    return (
      <span className={className} style={style}>
        {title || ""}
      </span>
    );
  }

  const handleLinkClick = (e: MouseEvent) => {
    // AC-6: Stop propagation to prevent row selection
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    navigateToAlbum(trimmed, albumId, artistName);
  };

  const handleDoubleClick = (e: MouseEvent) => {
    // AC-6: Stop propagation to prevent track playback on double click
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      // AC-10: Keyboard activation
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      navigateToAlbum(trimmed, albumId, artistName);
    }
  };

  return (
    <span
      role="link"
      tabIndex={0}
      aria-label={`View album ${trimmed}`}
      onClick={handleLinkClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={`inline text-inherit cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${className || ""}`}
      style={{ cursor: "pointer", ...style }}
    >
      {title}
    </span>
  );
}

