import { useArtistStore, useArtists } from "../../store/useArtistStore";
import type { ArtistSortOption } from "../../types/artists";

export function ArtistHeader() {
  const artists = useArtists();
  const allArtists = useArtistStore((state) => state.artists);
  const searchQuery = useArtistStore((state) => state.searchQuery);
  const setSearchQuery = useArtistStore((state) => state.setSearchQuery);
  const sortBy = useArtistStore((state) => state.sortBy);
  const sortDirection = useArtistStore((state) => state.sortDirection);
  const setSortBy = useArtistStore((state) => state.setSortBy);
  const toggleSortDirection = useArtistStore((state) => state.toggleSortDirection);

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
            Library Artists
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
              Artists
            </h1>
            <span
              style={{
                fontSize: "14px",
                color: "var(--m)",
                fontWeight: 400,
              }}
            >
              {searchQuery
                ? `${artists.length} of ${allArtists.length} artists`
                : `${allArtists.length} ${allArtists.length === 1 ? "artist" : "artists"}`}
            </span>
          </div>
        </div>

        {/* Controls: Search, Sort Selector, Direction Toggle */}
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
              placeholder="Search artists or genres..."
              aria-label="Search artists"
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
                aria-label="Clear artist search"
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
              onChange={(e) => setSortBy(e.target.value as ArtistSortOption)}
              aria-label="Sort artists by"
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
              <option value="popularity" style={{ background: "#1c1411", color: "#fff" }}>
                Most Played
              </option>
              <option value="name" style={{ background: "#1c1411", color: "#fff" }}>
                Name
              </option>
              <option value="albumCount" style={{ background: "#1c1411", color: "#fff" }}>
                Releases / Albums
              </option>
            </select>

            {/* Sort Direction Toggle Button */}
            <button
              type="button"
              onClick={toggleSortDirection}
              aria-label={`Toggle sort direction (currently ${
                sortDirection === "asc" ? "ascending" : "descending"
              })`}
              title={sortDirection === "asc" ? "Ascending order" : "Descending order"}
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                color: "var(--accent)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                lineHeight: 1,
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {sortDirection === "asc" ? "▲" : "▼"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
