interface EmptyLikedStateProps {
  onExploreMusic?: () => void;
}

export function EmptyLikedState({ onExploreMusic }: EmptyLikedStateProps) {
  return (
    <section
      role="region"
      aria-label="Empty liked songs collection"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px",
        textAlign: "center",
        borderRadius: "16px",
        background:
          "radial-gradient(400px 240px at 50% 30%, rgba(240, 169, 130, 0.08), transparent 70%), rgba(24, 17, 15, 0.4)",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
        margin: "12px 0 24px",
        gap: "16px",
      }}
    >
      {/* Glowing Heart Icon Container */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "rgba(240, 169, 130, 0.12)",
          border: "1px solid rgba(240, 169, 130, 0.25)",
          boxShadow: "0 8px 24px rgba(240, 169, 130, 0.2)",
          display: "grid",
          placeItems: "center",
          color: "var(--accent)",
          marginBottom: "4px",
        }}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--t)",
        }}
      >
        Songs you like will appear here
      </h2>

      <p
        style={{
          margin: 0,
          fontSize: "14px",
          color: "var(--m)",
          maxWidth: "400px",
          lineHeight: 1.5,
        }}
      >
        Save your favorite tracks by clicking the heart icon on any song across Home, Search, or
        Your Library.
      </p>

      {onExploreMusic && (
        <button
          onClick={onExploreMusic}
          aria-label="Explore music"
          style={{
            marginTop: "12px",
            padding: "10px 24px",
            borderRadius: "24px",
            background: "var(--accent)",
            color: "#1a0e08",
            border: 0,
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(240, 169, 130, 0.3)",
            transition: "transform 0.15s ease, opacity 0.15s ease",
          }}
        >
          Explore Music
        </button>
      )}
    </section>
  );
}
