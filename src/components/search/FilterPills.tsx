import { useSearchStore } from "../../store/useSearchStore";
import type { SearchCategory } from "../../types/search";

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "albums", label: "Albums" },
  { id: "artists", label: "Artists" },
  { id: "playlists", label: "Playlists" },
  { id: "genres", label: "Genres" },
];

export function FilterPills() {
  const activeCategory = useSearchStore((state) => state.activeCategory);
  const setCategory = useSearchStore((state) => state.setCategory);
  const query = useSearchStore((state) => state.query);
  const results = useSearchStore((state) => state.results);

  const getCount = (cat: SearchCategory): number | null => {
    if (!query.trim()) return null;
    switch (cat) {
      case "all":
        return results.totalMatches;
      case "songs":
        return results.tracks.length;
      case "albums":
        return results.albums.length;
      case "artists":
        return results.artists.length;
      case "playlists":
        return results.playlists.length;
      case "genres":
        return results.genres.length;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Search category filters"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        overflowX: "auto",
        padding: "4px 0",
        scrollbarWidth: "none",
      }}
    >
      {CATEGORIES.map(({ id, label }) => {
        const isActive = activeCategory === id;
        const count = getCount(id);

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`search-panel-${id}`}
            onClick={() => setCategory(id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              borderRadius: "20px",
              border: isActive ? "1px solid var(--accent)" : "1px solid var(--l)",
              background: isActive
                ? "linear-gradient(90deg, rgba(240,169,130,0.22), rgba(240,169,130,0.06))"
                : "rgba(255, 255, 255, 0.03)",
              color: isActive ? "var(--t)" : "var(--m)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "var(--t)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "var(--l)";
                e.currentTarget.style.color = "var(--m)";
              }
            }}
          >
            <span>{label}</span>
            {count !== null && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.08)",
                  color: isActive ? "#1c0f09" : "var(--m)",
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
