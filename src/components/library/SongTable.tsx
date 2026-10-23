import { useState, useMemo } from "react";
import {
  useLibraryFilterQuery,
  useLibraryFolders,
  useLibrarySortState,
  useLibraryStore,
  useLibraryTracks,
  useSelectedFolderId,
} from "../../store/useLibraryStore";
import { useCurrentTrack, useIsPlaying, usePlayerStore } from "../../store/usePlayerStore";
import type { LibrarySortColumn, LibraryTrack } from "../../types/library";
import type { Track } from "../../types/discovery";
import { formatDuration } from "../../utils/format";

interface SongTableProps {
  onPlayTrack?: (track: LibraryTrack, queue: LibraryTrack[]) => void;
}

export function SongTable({ onPlayTrack }: SongTableProps) {
  const tracks = useLibraryTracks();
  const folders = useLibraryFolders();
  const selectedFolderId = useSelectedFolderId();
  const filterQuery = useLibraryFilterQuery();
  const sortState = useLibrarySortState();

  const setFilterQuery = useLibraryStore((state) => state.setFilterQuery);
  const setSortColumn = useLibraryStore((state) => state.setSortColumn);
  const setSelectedFolder = useLibraryStore((state) => state.setSelectedFolder);
  const toggleLikeTrack = useLibraryStore((state) => state.toggleLikeTrack);

  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrackInPlayer = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  // Filter and sort tracks
  const filteredAndSortedTracks = useMemo(() => {
    let result = [...tracks];

    // Filter by folder if selected
    if (selectedFolderId) {
      result = result.filter((t) => t.folderId === selectedFolderId);
    }

    // Filter by text search query
    const trimmed = filterQuery.trim().toLowerCase();
    if (trimmed.length > 0) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmed) ||
          t.artist.toLowerCase().includes(trimmed) ||
          t.album.toLowerCase().includes(trimmed)
      );
    }

    // Sort by chosen column
    const { column, direction } = sortState;
    result.sort((a, b) => {
      let comparison = 0;
      if (column === "durationSeconds") {
        comparison = a.durationSeconds - b.durationSeconds;
      } else if (column === "dateAdded") {
        comparison = a.dateAdded.localeCompare(b.dateAdded);
      } else if (column === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (column === "artist") {
        comparison = a.artist.localeCompare(b.artist);
      } else if (column === "album") {
        comparison = a.album.localeCompare(b.album);
      }

      if (comparison !== 0) {
        return direction === "asc" ? comparison : -comparison;
      }

      // Stable secondary sorting by title
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [tracks, selectedFolderId, filterQuery, sortState]);

  const handleRowPlay = (track: LibraryTrack, index: number) => {
    if (onPlayTrack) {
      onPlayTrack(track, filteredAndSortedTracks);
      return;
    }

    if (currentTrack?.id === track.id) {
      togglePlayPause();
      return;
    }

    // Queue visible tracks and start playback
    const playerQueue: Track[] = filteredAndSortedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationSeconds: t.durationSeconds,
      artworkUrl: t.artworkUrl,
      playsCount: t.playsCount,
      isLiked: Boolean(likedTrackIds[t.id] ?? t.isLiked),
      filePath: t.filePath,
      genre: t.genre,
    }));

    const selectedPlayerTrack = playerQueue[index] ?? playerQueue[0];
    playTrackInPlayer(selectedPlayerTrack, playerQueue);
  };

  const renderSortIndicator = (column: LibrarySortColumn) => {
    if (sortState.column !== column) {
      return (
        <span style={{ opacity: 0.25, fontSize: "10px", marginLeft: "4px" }} aria-hidden="true">
          ↕
        </span>
      );
    }
    return (
      <span
        style={{ color: "var(--accent)", fontSize: "10px", marginLeft: "4px", fontWeight: 700 }}
        aria-hidden="true"
      >
        {sortState.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        minWidth: 0,
        width: "100%",
      }}
    >
      {/* Table controls bar: search input and filter chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Search input inside table */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "320px",
          }}
        >
          <svg
            className="i"
            width="14"
            height="14"
            style={{ position: "absolute", left: "12px", color: "var(--m)" }}
            aria-hidden="true"
          >
            <use href="#search" />
          </svg>
          <input
            type="text"
            placeholder="Filter songs in library..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            aria-label="Filter songs in library"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px 8px 34px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--t)",
              fontSize: "13px",
              outline: "none",
            }}
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery("")}
              aria-label="Clear filter search query"
              style={{
                position: "absolute",
                right: "10px",
                background: "none",
                border: 0,
                color: "var(--m)",
                cursor: "pointer",
                padding: "2px",
                fontSize: "12px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status / Active folder chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {selectedFolder && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "12px",
                background: "rgba(240, 169, 130, 0.15)",
                border: "1px solid rgba(240, 169, 130, 0.3)",
                color: "var(--accent)",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <span>Folder: {selectedFolder.displayName}</span>
              <button
                onClick={() => setSelectedFolder(null)}
                aria-label={`Clear filter for folder ${selectedFolder.displayName}`}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--accent)",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          )}

          <span style={{ fontSize: "12px", color: "var(--m)" }}>
            Showing {filteredAndSortedTracks.length} of {tracks.length} songs
          </span>
        </div>
      </div>

      {/* Main Songs Table */}
      {filteredAndSortedTracks.length === 0 ? (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            color: "var(--m)",
          }}
        >
          <div style={{ fontSize: "16px", color: "var(--t)", fontWeight: 500 }}>
            No songs match your filter
          </div>
          <div style={{ fontSize: "13px", maxWidth: "360px" }}>
            {filterQuery
              ? `No tracks found matching "${filterQuery}". Try a different search keyword.`
              : "No tracks found in the selected folder."}
          </div>
          {(filterQuery || selectedFolderId) && (
            <button
              onClick={() => {
                setFilterQuery("");
                setSelectedFolder(null);
              }}
              style={{
                marginTop: "6px",
                padding: "6px 16px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.07)",
                color: "var(--t)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          role="table"
          aria-label="Indexed songs table"
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            background: "rgba(17, 12, 10, 0.5)",
          }}
        >
          {/* Table Header Row */}
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: "48px 3fr 2fr 2fr 90px 110px 48px",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(24, 17, 15, 0.9)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--m)",
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            <div role="columnheader" style={{ textAlign: "center" }}>
              #
            </div>

            <div
              role="columnheader"
              onClick={() => setSortColumn("title")}
              aria-sort={
                sortState.column === "title"
                  ? sortState.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <span>Title</span>
              {renderSortIndicator("title")}
            </div>

            <div
              role="columnheader"
              onClick={() => setSortColumn("artist")}
              aria-sort={
                sortState.column === "artist"
                  ? sortState.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <span>Artist</span>
              {renderSortIndicator("artist")}
            </div>

            <div
              role="columnheader"
              onClick={() => setSortColumn("album")}
              aria-sort={
                sortState.column === "album"
                  ? sortState.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <span>Album</span>
              {renderSortIndicator("album")}
            </div>

            <div
              role="columnheader"
              onClick={() => setSortColumn("durationSeconds")}
              aria-sort={
                sortState.column === "durationSeconds"
                  ? sortState.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <span>Duration</span>
              {renderSortIndicator("durationSeconds")}
            </div>

            <div
              role="columnheader"
              onClick={() => setSortColumn("dateAdded")}
              aria-sort={
                sortState.column === "dateAdded"
                  ? sortState.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <span>Date Added</span>
              {renderSortIndicator("dateAdded")}
            </div>

            <div role="columnheader" style={{ textAlign: "center" }}>
              <span className="sr-only">Like</span>
            </div>
          </div>

          {/* Table Rows */}
          {filteredAndSortedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isRowPlaying = isCurrent && isPlaying;
            const isLiked = Boolean(likedTrackIds[track.id] ?? track.isLiked);
            const isHovered = hoveredRowId === track.id;

            return (
              <div
                key={track.id}
                role="row"
                tabIndex={0}
                aria-label={`${track.title} by ${track.artist}`}
                onDoubleClick={() => handleRowPlay(track, idx)}
                onMouseEnter={() => setHoveredRowId(track.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 3fr 2fr 2fr 90px 110px 48px",
                  alignItems: "center",
                  padding: "8px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                  background: isCurrent
                    ? "rgba(240, 169, 130, 0.09)"
                    : isHovered
                    ? "rgba(255, 255, 255, 0.04)"
                    : "transparent",
                  color: isCurrent ? "var(--accent)" : "var(--t)",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "background 0.12s ease",
                }}
              >
                {/* Number / Play button cell */}
                <div
                  role="cell"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    color: isCurrent ? "var(--accent)" : "var(--m)",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowPlay(track, idx);
                    }}
                    aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      color: isCurrent ? "var(--accent)" : isHovered ? "var(--t)" : "var(--m)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      width: "28px",
                      height: "28px",
                    }}
                  >
                    {isHovered || isCurrent ? (
                      <svg className="i" width="14" height="14" aria-hidden="true">
                        <use href={isRowPlaying ? "#pause" : "#play"} />
                      </svg>
                    ) : (
                      <span style={{ fontSize: "12px", fontFamily: "monospace" }}>
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                    )}
                  </button>
                </div>

                {/* Title & Artwork cell */}
                <div
                  role="cell"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                    paddingRight: "12px",
                  }}
                >
                  <img
                    src={track.artworkUrl}
                    alt=""
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      objectFit: "cover",
                      flexShrink: 0,
                      background: "#241a16",
                    }}
                  />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div
                      style={{
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: isCurrent ? "var(--accent)" : "var(--t)",
                      }}
                      title={track.title}
                    >
                      {track.title}
                    </div>
                    {track.bitrate && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--m)",
                          fontFamily: "monospace",
                          opacity: 0.8,
                        }}
                      >
                        {track.bitrate >= 1000 ? "FLAC Lossless" : `${track.bitrate} kbps`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Artist cell */}
                <div
                  role="cell"
                  style={{
                    color: isCurrent ? "var(--accent)" : "var(--m)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    paddingRight: "12px",
                  }}
                  title={track.artist}
                >
                  {track.artist}
                </div>

                {/* Album cell */}
                <div
                  role="cell"
                  style={{
                    color: "var(--m)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    paddingRight: "12px",
                  }}
                  title={track.album}
                >
                  {track.album}
                </div>

                {/* Duration cell */}
                <div
                  role="cell"
                  style={{
                    textAlign: "right",
                    color: "var(--m)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                >
                  {formatDuration(track.durationSeconds)}
                </div>

                {/* Date Added cell */}
                <div
                  role="cell"
                  style={{
                    textAlign: "right",
                    color: "var(--m)",
                    fontSize: "12px",
                  }}
                >
                  {track.dateAdded}
                </div>

                {/* Like toggle cell */}
                <div
                  role="cell"
                  style={{
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLikeTrack(track.id);
                    }}
                    aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
                    style={{
                      background: "none",
                      border: 0,
                      padding: "4px",
                      color: isLiked ? "var(--accent)" : "var(--m)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      opacity: isLiked || isHovered ? 1 : 0.3,
                      transition: "opacity 0.15s ease, transform 0.15s ease",
                    }}
                  >
                    <svg
                      className="i"
                      width="16"
                      height="16"
                      style={{
                        fill: isLiked ? "var(--accent)" : "none",
                        stroke: isLiked ? "var(--accent)" : "currentColor",
                      }}
                      aria-hidden="true"
                    >
                      <use href="#heart" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
