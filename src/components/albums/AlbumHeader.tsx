import { useAlbumStore, useAlbums } from "../../store/useAlbumStore";
import type { AlbumSortOption } from "../../types/album";

export function AlbumHeader() {
  const albums = useAlbums();
  const allAlbums = useAlbumStore((state) => state.albums);
  const searchQuery = useAlbumStore((state) => state.searchQuery);
  const setSearchQuery = useAlbumStore((state) => state.setSearchQuery);
  const sortBy = useAlbumStore((state) => state.sortBy);
  const sortDirection = useAlbumStore((state) => state.sortDirection);
  const setSort = useAlbumStore((state) => state.setSort);

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: ".14em",
              color: "var(--accent)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Library Collection
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 700,
                color: "var(--t)",
                letterSpacing: "-0.02em",
              }}
            >
              Albums
            </h1>
            <span
              style={{
                fontSize: "14px",
                color: "var(--m)",
                fontWeight: 400,
              }}
            >
              {searchQuery
                ? `${albums.length} of ${allAlbums.length} releases`
                : `${allAlbums.length} ${allAlbums.length === 1 ? "release" : "releases"}`}
            </span>
          </div>
        </div>

        {/* Controls: Search and Sort */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "260px",
              height: "38px",
              padding: "0 14px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "var(--t)",
            }}
          >
            <svg
              className="i"
              width="15"
              height="15"
              style={{ color: "var(--m)", flexShrink: 0 }}
              aria-hidden="true"
            >
              <use href="#search" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search albums or artists..."
              aria-label="Search albums"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--t)",
                fontSize: "13px",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear album search"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--m)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "16px",
                  lineHeight: 1,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2px 8px 2px 14px",
              height: "38px",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--m)", whiteSpace: "nowrap" }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSort(e.target.value as AlbumSortOption)}
              aria-label="Sort albums by"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--t)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="title" style={{ background: "#1c1411", color: "#fff" }}>
                Title
              </option>
              <option value="artist" style={{ background: "#1c1411", color: "#fff" }}>
                Artist
              </option>
              <option value="releaseYear" style={{ background: "#1c1411", color: "#fff" }}>
                Release Year
              </option>
              <option value="trackCount" style={{ background: "#1c1411", color: "#fff" }}>
                Track Count
              </option>
            </select>

            <button
              type="button"
              onClick={() => setSort(sortBy)}
              aria-label={`Sort direction: ${sortDirection === "asc" ? "Ascending" : "Descending"}`}
              title={`Switch to ${sortDirection === "asc" ? "descending" : "ascending"}`}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                padding: "4px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
              }}
            >
              {sortDirection === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
