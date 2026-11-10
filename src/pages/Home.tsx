import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { HeroBanner } from "../components/home/HeroBanner";
import { CuratedGrid } from "../components/home/CuratedGrid";
import { RecommendationsGrid } from "../components/home/RecommendationsGrid";
import { RecentCarousel } from "../components/home/RecentCarousel";
import { TrackTable } from "../components/home/TrackTable";
import {
  useCuratedCollections,
  useLibraryTrackCount,
  usePlayerStore,
  usePopularTracks,
  useRecentPlays,
} from "../store/usePlayerStore";
import { usePlaylistStore } from "../store/usePlaylistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useRecommendationsStore } from "../store/useRecommendationsStore";
import { showcaseItem } from "../data/homeFixtures";
import type { ShowcaseItem } from "../types/discovery";

interface HomeProps {
  onNavigate?: (nav: string) => void;
}

export function Home({ onNavigate }: HomeProps = {}) {
  const curatedCollections = useCuratedCollections();
  const recentPlays = useRecentPlays();
  const popularTracks = usePopularTracks();
  const libraryTrackCount = useLibraryTrackCount();
  const initializeHomeDiscovery = usePlayerStore((state) => state.initializeHomeDiscovery);

  useEffect(() => {
    initializeHomeDiscovery().catch(() => {});
    const pStore = usePlaylistStore.getState();
    if (!pStore.isLoaded && !pStore.isLoading) {
      pStore.initializePlaylists().catch(() => {});
    }
    const aStore = useAlbumStore.getState();
    if (!aStore.isLoaded && !aStore.isLoading) {
      aStore.initializeAlbums().catch(() => {});
    }
    const rStore = useRecommendationsStore.getState();
    if (!rStore.isLoaded && !rStore.isLoading) {
      rStore.initializeRecommendations().catch(() => {});
    }
  }, [initializeHomeDiscovery]);

  const topTrack = popularTracks[0];
  const heroItem: ShowcaseItem = topTrack
    ? {
        id: `hero-${topTrack.id}`,
        targetId: topTrack.id,
        actionType: "play_track",
        badge: "TOP PLAYED",
        headline: topTrack.title,
        subtitle: topTrack.artist,
        description: topTrack.album
          ? `From the album ${topTrack.album}`
          : "Most played song in your local music library",
        track: topTrack,
        bannerImageUrl: topTrack.artworkUrl || showcaseItem.bannerImageUrl,
      }
    : showcaseItem;

  const collectionsCards = isTauri()
    ? undefined
    : curatedCollections.length > 0
      ? curatedCollections
      : undefined;

  return (
    <main
      role="main"
      aria-label="Home and discovery screen"
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-7 max-sm:gap-5 bg-[radial-gradient(900px_420px_at_72%_0,rgba(214,122,84,0.14),transparent_70%)] bg-[#110c0a]"
    >
      {/* Hero Featured Showcase */}
      <HeroBanner item={heroItem} />

      {/* Based on Your Listening Section (AC-1) */}
      <RecommendationsGrid onNavigate={onNavigate} />

      {/* Your Collections Section */}
      <CuratedGrid cards={collectionsCards} title="Your Collections" onNavigate={onNavigate} />

      {/* Recently Played and Popular Tracks Section */}
      <section className="grid grid-cols-[1fr_360px] max-xl:grid-cols-1 gap-12 max-lg:gap-8">
        <RecentCarousel
          items={recentPlays}
          libraryTrackCount={libraryTrackCount}
          onNavigate={onNavigate}
        />
        <TrackTable tracks={popularTracks} />
      </section>
    </main>
  );
}
