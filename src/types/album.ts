/**
 * Album domain and state types for album collection browsing,
 * multi disc tracklists, and album detail inspection.
 */

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
  totalDuration: number; // in seconds
  label?: string;
  description?: string;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface AlbumTrack {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId: string;
  discNumber: number;
  trackNumber: number;
  duration: number; // in seconds
  coverUrl?: string;
  audioUrl?: string;
  isLiked?: boolean;
  isExplicit?: boolean;
}

export type AlbumSortOption = "title" | "artist" | "releaseYear" | "trackCount";
export type SortDirection = "asc" | "desc";
