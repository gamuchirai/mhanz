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
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "20px",
        width: "100%",
        paddingBottom: "32px",
      }}
    >
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </section>
  );
}
