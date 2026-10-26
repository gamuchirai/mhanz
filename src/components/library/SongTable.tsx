import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
    initialRect: { width: 1000, height: 800 },
  });

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
          ref={parentRef}
          role="table"
          aria-label="Indexed songs table"
          className="w-full rounded-xl overflow-y-auto max-h-[calc(100vh-320px)] border border-white/5 bg-[#110c0a]/50 relative"
        >
          {/* Table Header Row with progressive column hiding */}
          <div
            role="row"
            className="sticky top-0 z-10 grid grid-cols-[48px_3fr_2fr_2fr_90px_110px_48px] max-[1150px]:grid-cols-[48px_3fr_2fr_2fr_90px_48px] max-[950px]:grid-cols-[40px_3fr_2fr_80px_40px] px-4 py-2.5 border-b border-white/[0.08] bg-[#18110f] text-[11px] uppercase tracking-[0.08em] text-[#a89b91] font-semibold select-none items-center shadow-sm"
          >
            <div role="columnheader" className="text-center">
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
              className="cursor-pointer flex items-center"
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
              className="cursor-pointer flex items-center"
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
              className="cursor-pointer flex items-center max-[950px]:hidden"
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
              className="cursor-pointer flex items-center justify-end"
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
              className="cursor-pointer flex items-center justify-end max-[1150px]:hidden"
            >
              <span>Date Added</span>
              {renderSortIndicator("dateAdded")}
            </div>

            <div role="columnheader" className="text-center">
              <span className="sr-only">Like</span>
            </div>
          </div>

          {/* Virtualized Table Rows */}
          <div
            style={{
              height: `${Math.max(filteredAndSortedTracks.length * 52, rowVirtualizer.getTotalSize())}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {(rowVirtualizer.getVirtualItems().length > 0
              ? rowVirtualizer.getVirtualItems().map((v) => ({
                  track: filteredAndSortedTracks[v.index],
                  index: v.index,
                  start: v.start,
                }))
              : filteredAndSortedTracks.map((track, index) => ({
                  track,
                  index,
                  start: index * 52,
                }))
            ).map(({ track, index, start }) => {
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
                  onDoubleClick={() => handleRowPlay(track, index)}
                  onMouseEnter={() => setHoveredRowId(track.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "52px",
                    transform: `translateY(${start}px)`,
                  }}
                  className={`grid grid-cols-[48px_3fr_2fr_2fr_90px_110px_48px] max-[1150px]:grid-cols-[48px_3fr_2fr_2fr_90px_48px] max-[950px]:grid-cols-[40px_3fr_2fr_80px_40px] items-center px-4 border-b border-white/[0.03] text-[13px] cursor-pointer transition-colors duration-150 ${
                    isCurrent
                      ? "bg-[#f0a982]/10 text-[#f0a982]"
                      : isHovered
                        ? "bg-white/[0.04] text-[#f4ebe4]"
                        : "bg-transparent text-[#f4ebe4]"
                  }`}
                >
                  {/* Number / Play button cell */}
                  <div role="cell" className="grid place-items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowPlay(track, index);
                      }}
                      aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      className={`bg-transparent border-0 p-0 cursor-pointer grid place-items-center w-7 h-7 ${
                        isCurrent
                          ? "text-[#f0a982]"
                          : isHovered
                            ? "text-[#f4ebe4]"
                            : "text-[#a89b91]"
                      }`}
                    >
                      {isHovered || isCurrent ? (
                        <svg className="i w-3.5 h-3.5" aria-hidden="true">
                          <use href={isRowPlaying ? "#pause" : "#play"} />
                        </svg>
                      ) : (
                        <span className="text-xs font-mono">
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Title & Artwork cell */}
                  <div role="cell" className="flex items-center gap-3 min-w-0 pr-3">
                    <img
                      src={track.artworkUrl}
                      alt=""
                      className="w-9 h-9 rounded-md object-cover shrink-0 bg-[#241a16]"
                    />
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div
                        className={`font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                          isCurrent ? "text-[#f0a982]" : "text-[#f4ebe4]"
                        }`}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      {track.bitrate && (
                        <div className="text-[10px] text-[#a89b91] font-mono opacity-80">
                          {track.bitrate >= 1000 ? "FLAC Lossless" : `${track.bitrate} kbps`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artist cell */}
                  <div
                    role="cell"
                    className={`whitespace-nowrap overflow-hidden text-ellipsis pr-3 ${
                      isCurrent ? "text-[#f0a982]" : "text-[#a89b91]"
                    }`}
                    title={track.artist}
                  >
                    {track.artist}
                  </div>

                  {/* Album cell - progressive column hiding under 950px */}
                  <div
                    role="cell"
                    className="max-[950px]:hidden text-[#a89b91] whitespace-nowrap overflow-hidden text-ellipsis pr-3"
                    title={track.album}
                  >
                    {track.album}
                  </div>

                  {/* Duration cell */}
                  <div role="cell" className="text-right text-[#a89b91] font-mono text-xs">
                    {formatDuration(track.durationSeconds)}
                  </div>

                  {/* Date Added cell - progressive column hiding under 1150px */}
                  <div
                    role="cell"
                    className="max-[1150px]:hidden text-right text-[#a89b91] text-xs"
                  >
                    {track.dateAdded}
                  </div>

                  {/* Like toggle cell */}
                  <div role="cell" className="grid place-items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track.id);
                      }}
                      aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
                      className={`bg-transparent border-0 p-1 cursor-pointer grid place-items-center transition-all ${
                        isLiked
                          ? "text-[#f0a982] opacity-100"
                          : isHovered
                            ? "text-[#a89b91] opacity-100"
                            : "text-[#a89b91] opacity-30"
                      }`}
                    >
                      <svg
                        className="i w-4 h-4"
                        style={{
                          fill: isLiked ? "#f0a982" : "none",
                          stroke: isLiked ? "#f0a982" : "currentColor",
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
        </div>
      )}
    </div>
  );
}
