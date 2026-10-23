interface AlbumDiscHeaderProps {
  discNumber: number;
}

export function AlbumDiscHeader({ discNumber }: AlbumDiscHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 8px 8px",
        marginTop: "8px",
        color: "var(--m)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: ".06em",
          color: "var(--t)",
          textTransform: "uppercase",
        }}
      >
        <svg className="i" width="16" height="16" aria-hidden="true" style={{ color: "var(--accent)" }}>
          <use href="#disc" />
        </svg>
        <span>Disc {discNumber}</span>
      </div>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "linear-gradient(90deg, rgba(255, 255, 255, 0.12), transparent)",
        }}
      />
    </div>
  );
}
