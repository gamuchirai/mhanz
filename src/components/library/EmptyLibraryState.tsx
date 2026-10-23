import { useLibraryStore } from "../../store/useLibraryStore";

export function EmptyLibraryState() {
  const openAddFolderModal = useLibraryStore((state) => state.openAddFolderModal);

  return (
    <div
      role="region"
      aria-label="Empty library state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        borderRadius: "16px",
        background:
          "radial-gradient(circle at 50% 30%, rgba(240, 169, 130, 0.08), transparent 70%), rgba(24, 17, 15, 0.6)",
        border: "1px dashed rgba(255, 255, 255, 0.1)",
        textAlign: "center",
        gap: "20px",
        maxWidth: "600px",
        margin: "24px auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "68px",
          height: "68px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(240, 169, 130, 0.2), rgba(240, 169, 130, 0.04))",
          border: "1px solid rgba(240, 169, 130, 0.3)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <svg
          className="i"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--t)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Build Your Local Music Collection
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "var(--m)",
            margin: 0,
            maxWidth: "440px",
            lineHeight: 1.6,
          }}
        >
          Add directories containing your favorite MP3, FLAC, WAV, and AAC music files. Mumhanzi
          indexes album metadata and artwork for seamless local playback.
        </p>
      </div>

      <button
        onClick={openAddFolderModal}
        aria-label="Add your first music folder"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 26px",
          borderRadius: "24px",
          background: "var(--accent)",
          color: "#18110f",
          border: 0,
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(240, 169, 130, 0.25)",
          transition: "transform 0.15s ease, filter 0.15s ease",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 700 }}>+</span>
        <span>Add Music Folder</span>
      </button>

      {/* Feature perks */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "20px",
          fontSize: "12px",
          color: "var(--m)",
          marginTop: "10px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--accent)" }}>✓</span>
          <span>Instant Indexing</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--accent)" }}>✓</span>
          <span>FLAC & MP3 Support</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--accent)" }}>✓</span>
          <span>100% Offline & Private</span>
        </div>
      </div>
    </div>
  );
}
