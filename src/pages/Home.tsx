import { HeroBanner } from "../components/home/HeroBanner";
import { CuratedGrid } from "../components/home/CuratedGrid";
import { RecentCarousel } from "../components/home/RecentCarousel";
import { TrackTable } from "../components/home/TrackTable";
import { useCuratedCollections, usePopularTracks, useRecentPlays } from "../store/usePlayerStore";
import { showcaseItem } from "../data/homeFixtures";

interface HomeProps {
  onNavigate?: (nav: string) => void;
}

export function Home({ onNavigate }: HomeProps = {}) {
  const curatedCollections = useCuratedCollections();
  const recentPlays = useRecentPlays();
  const popularTracks = usePopularTracks();

  return (
    <main
      role="main"
      aria-label="Home and discovery screen"
      style={{
        gridColumn: 2,
        gridRow: 1,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 32px 8px",
        display: "flex",
        flexDirection: "column",
        gap: "30px",
        background:
          "radial-gradient(900px 420px at 72% 0,rgba(214,122,84,.14),transparent 70%),#110c0a",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            aria-label="Back"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--l)",
              background: "var(--p)",
              color: "var(--t)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#cl" />
            </svg>
          </button>
          <button
            aria-label="Forward"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--l)",
              background: "var(--p)",
              color: "var(--t)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#cr" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "340px",
              height: "42px",
              boxSizing: "border-box",
              padding: "0 16px",
              borderRadius: "21px",
              border: "1px solid var(--l)",
              background: "var(--p)",
              color: "var(--m)",
            }}
          >
            <svg className="i" width="17" height="17" aria-hidden="true">
              <use href="#search" />
            </svg>
            <input
              placeholder="Search songs, artists, playlists..."
              aria-label="Search songs, artists, playlists"
              onClick={() => onNavigate?.("Search")}
              onFocus={() => onNavigate?.("Search")}
              style={{
                flex: 1,
                minWidth: 0,
                background: "none",
                border: 0,
                outline: 0,
                color: "var(--t)",
                font: "inherit",
                fontSize: "13px",
              }}
            />
          </label>
          <button
            aria-label="Notifications"
            style={{
              background: "none",
              border: 0,
              padding: "8px",
              color: "var(--t)",
              display: "grid",
              cursor: "pointer",
            }}
          >
            <svg className="i" width="20" height="20" aria-hidden="true">
              <use href="#bell" />
            </svg>
          </button>
          <button
            aria-label="Ask for a recommendation"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--accent)",
              background: "rgba(240,169,130,.1)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#spark" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Featured Showcase */}
      <HeroBanner item={showcaseItem} />

      {/* Curated Grid Section */}
      <CuratedGrid cards={curatedCollections} />

      {/* Recently Played and Popular Tracks Section */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "48px",
        }}
      >
        <RecentCarousel items={recentPlays} />
        <TrackTable tracks={popularTracks} />
      </section>
    </main>
  );
}
