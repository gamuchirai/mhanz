/**
 * Procedural avatar, gradient, and formatting helpers for Artists & Artist Profile.
 */

export interface AvatarGradient {
  gradient: string;
  glow: string;
  accent: string;
}

const ARTIST_PALETTES: AvatarGradient[] = [
  {
    gradient: "linear-gradient(135deg, #d47a52 0%, #6e361d 50%, #2a1309 100%)",
    glow: "rgba(212, 122, 82, 0.4)",
    accent: "#f0a982",
  },
  {
    gradient: "linear-gradient(135deg, #c2593f 0%, #702619 50%, #2b0b06 100%)",
    glow: "rgba(194, 89, 63, 0.4)",
    accent: "#e0785f",
  },
  {
    gradient: "linear-gradient(135deg, #b08253 0%, #634320 50%, #231609 100%)",
    glow: "rgba(176, 130, 83, 0.4)",
    accent: "#d4a97b",
  },
  {
    gradient: "linear-gradient(135deg, #96537a 0%, #4f203c 50%, #210a17 100%)",
    glow: "rgba(150, 83, 122, 0.4)",
    accent: "#c77fa7",
  },
  {
    gradient: "linear-gradient(135deg, #5b7582 0%, #263c47 50%, #0d171c 100%)",
    glow: "rgba(91, 117, 130, 0.4)",
    accent: "#8faec0",
  },
  {
    gradient: "linear-gradient(135deg, #826e53 0%, #473a27 50%, #1a140b 100%)",
    glow: "rgba(130, 110, 83, 0.4)",
    accent: "#baa78b",
  },
  {
    gradient: "linear-gradient(135deg, #bf674b 0%, #732f1a 50%, #260a02 100%)",
    glow: "rgba(191, 103, 75, 0.4)",
    accent: "#e88e72",
  },
];

/**
 * Computes deterministic integer hash from string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Gets procedural avatar gradient scheme for an artist based on ID or name.
 */
export function getArtistGradient(identifier: string): AvatarGradient {
  const index = hashString(identifier || "artist") % ARTIST_PALETTES.length;
  return ARTIST_PALETTES[index];
}

/**
 * Extracts 1-2 uppercase initials from artist name.
 */
export function getArtistInitials(name: string): string {
  if (!name) return "A";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Formats a number with comma separators (e.g. 12,345,678).
 */
export function formatWithCommas(num: number): string {
  if (typeof num !== "number" || isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}

/**
 * Formats listener or follower numbers into compact human string (e.g. 4.2M, 850K).
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return num.toString();
}
