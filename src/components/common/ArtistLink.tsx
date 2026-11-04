import { type CSSProperties, type KeyboardEvent, type MouseEvent, useMemo } from "react";
import { useArtistStore } from "../../store/useArtistStore";
import { useEntityNavigation } from "../../hooks/useEntityNavigation";

export interface ArtistLinkProps {
  name: string;
  artistId?: string | null;
  className?: string;
  style?: CSSProperties;
}

const PLACEHOLDER_REGEX = /^(unknown artist|unknown album|unknown|various artists|-|n\/a)$/i;
const DELIMITER_REGEX = /(\s*(?:feat\.|ft\.|featuring|vs\.|&|,)\s*)/i;

/**
 * Universal interactive link for artist names.
 * Supports exact band name matching (e.g. Earth, Wind & Fire) to avoid accidental splitting,
 * collaboration delimiter splitting, keyboard navigation, and event bubbling isolation.
 */
export function ArtistLink({ name, artistId, className, style }: ArtistLinkProps) {
  const { navigateToArtist } = useEntityNavigation();
  const trimmed = (name || "").trim();

  // AC-8: Check if full string matches an existing artist in memory to preserve compound band names
  const storeArtists = useArtistStore((state) => state.artists);
  const exactBandMatch = useMemo(() => {
    return storeArtists.find(
      (a) => a.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }, [storeArtists, trimmed]);

  // AC-9: Generic placeholder tokens render as inert non-clickable text
  if (!trimmed || PLACEHOLDER_REGEX.test(trimmed)) {
    return (
      <span className={className} style={style}>
        {name || ""}
      </span>
    );
  }

  const handleLinkClick = (e: MouseEvent, targetName: string, targetId?: string | null) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    navigateToArtist(targetName, targetId);
  };

  const handleDoubleClick = (e: MouseEvent) => {
    // AC-6: Prevent row double click playback
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const handleKeyDown = (e: KeyboardEvent, targetName: string, targetId?: string | null) => {
    if (e.key === "Enter" || e.key === " ") {
      // AC-10: Keyboard activation
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      navigateToArtist(targetName, targetId);
    }
  };

  // If exact band name matches, render as a single link without splitting
  if (exactBandMatch) {
    return (
      <span
        role="link"
        tabIndex={0}
        aria-label={`View artist ${trimmed}`}
        onClick={(e) => handleLinkClick(e, trimmed, artistId || exactBandMatch.id)}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => handleKeyDown(e, trimmed, artistId || exactBandMatch.id)}
        className={`inline text-inherit cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${className || ""}`}
        style={{ cursor: "pointer", ...style }}
      >
        {name}
      </span>
    );
  }

  // Parse multi-artist collaboration tokens
  const tokens = name.split(DELIMITER_REGEX);

  // If no delimiter was found, render as a single link
  if (tokens.length <= 1) {
    return (
      <span
        role="link"
        tabIndex={0}
        aria-label={`View artist ${trimmed}`}
        onClick={(e) => handleLinkClick(e, trimmed, artistId)}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => handleKeyDown(e, trimmed, artistId)}
        className={`inline text-inherit cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${className || ""}`}
        style={{ cursor: "pointer", ...style }}
      >
        {name}
      </span>
    );
  }

  // Render split collaboration links preserving delimiter typography
  const primaryArtistIndex = tokens.findIndex((token) => {
    if (!token || DELIMITER_REGEX.test(token)) return false;
    const tokenTrimmed = token.trim();
    return Boolean(tokenTrimmed && !PLACEHOLDER_REGEX.test(tokenTrimmed));
  });

  return (
    <span className={className} style={style}>
      <span className="sr-only">{name}</span>
      {tokens.map((token, idx) => {
        if (!token) return null;

        // Delimiter separator
        if (DELIMITER_REGEX.test(token)) {
          return (
            <span key={idx} className="opacity-80">
              {token}
            </span>
          );
        }

        const tokenTrimmed = token.trim();
        if (!tokenTrimmed) {
          return <span key={idx}>{token}</span>;
        }

        if (PLACEHOLDER_REGEX.test(tokenTrimmed)) {
          return <span key={idx}>{token}</span>;
        }

        // Bind direct artistId to primary (first) artist only
        const targetId = idx === primaryArtistIndex ? artistId : undefined;

        return (
          <span
            key={idx}
            role="link"
            tabIndex={0}
            aria-label={`View artist ${tokenTrimmed}`}
            onClick={(e) => handleLinkClick(e, tokenTrimmed, targetId)}
            onDoubleClick={handleDoubleClick}
            onKeyDown={(e) => handleKeyDown(e, tokenTrimmed, targetId)}
            className="inline text-inherit cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
            style={{ cursor: "pointer" }}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}

