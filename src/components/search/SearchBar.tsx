import { useRef, useEffect } from "react";
import { useSearchStore } from "../../store/useSearchStore";

interface SearchBarProps {
  onClearFocus?: () => void;
}

export function SearchBar({ onClearFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useSearchStore((state) => state.query);
  const isSearching = useSearchStore((state) => state.isSearching);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const setQuery = useSearchStore((state) => state.setQuery);
  const clearSearch = useSearchStore((state) => state.clearSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (query.length > 0 || document.activeElement === inputRef.current) {
          e.preventDefault();
          clearSearch();
          inputRef.current?.focus();
          onClearFocus?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, clearSearch, onClearFocus]);

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
    onClearFocus?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {/* Main Search Input Bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "720px",
          height: "48px",
          borderRadius: "24px",
          background: "var(--p)",
          border: "1px solid var(--l)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
          padding: "0 16px",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {/* Search Icon */}
        <svg
          className="i"
          width="18"
          height="18"
          style={{ color: "var(--accent)", marginRight: "12px", flexShrink: 0 }}
          aria-hidden="true"
        >
          <use href="#search" />
        </svg>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums, or genres..."
          aria-label="Search music"
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            outline: "none",
            color: "var(--t)",
            fontSize: "15px",
            fontFamily: "inherit",
          }}
        />

        {/* Spinner or Clear Button */}
        {isSearching ? (
          <div
            aria-label="Searching indicator"
            style={{
              width: "18px",
              height: "18px",
              border: "2px solid rgba(240, 169, 130, 0.2)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginRight: "6px",
            }}
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: 0,
              borderRadius: "50%",
              width: "26px",
              height: "26px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--t)",
              padding: 0,
              transition: "background 0.15s ease",
            }}
          >
            <svg
              className="i"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Recent Search Chips */}
      {recentSearches.length > 0 && (
        <div
          role="region"
          aria-label="Recent searches"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "12px",
            color: "var(--m)",
          }}
        >
          <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Recent:
          </span>
          {recentSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term, true)}
              aria-label={`Recent search: ${term}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--l)",
                color: "var(--t)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "rgba(240, 169, 130, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--l)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              }}
            >
              <svg className="i" width="10" height="10" aria-hidden="true">
                <use href="#search" />
              </svg>
              <span>{term}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearRecentSearches}
            aria-label="Clear recent searches"
            style={{
              background: "none",
              border: 0,
              color: "var(--m)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "4px 8px",
              textDecoration: "underline",
              opacity: 0.7,
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
