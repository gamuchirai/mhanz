/**
 * Discovery and playback interfaces for the Home screen and player controls.
 */

export interface AmbientColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string | null;
  album: string;
  albumId?: string | null;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath?: string;
  genre?: string;
  ambientColors?: AmbientColorPalette;
}

export interface ShowcaseItem {
  id: string;
  headline: string;
  subtitle: string;
  badge: string;
  bannerImageUrl: string;
  actionType: "play_track" | "play_playlist" | "navigate";
  targetId: string;
  description?: string;
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

export type HomeRecommendationKind =
  | "recently_added"
  | "most_played"
  | "best_artist"
  | "trending_genre";

export type HomeRecommendationSource = "history" | "library" | "none";

export interface HomeRecommendationCollection {
  kind: HomeRecommendationKind;
  title: string;
  source: HomeRecommendationSource;
  tracks: Track[];
}

export interface HomeRecommendationsData {
  libraryTrackCount: number;
  recentlyAdded: HomeRecommendationCollection;
  mostPlayed: HomeRecommendationCollection;
  bestArtist: HomeRecommendationCollection;
  trendingGenre: HomeRecommendationCollection;
}

