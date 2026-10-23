import { exploreGenres } from "../../data/searchFixtures";
import { useSearchStore } from "../../store/useSearchStore";

export function EmptySearchState() {
  const query = useSearchStore((state) => state.query);
  const clearSearch = useSearchStore((state) => state.clearSearch);
  const selectGenre = useSearchStore((state) => state.selectGenre);

  const topGenres = exploreGenres.slice(0, 4);

  return (
    <div
      role="region"
      aria-label="No search results"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
        background: "rgba(24, 17, 15, 0.4)",
        border: "1px dashed var(--l)",
        borderRadius: "16px",
        margin: "12px 0",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(240, 169, 130, 0.1)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
          marginBottom: "16px",
        }}
      >
        <svg className="i" width="26" height="26" aria-hidden="true">
          <use href="#search" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "var(--t)",
          margin: "0 0 8px 0",
        }}
      >
        No results found for &ldquo;{query}&rdquo;
      </h3>

      <p
        style={{
          margin: "0 0 24px 0",
          fontSize: "14px",
          color: "var(--m)",
          maxWidth: "420px",
          lineHeight: "1.5",
        }}
      >
        Check for typos, try broader keywords, or search for artist names and albums. You can also explore popular genres below.
      </p>

      {/* Quick Jump Buttons to Top Genres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "24px" }}>
        {topGenres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => selectGenre(genre)}
            style={{
              padding: "7px 16px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--l)",
              color: "var(--t)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "rgba(240, 169, 130, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--l)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            {genre.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={clearSearch}
        style={{
          padding: "9px 22px",
          borderRadius: "20px",
          background: "var(--accent)",
          color: "#1c0f09",
          border: 0,
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Clear Search & Explore
      </button>
    </div>
  );
}
