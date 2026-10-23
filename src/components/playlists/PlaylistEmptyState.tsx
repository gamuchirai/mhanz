import { usePlaylistStore } from "../../store/usePlaylistStore";

export function PlaylistEmptyState() {
  const setAddSongsDrawerOpen = usePlaylistStore((state) => state.setAddSongsDrawerOpen);

  return (
    <div
      role="region"
      aria-label="Empty playlist state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "56px 24px",
        textAlign: "center",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "16px",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
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
        }}
      >
        <svg className="i" width="28" height="28" aria-hidden="true">
          <use href="#list" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "var(--t)", fontWeight: 600 }}>
          This playlist is empty
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--m)",
            maxWidth: "380px",
            lineHeight: 1.5,
          }}
        >
          Start curating your mix by adding songs from your library and discovery collections.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setAddSongsDrawerOpen(true)}
        aria-label="Add songs to empty playlist"
        style={{
          marginTop: "6px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 22px",
          borderRadius: "22px",
          background: "var(--accent)",
          color: "#18110f",
          border: 0,
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
          transition: "transform 0.15s ease",
        }}
      >
        <svg className="i" width="16" height="16" aria-hidden="true">
          <use href="#plus" />
        </svg>
        <span>Add Songs</span>
      </button>
    </div>
  );
}
