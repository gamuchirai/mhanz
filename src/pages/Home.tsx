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
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-7 max-sm:gap-5 bg-[radial-gradient(900px_420px_at_72%_0,rgba(214,122,84,0.14),transparent_70%)] bg-[#110c0a]"
    >
      {/* Top Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2.5">
          <button
            aria-label="Back"
            className="w-10 h-10 rounded-full border border-white/10 bg-[#18110f] text-[#f4ebe4] grid place-items-center p-0 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <svg className="i w-[18px] h-[18px]" aria-hidden="true">
              <use href="#cl" />
            </svg>
          </button>
          <button
            aria-label="Forward"
            className="w-10 h-10 rounded-full border border-white/10 bg-[#18110f] text-[#f4ebe4] grid place-items-center p-0 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <svg className="i w-[18px] h-[18px]" aria-hidden="true">
              <use href="#cr" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-[500px] justify-end">
          <label className="flex items-center gap-2.5 w-full max-w-[340px] h-[42px] px-4 rounded-full border border-white/10 bg-[#18110f] text-[#a89b91] focus-within:border-[#f0a982]/50 transition-colors">
            <svg className="i w-[17px] h-[17px] shrink-0" aria-hidden="true">
              <use href="#search" />
            </svg>
            <input
              placeholder="Search songs, artists, playlists..."
              aria-label="Search songs, artists, playlists"
              onClick={() => onNavigate?.("Search")}
              onFocus={() => onNavigate?.("Search")}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[#f4ebe4] text-[13px] placeholder-[#a89b91]"
            />
          </label>
          <button
            aria-label="Notifications"
            className="bg-transparent border-0 p-2 text-[#f4ebe4] hover:text-[#f0a982] grid place-items-center cursor-pointer transition-colors"
          >
            <svg className="i w-5 h-5" aria-hidden="true">
              <use href="#bell" />
            </svg>
          </button>
          <button
            aria-label="Ask for a recommendation"
            className="w-10 h-10 rounded-full border border-[#f0a982] bg-[#f0a982]/10 text-[#f0a982] hover:bg-[#f0a982]/20 grid place-items-center p-0 cursor-pointer transition-colors"
          >
            <svg className="i w-[18px] h-[18px]" aria-hidden="true">
              <use href="#spark" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Featured Showcase */}
      <HeroBanner item={showcaseItem} />

      {/* Curated Grid Section */}
      <CuratedGrid cards={curatedCollections} onNavigate={onNavigate} />

      {/* Recently Played and Popular Tracks Section */}
      <section className="grid grid-cols-[1fr_360px] max-xl:grid-cols-1 gap-12 max-lg:gap-8">
        <RecentCarousel items={recentPlays} />
        <TrackTable tracks={popularTracks} />
      </section>
    </main>
  );
}
