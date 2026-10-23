/**
 * Discovery and playback interfaces for the Home screen and player controls.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath?: string;
  genre?: string;
}

export interface ShowcaseItem {
  id: string;
  headline: string;
  subtitle: string;
  badge: string;
  bannerImageUrl: string;
  actionType: "play_track" | "play_playlist" | "navigate";
  targetId: string;
  track?: Track;
}

export interface CuratedCard {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  trackCount: number;
  type: "playlist" | "album";
  tracks: Track[];
  accentGradient?: string;
}

export interface PlayHistoryItem {
  id: string;
  trackId: string;
  track: Track;
  playedAtTimestamp: number;
  contextTitle: string;
}
