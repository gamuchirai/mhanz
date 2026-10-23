import { useArtists } from "../../store/useArtistStore";
import { ArtistCard } from "./ArtistCard";
import { ArtistEmptyState } from "./ArtistEmptyState";

export function ArtistGrid() {
  const artists = useArtists();

  if (artists.length === 0) {
    return <ArtistEmptyState />;
  }

  return (
    <section
      aria-label="Artists overview grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "20px",
        width: "100%",
        paddingBottom: "32px",
      }}
    >
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </section>
  );
}
