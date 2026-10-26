/**
 * Database contracts, DTOs, and error types matching the Rust persistence layer.
 */

export interface DatabaseError {
  code: string;
  message: string;
}

export interface DatabaseStatusDto {
  is_ready: boolean;
  schema_version: number;
  database_path: string;
  track_count: number;
  album_count: number;
  artist_count: number;
  playlist_count: number;
}

export interface FolderDto {
  id: string;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
  is_active: boolean;
}

export interface TrackDto {
  id: string;
  file_path: string;
  title: string;
  artist_id: string | null;
  artist_name: string;
  album_id: string | null;
  album_name: string | null;
  album_artist: string | null;
  duration: number;
  year: number | null;
  genre: string | null;
  disc_number: number;
  track_number: number | null;
  bitrate: number | null;
  format: string;
  cover_art_path: string | null;
  is_favorite: boolean;
  liked_at: number | null;
  play_count: number;
  last_played_at: number | null;
  file_modified_at: number;
  file_size_bytes: number;
  folder_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface TrackFilterDto {
  folder_id?: string;
  is_favorite?: boolean;
  search_query?: string;
  artist_id?: string;
  album_id?: string;
  genre?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}

export interface PaginatedTracksDto {
  items: TrackDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AlbumDto {
  id: string;
  title: string;
  artist_id: string | null;
  artist_name: string;
  year: number | null;
  genre: string | null;
  cover_art_path: string | null;
  total_discs: number;
  track_count: number;
  created_at: number;
  updated_at: number;
}

export interface AlbumDetailDto {
  album: AlbumDto;
  tracks: TrackDto[];
}

export interface ArtistDto {
  id: string;
  name: string;
  bio: string | null;
  avatar_path: string | null;
  track_count: number;
  album_count: number;
  created_at: number;
  updated_at: number;
}

export interface ArtistProfileDto {
  artist: ArtistDto;
  top_tracks: TrackDto[];
  albums: AlbumDto[];
}

export interface PlaylistDto {
  id: string;
  name: string;
  description: string | null;
  cover_art_path: string | null;
  gradient_preset: string | null;
  is_favorite: boolean;
  is_curated: boolean;
  track_count: number;
  created_at: number;
  updated_at: number;
}

export interface PlaylistInputDto {
  id?: string;
  name: string;
  description?: string;
  gradient_preset?: string;
  cover_art_path?: string;
}

export interface PlaylistTrackDto {
  id: string;
  playlist_id: string;
  track: TrackDto;
  position: number;
  added_at: number;
}

export interface PlaylistDetailDto {
  playlist: PlaylistDto;
  tracks: PlaylistTrackDto[];
}
