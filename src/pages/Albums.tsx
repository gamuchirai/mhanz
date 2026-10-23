import { useActiveAlbum } from "../store/useAlbumStore";
import { AlbumHeader } from "../components/albums/AlbumHeader";
import { AlbumGrid } from "../components/albums/AlbumGrid";
import { AlbumDetailBanner } from "../components/albums/AlbumDetailBanner";
import { AlbumTrackList } from "../components/albums/AlbumTrackList";

interface AlbumsPageProps {
  onNavigate?: (nav: string) => void;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
}

export function Albums({ onNavigate, onNavigateArtist }: AlbumsPageProps = {}) {
  const activeAlbum = useActiveAlbum();

  return (
    <main
      role="main"
      aria-label="Albums screen"
      style={{
        gridColumn: 2,
        gridRow: 1,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 32px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        background:
          "radial-gradient(1000px 480px at 70% 0, rgba(214, 122, 84, 0.12), transparent 70%), #110c0a",
      }}
    >
      {!activeAlbum ? (
        <>
          <AlbumHeader />
          <AlbumGrid />
        </>
      ) : (
        <>
          <AlbumDetailBanner
            album={activeAlbum}
            onNavigate={onNavigate}
            onNavigateArtist={onNavigateArtist}
          />
          <AlbumTrackList album={activeAlbum} />
        </>
      )}
    </main>
  );
}
