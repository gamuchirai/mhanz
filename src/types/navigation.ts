export type NavViewId =
  | "Home"
  | "Search"
  | "Your Library"
  | "Liked Songs"
  | "Playlists"
  | "Albums"
  | "Artists";

export interface NavRouteParams {
  playlistId?: string | null;
  albumId?: string | null;
  artistId?: string | null;
  searchQuery?: string;
  folderPath?: string;
}

export interface NavHistoryEntry {
  id: string;
  view: NavViewId;
  params?: NavRouteParams;
  timestamp: number;
}

