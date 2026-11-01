import { useArtists } from "../../store/useArtistStore";
import { ArtistCard } from "./ArtistCard";
import { ArtistEmptyState } from "./ArtistEmptyState";

interface ArtistGridProps {
  onNavigate?: (nav: string) => void;
}

export function ArtistGrid({ onNavigate }: ArtistGridProps = {}) {
  const artists = useArtists();

  if (artists.length === 0) {
    return <ArtistEmptyState onNavigate={onNavigate} />;
  }

  return (
    <section
      aria-label="Artists overview grid"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3 w-full pb-8"
    >
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </section>
  );
}
