import { exploreGenres } from "../../data/searchFixtures";
import { useSearchStore } from "../../store/useSearchStore";
import type { GenreCard } from "../../types/search";

export function ExploreGenresGrid() {
  const selectGenre = useSearchStore((state) => state.selectGenre);

  return (
    <section aria-label="Explore genres and moods" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <h2
          style={{
            margin: "0 0 6px 0",
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--t)",
            letterSpacing: "-0.01em",
          }}
        >
          Explore Genres & Moods
        </h2>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--m)" }}>
          Browse curated soundscapes tuned for Midnight listening
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "18px",
        }}
      >
        {exploreGenres.map((genre: GenreCard) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => selectGenre(genre)}
            aria-label={`Explore genre ${genre.name}, ${genre.trackCount} tracks`}
            style={{
              position: "relative",
              overflow: "hidden",
              height: "140px",
              borderRadius: "14px",
              background: genre.colorGradient,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.boxShadow = `0 10px 24px -6px ${genre.accentColor}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.35)";
            }}
          >
            {/* Header: Icon badge + track count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.35)",
                  color: genre.accentColor,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg className="i" width="16" height="16" aria-hidden="true">
                  <use href={`#${genre.icon}`} />
                </svg>
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--m)",
                  background: "rgba(0, 0, 0, 0.25)",
                  padding: "3px 8px",
                  borderRadius: "10px",
                  fontWeight: 500,
                }}
              >
                {genre.trackCount} tracks
              </span>
            </div>

            {/* Title & Decorative Corner Preview */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "var(--t)",
                  lineHeight: "1.2",
                  zIndex: 1,
                  maxWidth: "130px",
                }}
              >
                {genre.name}
              </span>

              {genre.coverUrl && (
                <img
                  src={genre.coverUrl}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "-12px",
                    bottom: "-12px",
                    width: "72px",
                    height: "72px",
                    borderRadius: "8px",
                    transform: "rotate(20deg)",
                    boxShadow: "0 6px 14px rgba(0, 0, 0, 0.5)",
                    opacity: 0.85,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
