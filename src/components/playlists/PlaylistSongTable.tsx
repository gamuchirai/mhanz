import { useState, useMemo } from "react";
import type { Playlist, HydratedPlaylistTrack } from "../../types/playlist";
import {
  hydratePlaylistEntries,
  useDetailSearchQuery,
  usePlaylistStore,
  usePlaylistTracksByPlaylistId,
} from "../../store/usePlaylistStore";
import { useCurrentTrack, useIsPlaying, usePlayerStore } from "../../store/usePlayerStore";
import { formatDuration, formatRelativeDate } from "../../utils/format";

interface PlaylistSongTableProps {
  playlist: Playlist;
}

type SortColumn = "position" | "title" | "artist" | "album" | "dateAdded" | "duration";
type SortDirection = "asc" | "desc";

interface DisplayItem {
  hydrated: HydratedPlaylistTrack;
  originalIndex: number;
}

export function PlaylistSongTable({ playlist }: PlaylistSongTableProps) {
  const entries = usePlaylistTracksByPlaylistId(playlist.id);
  const detailSearchQuery = useDetailSearchQuery();
  const setDetailSearchQuery = usePlaylistStore((state) => state.setDetailSearchQuery);

  const reorderTrack = usePlaylistStore((state) => state.reorderTrack);
  const removeTrackFromPlaylist = usePlaylistStore((state) => state.removeTrackFromPlaylist);
  const playPlaylist = usePlaylistStore((state) => state.playPlaylist);

  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const [sortColumn, setSortColumn] = useState<SortColumn>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

  // Hydrate entries with track details
  const hydratedItems: DisplayItem[] = useMemo(() => {
    const hydrated = hydratePlaylistEntries(entries);
    return hydrated.map((h, i) => ({
      hydrated: h,
      originalIndex: i,
    }));
  }, [entries]);

  // Filter and sort items
  const displayItems = useMemo(() => {
    let result = [...hydratedItems];
    const query = detailSearchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter(
        ({ hydrated }) =>
          hydrated.track.title.toLowerCase().includes(query) ||
          hydrated.track.artist.toLowerCase().includes(query) ||
          hydrated.track.album.toLowerCase().includes(query)
      );
    }

    if (sortColumn !== "position") {
      result.sort((a, b) => {
        let cmp = 0;
        if (sortColumn === "title") {
          cmp = a.hydrated.track.title.localeCompare(b.hydrated.track.title);
        } else if (sortColumn === "artist") {
          cmp = a.hydrated.track.artist.localeCompare(b.hydrated.track.artist);
        } else if (sortColumn === "album") {
          cmp = a.hydrated.track.album.localeCompare(b.hydrated.track.album);
        } else if (sortColumn === "duration") {
          cmp = a.hydrated.track.durationSeconds - b.hydrated.track.durationSeconds;
        } else if (sortColumn === "dateAdded") {
          const tA = new Date(a.hydrated.entry.addedAt).getTime() || 0;
          const tB = new Date(b.hydrated.entry.addedAt).getTime() || 0;
          cmp = tA - tB;
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
    } else if (sortDirection === "desc") {
      result.reverse();
    }

    return result;
  }, [hydratedItems, detailSearchQuery, sortColumn, sortDirection]);

  const handleHeaderClick = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return (
      <span style={{ fontSize: "10px", marginLeft: "4px" }} aria-hidden="true">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const isReorderingEnabled = sortColumn === "position" && !detailSearchQuery.trim();

  if (displayItems.length === 0 && detailSearchQuery.trim()) {
    return (
      <div
        role="region"
        aria-label="No matching tracks"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "48px 24px",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "14px",
          border: "1px dashed rgba(255, 255, 255, 0.08)",
        }}
      >
        <span style={{ fontSize: "15px", color: "var(--t)", fontWeight: 500 }}>
          No songs found matching &ldquo;{detailSearchQuery}&rdquo;
        </span>
        <button
          type="button"
          onClick={() => setDetailSearchQuery("")}
          style={{
            padding: "8px 18px",
            borderRadius: "18px",
            background: "rgba(240, 169, 130, 0.14)",
            color: "var(--accent)",
            border: "1px solid rgba(240, 169, 130, 0.3)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Clear filter
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Playlist tracks list"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              color: "var(--m)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <th
              onClick={() => handleHeaderClick("position")}
              style={{
                width: "60px",
                padding: "10px 12px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              # {renderSortIndicator("position")}
            </th>

            <th
              onClick={() => handleHeaderClick("title")}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Title {renderSortIndicator("title")}
            </th>

            <th
              onClick={() => handleHeaderClick("artist")}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Artist {renderSortIndicator("artist")}
            </th>

            <th
              onClick={() => handleHeaderClick("album")}
              className="max-[950px]:hidden"
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Album {renderSortIndicator("album")}
            </th>

            <th
              onClick={() => handleHeaderClick("dateAdded")}
              className="max-[1150px]:hidden"
              style={{
                width: "120px",
                padding: "10px 12px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Date Added {renderSortIndicator("dateAdded")}
            </th>

            <th
              onClick={() => handleHeaderClick("duration")}
              style={{
                width: "80px",
                padding: "10px 12px",
                textAlign: "right",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Duration {renderSortIndicator("duration")}
            </th>

            <th style={{ width: "90px", padding: "10px 12px", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {displayItems.map(({ hydrated, originalIndex }, index) => {
            const { entry, track } = hydrated;
            const isHovered = hoveredEntryId === entry.entryId;
            const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
            const isLiked = Boolean(likedTrackIds[track.id]);

            return (
              <tr
                key={entry.entryId}
                onMouseEnter={() => setHoveredEntryId(entry.entryId)}
                onMouseLeave={() => setHoveredEntryId(null)}
                onDoubleClick={() => playPlaylist(playlist.id, originalIndex)}
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  background: isHovered ? "rgba(255, 255, 255, 0.04)" : "transparent",
                  transition: "background 0.15s ease",
                  cursor: "default",
                }}
              >
                {/* # Number / Play trigger / Position reorder */}
                <td
                  style={{
                    padding: "10px 12px",
                    color: isCurrentPlaying ? "var(--accent)" : "var(--m)",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      minWidth: "48px",
                    }}
                  >
                    {isHovered ? (
                      <button
                        type="button"
                        onClick={() => playPlaylist(playlist.id, originalIndex)}
                        aria-label={`Play ${track.title}`}
                        style={{
                          background: "none",
                          border: 0,
                          padding: 0,
                          color: "var(--accent)",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <svg className="i" width="16" height="16" aria-hidden="true">
                          <use href="#play" />
                        </svg>
                      </button>
                    ) : isCurrentPlaying ? (
                      <span
                        style={{
                          display: "inline-block",
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        ▶
                      </span>
                    ) : (
                      <span>{index + 1}</span>
                    )}

                    {/* Reordering Controls when natural position order is active */}
                    {isReorderingEnabled && (
                      <div
                        style={{
                          display: isHovered ? "flex" : "none",
                          flexDirection: "column",
                          gap: "1px",
                          marginLeft: "auto",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            reorderTrack(playlist.id, originalIndex, originalIndex - 1)
                          }
                          disabled={originalIndex === 0}
                          aria-label={`Move ${track.title} up`}
                          title="Move up"
                          style={{
                            background: "none",
                            border: 0,
                            padding: "1px",
                            color: originalIndex === 0 ? "rgba(255,255,255,0.15)" : "var(--m)",
                            cursor: originalIndex === 0 ? "not-allowed" : "pointer",
                            fontSize: "8px",
                            lineHeight: 1,
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            reorderTrack(playlist.id, originalIndex, originalIndex + 1)
                          }
                          disabled={originalIndex === entries.length - 1}
                          aria-label={`Move ${track.title} down`}
                          title="Move down"
                          style={{
                            background: "none",
                            border: 0,
                            padding: "1px",
                            color:
                              originalIndex === entries.length - 1
                                ? "rgba(255,255,255,0.15)"
                                : "var(--m)",
                            cursor:
                              originalIndex === entries.length - 1 ? "not-allowed" : "pointer",
                            fontSize: "8px",
                            lineHeight: 1,
                          }}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                </td>

                {/* Title + Thumbnail */}
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={track.artworkUrl}
                        alt=""
                        aria-hidden="true"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          color: isCurrentPlaying ? "var(--accent)" : "var(--t)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.title}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Artist */}
                <td
                  style={{
                    padding: "10px 12px",
                    color: "var(--m)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {track.artist}
                </td>

                {/* Album */}
                <td
                  className="max-[950px]:hidden"
                  style={{
                    padding: "10px 12px",
                    color: "var(--m)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {track.album}
                </td>

                {/* Date Added */}
                <td
                  className="max-[1150px]:hidden"
                  style={{
                    padding: "10px 12px",
                    color: "var(--m)",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatRelativeDate(entry.addedAt)}
                </td>

                {/* Duration */}
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    color: "var(--m)",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDuration(track.durationSeconds)}
                </td>

                {/* Actions: Inline Like + Remove from playlist */}
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => toggleLike(track.id)}
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
                        transition: "all 0.15s ease",
                      }}
                    >
                      <svg
                        className="i"
                        width="16"
                        height="16"
                        fill={isLiked ? "currentColor" : "none"}
                        aria-hidden="true"
                      >
                        <use href="#heart" />
                      </svg>
                    </button>

                    {/* Remove from playlist button */}
                    <button
                      type="button"
                      onClick={() => removeTrackFromPlaylist(playlist.id, entry.entryId)}
                      aria-label={`Remove ${track.title} from playlist`}
                      title="Remove from playlist"
                      style={{
                        background: "none",
                        border: 0,
                        padding: "4px",
                        color: "#ff6b6b",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        opacity: isHovered ? 0.8 : 0,
                        transition: "opacity 0.15s ease",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
