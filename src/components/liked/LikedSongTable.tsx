import { useState, useMemo } from "react";
import {
  getFilteredAndSortedLikedTracks,
  useLikedFilterQuery,
  useLikedSongsStore,
  useLikedSortState,
  useLikedTracks,
  useUnlikedPendingIds,
} from "../../store/useLikedSongsStore";
import { useCurrentTrack, useIsPlaying } from "../../store/usePlayerStore";
import type { LikedSortColumn, LikedTrack } from "../../types/liked";
import { formatDuration, formatRelativeDate } from "../../utils/format";

export function LikedSongTable() {
  const tracks = useLikedTracks();
  const unlikedPendingIds = useUnlikedPendingIds();
  const filterQuery = useLikedFilterQuery();
  const sortState = useLikedSortState();

  const setFilterQuery = useLikedSongsStore((state) => state.setFilterQuery);
  const setSortColumn = useLikedSongsStore((state) => state.setSortColumn);
  const toggleLikeTrack = useLikedSongsStore((state) => state.toggleLikeTrack);
  const playTrackAtIndex = useLikedSongsStore((state) => state.playTrackAtIndex);

  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();

  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  // Compute filtered and sorted track list
  const visibleTracks = useMemo(() => {
    return getFilteredAndSortedLikedTracks(tracks, filterQuery, sortState);
  }, [tracks, filterQuery, sortState]);

  const hasSearchFilter = filterQuery.trim().length > 0;
  const isSearchEmpty = hasSearchFilter && visibleTracks.length === 0;

  const renderSortIndicator = (column: LikedSortColumn) => {
    if (sortState.column !== column) return null;
    return (
      <span style={{ fontSize: "10px", marginLeft: "4px" }} aria-hidden="true">
        {sortState.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // If search returned zero results, show inline empty search notice
  if (isSearchEmpty) {
    return (
      <div
        role="region"
        aria-label="No matching liked songs"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "14px",
          border: "1px dashed rgba(255, 255, 255, 0.08)",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--m)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="12" />
          <line x1="11" y1="14" x2="11.01" y2="14" />
        </svg>
        <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--t)" }}>
          No liked songs matching &ldquo;{filterQuery}&rdquo;
        </span>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--m)" }}>
          Try checking for spelling errors or searching with a different term.
        </p>
        <button
          onClick={() => setFilterQuery("")}
          aria-label="Clear search filter"
          style={{
            marginTop: "8px",
            padding: "8px 18px",
            borderRadius: "18px",
            background: "rgba(240, 169, 130, 0.14)",
            color: "var(--accent)",
            border: "1px solid rgba(240, 169, 130, 0.28)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Liked songs table"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        marginTop: "4px",
      }}
    >
      {/* Table Header Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 3fr 2fr 2fr 1.6fr 80px 48px",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          color: "var(--m)",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        <span>#</span>

        <button
          onClick={() => setSortColumn("title")}
          aria-label={`Sort by title column ${sortState.column === "title" ? sortState.direction : ""}`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: sortState.column === "title" ? "var(--accent)" : "inherit",
            font: "inherit",
            fontWeight: 600,
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          Title {renderSortIndicator("title")}
        </button>

        <button
          onClick={() => setSortColumn("artist")}
          aria-label={`Sort by artist column ${sortState.column === "artist" ? sortState.direction : ""}`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: sortState.column === "artist" ? "var(--accent)" : "inherit",
            font: "inherit",
            fontWeight: 600,
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          Artist {renderSortIndicator("artist")}
        </button>

        <button
          onClick={() => setSortColumn("album")}
          aria-label={`Sort by album column ${sortState.column === "album" ? sortState.direction : ""}`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: sortState.column === "album" ? "var(--accent)" : "inherit",
            font: "inherit",
            fontWeight: 600,
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          Album {renderSortIndicator("album")}
        </button>

        <button
          onClick={() => setSortColumn("dateLiked")}
          aria-label={`Sort by date liked column ${sortState.column === "dateLiked" ? sortState.direction : ""}`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: sortState.column === "dateLiked" ? "var(--accent)" : "inherit",
            font: "inherit",
            fontWeight: 600,
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          Date Liked {renderSortIndicator("dateLiked")}
        </button>

        <button
          onClick={() => setSortColumn("durationSeconds")}
          aria-label={`Sort by duration column ${sortState.column === "durationSeconds" ? sortState.direction : ""}`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: sortState.column === "durationSeconds" ? "var(--accent)" : "inherit",
            font: "inherit",
            fontWeight: 600,
            textAlign: "right",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-end",
            cursor: "pointer",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {renderSortIndicator("durationSeconds")}
        </button>

        <span style={{ textAlign: "center" }}></span>
      </div>

      {/* Song Rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {visibleTracks.map((track: LikedTrack, index: number) => {
          const isHovered = hoveredTrackId === track.id;
          const isCurrent = currentTrack?.id === track.id;
          const isPendingUnliked = unlikedPendingIds.includes(track.id);
          const isLiked = track.isLiked && !isPendingUnliked;

          return (
            <div
              key={track.id}
              role="row"
              tabIndex={0}
              onMouseEnter={() => setHoveredTrackId(track.id)}
              onMouseLeave={() => setHoveredTrackId(null)}
              onDoubleClick={() => playTrackAtIndex(index)}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 3fr 2fr 2fr 1.6fr 80px 48px",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: "8px",
                background: isHovered
                  ? "rgba(255, 255, 255, 0.05)"
                  : isCurrent
                  ? "rgba(240, 169, 130, 0.08)"
                  : "transparent",
                color: isCurrent ? "var(--accent)" : "var(--t)",
                opacity: isPendingUnliked ? 0.6 : 1,
                cursor: "pointer",
                transition: "background 0.12s ease, opacity 0.15s ease",
              }}
            >
              {/* Index Number or Hover Play Button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  width: "28px",
                  height: "28px",
                }}
              >
                {isHovered ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrackAtIndex(index);
                    }}
                    aria-label={`Play ${track.title} by ${track.artist}`}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      color: "var(--t)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : isCurrent && isPlaying ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "2px",
                      height: "14px",
                    }}
                  >
                    <span
                      style={{
                        width: "3px",
                        height: "100%",
                        background: "var(--accent)",
                        borderRadius: "1px",
                      }}
                    />
                    <span
                      style={{
                        width: "3px",
                        height: "60%",
                        background: "var(--accent)",
                        borderRadius: "1px",
                      }}
                    />
                    <span
                      style={{
                        width: "3px",
                        height: "80%",
                        background: "var(--accent)",
                        borderRadius: "1px",
                      }}
                    />
                  </span>
                ) : (
                  <span style={{ fontSize: "13px", color: "var(--m)" }}>{index + 1}</span>
                )}
              </div>

              {/* Title and Artwork Thumbnail */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                  paddingRight: "16px",
                }}
              >
                <img
                  src={track.artworkUrl}
                  alt={`${track.album} cover`}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "6px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  loading="lazy"
                />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: isCurrent ? "var(--accent)" : "var(--t)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {track.title}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--m)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {track.artist}
                  </span>
                </div>
              </div>

              {/* Artist Column */}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--m)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "16px",
                }}
              >
                {track.artist}
              </div>

              {/* Album Column */}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--m)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "16px",
                }}
              >
                {track.album}
              </div>

              {/* Date Liked Column */}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--m)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "16px",
                }}
              >
                {formatRelativeDate(track.dateLiked)}
              </div>

              {/* Duration Column */}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--m)",
                  textAlign: "right",
                  paddingRight: "8px",
                }}
              >
                {formatDuration(track.durationSeconds)}
              </div>

              {/* Heart Action Button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeTrack(track.id);
                  }}
                  aria-label={
                    isLiked
                      ? `Unlike ${track.title}`
                      : `Restore like for ${track.title}`
                  }
                  style={{
                    background: "none",
                    border: 0,
                    padding: "6px",
                    color: isLiked ? "var(--accent)" : "var(--m)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    transition: "transform 0.15s ease, color 0.15s ease",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
