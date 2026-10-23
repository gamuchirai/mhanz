import { useActiveArtist, useActiveArtistId, useArtistStore } from "../store/useArtistStore";
import { ArtistHeader } from "../components/artists/ArtistHeader";
import { ArtistGrid } from "../components/artists/ArtistGrid";
import { ArtistProfileBanner } from "../components/artists/ArtistProfileBanner";
import { ArtistPopularTracks } from "../components/artists/ArtistPopularTracks";
import { ArtistDiscography } from "../components/artists/ArtistDiscography";
import { ArtistBioCard } from "../components/artists/ArtistBioCard";

interface ArtistsPageProps {
  onNavigate?: (nav: string) => void;
}

export function Artists({ onNavigate }: ArtistsPageProps = {}) {
  const activeArtistId = useActiveArtistId();
  const activeArtist = useActiveArtist();
  const setActiveArtistId = useArtistStore((state) => state.setActiveArtistId);

  return (
    <main
      role="main"
      aria-label="Artists screen"
      style={{
        gridColumn: 2,
        gridRow: 1,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 32px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        background:
          "radial-gradient(1000px 480px at 70% 0, rgba(214, 122, 84, 0.12), transparent 70%), #110c0a",
      }}
    >
      {!activeArtistId ? (
        <>
          <ArtistHeader />
          <ArtistGrid />
        </>
      ) : !activeArtist ? (
        /* Invalid or unknown artist ID fallback */
        <div
          role="status"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 24px",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <h2 style={{ color: "var(--t)", margin: 0, fontSize: "20px" }}>Artist Not Found</h2>
          <p style={{ color: "var(--m)", margin: 0, fontSize: "14px" }}>
            The requested artist profile could not be located in your library.
          </p>
          <button
            type="button"
            onClick={() => setActiveArtistId(null)}
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "var(--accent)",
              color: "#18110f",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Return to Artists Grid
          </button>
        </div>
      ) : (
        <>
          <ArtistProfileBanner artist={activeArtist} />
          <ArtistPopularTracks artistId={activeArtist.id} />
          <ArtistDiscography artistId={activeArtist.id} onNavigate={onNavigate} />
          <ArtistBioCard artist={activeArtist} />
        </>
      )}
    </main>
  );
}
