import { useAlbums } from "../../store/useAlbumStore";
import { AlbumCard } from "./AlbumCard";
import { AlbumEmptyState } from "./AlbumEmptyState";

export function AlbumGrid() {
  const albums = useAlbums();

  if (albums.length === 0) {
    return <AlbumEmptyState />;
  }

  return (
    <section
      aria-label="Albums overview grid"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3 w-full pb-8"
    >
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </section>
  );
}
