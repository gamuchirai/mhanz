import { useAlbumStore } from "../../store/useAlbumStore";

export function AlbumEmptyState() {
  const searchQuery = useAlbumStore((state) => state.searchQuery);
  const setSearchQuery = useAlbumStore((state) => state.setSearchQuery);

  return (
    <div
      role="status"
      aria-label="No albums found"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
        textAlign: "center",
        gap: "16px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(240, 169, 130, 0.08)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg className="i" width="28" height="28" aria-hidden="true">
          <use href="#disc" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "var(--t)", fontWeight: 600 }}>
          {searchQuery ? `No albums matching "${searchQuery}"` : "No albums in library"}
        </h3>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--m)", maxWidth: "400px" }}>
          {searchQuery
            ? "Check for typos or try searching by artist name or genre."
            : "Albums added to your monitored folders or created releases will appear here."}
        </p>
      </div>

      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            background: "var(--accent)",
            color: "#18110f",
            border: "none",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}
