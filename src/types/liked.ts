export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string;
  playsCount: number;
  isLiked: boolean;
  filePath: string;
  folderId?: string;
  dateAdded: string;
  dateLiked: string;
}

export type LikedSortColumn = "title" | "artist" | "album" | "durationSeconds" | "dateLiked";

export type SortDirection = "asc" | "desc";

export interface LikedSortState {
  column: LikedSortColumn;
  direction: SortDirection;
}

export interface LikedSongsState {
  tracks: LikedTrack[];
  unlikedPendingIds: string[];
  filterQuery: string;
  sortState: LikedSortState;

  toggleLikeTrack: (trackId: string) => void;
  setFilterQuery: (query: string) => void;
  setSortColumn: (column: LikedSortColumn) => void;
  cleanupUnlikedTracks: () => void;
  playAll: () => void;
  shuffleAll: () => void;
  playTrackAtIndex: (index: number) => void;
}
