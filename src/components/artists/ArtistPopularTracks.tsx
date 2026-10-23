import { useArtistStore, useArtistPopularTracks } from "../../store/useArtistStore";
import { ArtistPopularTrackRow } from "./ArtistPopularTrackRow";
import type { ArtistPopularTrack } from "../../types/artists";

interface ArtistPopularTracksProps {
  artistId: string;
}

export function ArtistPopularTracks({ artistId }: ArtistPopularTracksProps) {
  const tracks = useArtistPopularTracks(artistId);
  const isPopularExpanded = useArtistStore((state) => state.isPopularExpanded);
  const togglePopularExpanded = useArtistStore((state) => state.togglePopularExpanded);
  const playArtistTopTracks = useArtistStore((state) => state.playArtistTopTracks);

  if (tracks.length === 0) {
    return null;
  }

  // Display top 5 or up to 10 tracks
  const displayedTracks = isPopularExpanded ? tracks.slice(0, 10) : tracks.slice(0, 5);
  const hasMoreTracks = tracks.length > 5;

  const handlePlayTrack = (_track: ArtistPopularTrack, index: number) => {
    playArtistTopTracks(artistId, index);
  };

  return (
    <section
      aria-label="Popular tracks"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        width: "100%",
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
        Popular
      </h2>

      {/* Popular Tracks Table Header */}
      <div
        role="row"
        aria-label="Track list header"
        style={{
          display: "grid",
          gridTemplateColumns: "36px 48px 1fr 140px 60px 40px 36px",
          alignItems: "center",
          padding: "6px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          color: "var(--m)",
          fontSize: "12px",
          fontWeight: 500,
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ textAlign: "center" }}>#</span>
        <span />
        <span>Title</span>
        <span style={{ textAlign: "right" }}>Streams</span>
        <span style={{ textAlign: "right" }}>
          <svg className="i" width="14" height="14" aria-hidden="true">
            <path d="M12 6v6l4 2" stroke="currentColor" fill="none" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" />
          </svg>
        </span>
        <span />
        <span />
      </div>

      {/* Tracks List */}
      <div
        role="feed"
        aria-label="Popular tracks list"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {displayedTracks.map((track, idx) => (
          <ArtistPopularTrackRow
            key={track.id}
            track={track}
            rank={idx + 1}
            onPlay={() => handlePlayTrack(track, idx)}
          />
        ))}
      </div>

      {/* Show More / Show Less Button Toggle (AC-8) */}
      {hasMoreTracks && (
        <div style={{ marginTop: "6px" }}>
          <button
            type="button"
            onClick={togglePopularExpanded}
            aria-label={isPopularExpanded ? "Show fewer popular songs" : "Show more popular songs"}
            style={{
              background: "none",
              border: "none",
              padding: "6px 12px",
              color: "var(--m)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
          >
            {isPopularExpanded ? "Show Less" : "Show More"}
          </button>
        </div>
      )}
    </section>
  );
}
