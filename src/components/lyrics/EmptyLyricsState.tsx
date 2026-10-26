interface EmptyLyricsStateProps {
  plainText?: string;
  songTitle?: string;
}

export function EmptyLyricsState({ plainText, songTitle }: EmptyLyricsStateProps) {
  if (plainText && plainText.trim().length > 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "32px 16px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            letterSpacing: ".1em",
            color: "var(--accent)",
            fontWeight: 600,
            marginBottom: "24px",
            textTransform: "uppercase",
          }}
        >
          Unsynchronised Lyrics
        </span>
        <div
          style={{
            whiteSpace: "pre-line",
            fontSize: "18px",
            lineHeight: 2,
            color: "var(--t)",
            fontFamily: "var(--font-serif, Georgia, serif)",
          }}
        >
          {plainText}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "360px",
        textAlign: "center",
        color: "var(--m)",
        gap: "18px",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(240, 169, 130, 0.08)",
          border: "1px solid rgba(240, 169, 130, 0.2)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg className="i" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>

      <div>
        <h3 style={{ fontSize: "18px", color: "var(--t)", margin: "0 0 8px 0", fontWeight: 600 }}>
          Timed lyrics are unavailable
        </h3>
        <p style={{ margin: 0, fontSize: "14px", maxWidth: "340px", lineHeight: 1.5 }}>
          {songTitle
            ? `We do not have synchronised words for "${songTitle}" yet.`
            : "Timed lyrics are not available for this track."}
        </p>
      </div>
    </div>
  );
}
