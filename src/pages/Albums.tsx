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
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-6 bg-[radial-gradient(1000px_480px_at_70%_0,rgba(214,122,84,0.12),transparent_70%)] bg-[#110c0a]"
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
