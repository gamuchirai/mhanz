import type { Artist } from "../../types/artists";
import { formatWithCommas } from "../../utils/avatarUtils";

interface ArtistBioCardProps {
  artist: Artist;
}

export function ArtistBioCard({ artist }: ArtistBioCardProps) {
  return (
    <section
      aria-label={`About ${artist.name}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        padding: "24px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--t)",
          letterSpacing: "-0.01em",
        }}
      >
        About
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(200px, 280px)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Biography Paragraph */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.6,
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            {artist.bio}
          </p>

          {/* Genres Tags */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--m)" }}>Genres:</span>
            {artist.genres.map((genre) => (
              <span
                key={genre}
                style={{
                  fontSize: "12px",
                  color: "var(--accent)",
                  background: "rgba(240, 169, 130, 0.08)",
                  border: "1px solid rgba(240, 169, 130, 0.15)",
                  padding: "2px 10px",
                  borderRadius: "12px",
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--t)" }}>
              {formatWithCommas(artist.monthlyListeners)}
            </div>
            <div style={{ fontSize: "12px", color: "var(--m)" }}>Monthly Listeners</div>
          </div>

          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }} />

          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--t)" }}>
              {formatWithCommas(artist.followerCount)}
            </div>
            <div style={{ fontSize: "12px", color: "var(--m)" }}>Followers</div>
          </div>
        </div>
      </div>
    </section>
  );
}
