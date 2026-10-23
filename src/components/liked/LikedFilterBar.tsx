import type { ChangeEvent } from "react";
import {
  useLikedFilterQuery,
  useLikedSongsStore,
  useLikedSortState,
} from "../../store/useLikedSongsStore";
import type { LikedSortColumn } from "../../types/liked";

export function LikedFilterBar() {
  const filterQuery = useLikedFilterQuery();
  const sortState = useLikedSortState();
  const setFilterQuery = useLikedSongsStore((state) => state.setFilterQuery);
  const setSortColumn = useLikedSongsStore((state) => state.setSortColumn);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(e.target.value);
  };

  const handleClear = () => {
    setFilterQuery("");
  };

  const sortOptions: { label: string; column: LikedSortColumn }[] = [
    { label: "Date Liked", column: "dateLiked" },
    { label: "Title", column: "title" },
    { label: "Artist", column: "artist" },
    { label: "Album", column: "album" },
    { label: "Duration", column: "durationSeconds" },
  ];

  return (
    <section
      aria-label="Filter and sort liked songs"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        padding: "4px 0",
      }}
    >
      {/* Search Input Box */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flex: "1 1 280px",
          maxWidth: "420px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--m)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "14px",
            pointerEvents: "none",
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          value={filterQuery}
          onChange={handleQueryChange}
          placeholder="Filter liked songs by title, artist, or album..."
          aria-label="Filter liked songs"
          style={{
            width: "100%",
            padding: "9px 36px 9px 40px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            color: "var(--t)",
            fontSize: "13px",
            outline: "none",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
        />

        {filterQuery.length > 0 && (
          <button
            onClick={handleClear}
            aria-label="Clear filter search"
            style={{
              position: "absolute",
              right: "12px",
              background: "none",
              border: 0,
              padding: "4px",
              color: "var(--m)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort selection pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--m)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          Sort:
        </span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {sortOptions.map((opt) => {
            const isSelected = sortState.column === opt.column;
            return (
              <button
                key={opt.column}
                onClick={() => setSortColumn(opt.column)}
                aria-label={`Sort by ${opt.label} ${isSelected ? sortState.direction : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected
                    ? "rgba(240, 169, 130, 0.18)"
                    : "rgba(255, 255, 255, 0.04)",
                  color: isSelected ? "var(--accent)" : "var(--m)",
                  border: isSelected
                    ? "1px solid rgba(240, 169, 130, 0.35)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {opt.label}
                {isSelected && (
                  <span style={{ fontSize: "10px" }}>
                    {sortState.direction === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
