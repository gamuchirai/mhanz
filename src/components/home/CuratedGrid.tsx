import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { CuratedCard } from "../../types/discovery";
import type { Playlist } from "../../types/playlist";
import type { Album } from "../../types/album";
import {
  useIsPlaylistsLoading,
  useIsPlaylistsLoaded,
  usePlaylistError,
  usePlaylistStore,
  usePlaylists,
} from "../../store/usePlaylistStore";
import {
  useAlbums,
  useAlbumError,
  useIsAlbumsLoaded,
  useIsAlbumsLoading,
  useAlbumStore,
} from "../../store/useAlbumStore";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useToastStore } from "../../store/useToastStore";

/**
 * Computes up to six collection cards with balanced slots (up to 3 playlists and 3 albums,
 * filling unused slots from the other type), preserving each store's sort order.
 * Qualifying playlists are displayed first, followed by library albums.
 */
export function computeYourCollectionsCards(
  playlists: Playlist[],
  albums: Album[]
): CuratedCard[] {
  const totalSlots = 6;
  const pCount = playlists.length;
  const aCount = albums.length;

  let pSlots: number;
  let aSlots: number;

  if (pCount <= 3 && aCount <= 3) {
    pSlots = pCount;
    aSlots = aCount;
  } else if (pCount <= 3) {
    pSlots = pCount;
    aSlots = Math.min(aCount, totalSlots - pSlots);
  } else if (aCount <= 3) {
    aSlots = aCount;
    pSlots = Math.min(pCount, totalSlots - aSlots);
  } else {
    pSlots = 3;
    aSlots = 3;
  }

  const selectedPlaylists = playlists.slice(0, pSlots);
  const selectedAlbums = albums.slice(0, aSlots);

  const playlistCards: CuratedCard[] = selectedPlaylists.map((p) => {
    const count = p.trackCount ?? 0;
    return {
      id: p.id,
      title: p.title,
      subtitle: p.description || (p.isCurated ? "Curated Playlist" : "Playlist"),
      coverUrl: p.coverUrl || "",
      trackCount: count,
      type: "playlist",
      tracks: [],
      accentGradient: p.coverGradient,
    };
  });

  const albumCards: CuratedCard[] = selectedAlbums.map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: a.artistName,
    coverUrl: a.coverUrl || "",
    trackCount: a.trackCount,
    type: "album",
    tracks: [],
    accentGradient: undefined,
  }));

  return [...playlistCards, ...albumCards];
}

export interface CuratedGridProps {
  cards?: CuratedCard[];
  title?: string;
  onNavigate?: (nav: string) => void;
}

export function CuratedGrid({
  cards: propCards,
  title = "Your Collections",
  onNavigate,
}: CuratedGridProps) {
  const playlists = usePlaylists();
  const albums = useAlbums();
  const isPlaylistsLoading = useIsPlaylistsLoading();
  const isAlbumsLoading = useIsAlbumsLoading();
  const isPlaylistsLoaded = useIsPlaylistsLoaded();
  const isAlbumsLoaded = useIsAlbumsLoaded();
  const playlistError = usePlaylistError();
  const albumError = useAlbumError();

  const initializePlaylists = usePlaylistStore((state) => state.initializePlaylists);
  const initializeAlbums = useAlbumStore((state) => state.initializeAlbums);

  // Derive visible cards
  let cards: CuratedCard[];
  if (propCards && propCards.length > 0) {
    cards = propCards;
  } else {
    const computed = computeYourCollectionsCards(playlists, albums);
    if (computed.length === 0 && !isTauri()) {
      // In browser preview or tests with fixture mock
      const storeCurated = usePlayerStore.getState().curatedCollections;
      cards = storeCurated.length > 0 ? storeCurated : [];
    } else {
      cards = computed;
    }
  }

  const areBothLoading = isPlaylistsLoading && isAlbumsLoading;
  const areBothLoaded = (isPlaylistsLoaded || !isTauri()) && (isAlbumsLoaded || !isTauri());
  const areBothEmpty = cards.length === 0 && !playlistError && !albumError;

  return (
    <section aria-label={title}>
      {/* Header with Title and See all link */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500, color: "var(--t)" }}>
            {title}
          </h2>
          <span style={{ fontSize: "12px", color: "var(--m)" }}>Made for you</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("Playlists")}
          aria-label="See all playlists"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            color: "var(--m)",
            fontSize: "13px",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
        >
          See all
        </button>
      </div>

      {/* Both sources loading skeleton state (AC-1, AC-3) */}
      {areBothLoading && cards.length === 0 ? (
        <div
          role="region"
          aria-label="Loading collections"
          className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <CollectionSkeletonCard key={i} />
          ))}
        </div>
      ) : areBothLoaded && areBothEmpty ? (
        /* Empty collections guidance state (AC-3) */
        <div
          role="region"
          aria-label="Empty collections guidance"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: "48px 24px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ color: "var(--t)", fontSize: "16px", fontWeight: 600 }}>
            No collections available yet
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--m)", maxWidth: "360px" }}>
            Create custom playlists or scan music folders in your library to populate your collections.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => onNavigate?.("Playlists")}
              aria-label="Open Playlists"
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                background: "var(--accent)",
                color: "#18110f",
                border: 0,
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Open Playlists
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("Your Library")}
              aria-label="Add Music"
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "var(--t)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontWeight: 500,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Add Music
            </button>
          </div>
        </div>
      ) : (
        /* Grid with independent source failure resilience (AC-2, AC-3) */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3">
          {/* Playlist error card if playlist query failed (AC-3) */}
          {playlistError && (
            <InlineRetryCard
              title="Failed to load playlists"
              error={playlistError}
              onRetry={() => initializePlaylists()}
              ariaLabel="Retry loading playlists"
            />
          )}

          {/* Cards: playlists first, then albums (AC-2) */}
          {cards.map((card) => (
            <CuratedCardItem
              key={`${card.type}-${card.id}`}
              card={card}
              onNavigate={onNavigate}
            />
          ))}

          {/* Album error card if album query failed (AC-3) */}
          {albumError && (
            <InlineRetryCard
              title="Failed to load albums"
              error={albumError}
              onRetry={() => initializeAlbums()}
              ariaLabel="Retry loading albums"
            />
          )}
        </div>
      )}
    </section>
  );
}

function CollectionSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse"
      style={{
        height: "150px",
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    />
  );
}

interface InlineRetryCardProps {
  title: string;
  error?: string | null;
  onRetry: () => void;
  ariaLabel: string;
}

function InlineRetryCard({ title, error, onRetry, ariaLabel }: InlineRetryCardProps) {
  return (
    <div
      role="alert"
      aria-label={title}
      style={{
        position: "relative",
        height: "150px",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "rgba(239, 68, 68, 0.06)",
        border: "1px dashed rgba(239, 68, 68, 0.3)",
      }}
    >
      <div>
        <div style={{ color: "#ff6b6b", fontSize: "13px", fontWeight: 600 }}>{title}</div>
        {error && (
          <div
            style={{
              color: "var(--m)",
              fontSize: "11px",
              marginTop: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {error}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        aria-label={ariaLabel}
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          borderRadius: "16px",
          background: "var(--accent)",
          color: "#18110f",
          border: 0,
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}

interface CuratedCardItemProps {
  card: CuratedCard;
  onNavigate?: (nav: string) => void;
}

function CuratedCardItem({ card, onNavigate }: CuratedCardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  const defaultBg =
    card.accentGradient ??
    "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#12141e,#2b2230 62%,#5a3630)";

  const handleCardClick = () => {
    if (card.type === "album") {
      useAlbumStore.getState().setActiveAlbumId(card.id);
      onNavigate?.("Albums");
    } else {
      usePlaylistStore.getState().setActivePlaylistId(card.id);
      onNavigate?.("Playlists");
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.trackCount === 0 && (!card.tracks || card.tracks.length === 0)) return;
    if (isPlayLoading) return;
    setIsPlayLoading(true);
    try {
      if (card.tracks && card.tracks.length > 0) {
        usePlayerStore.getState().playCollection(card.tracks, 0);
      } else if (card.type === "album") {
        await useAlbumStore.getState().playAlbum(card.id);
      } else {
        await usePlaylistStore.getState().playPlaylist(card.id, 0);
      }
    } catch (err) {
      console.warn("Failed to play collection:", err);
      useToastStore
        .getState()
        .addToast(
          `Failed to start playback: ${err instanceof Error ? err.message : String(err)}`,
          5000,
          "error"
        );
    } finally {
      setIsPlayLoading(false);
    }
  };

  const isPlayDisabled = card.trackCount === 0 && (!card.tracks || card.tracks.length === 0);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${card.title} ${card.type}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        height: "150px",
        borderRadius: "14px",
        overflow: "hidden",
        background: defaultBg,
        display: "block",
        cursor: "pointer",
        outline: "none",
        transform: isHovered ? "translateY(-3px)" : "none",
        boxShadow: isHovered ? "0 12px 30px rgba(0,0,0,0.5)" : "0 4px 14px rgba(0,0,0,0.25)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {!imageError && card.coverUrl ? (
        <img
          src={card.coverUrl}
          alt={card.title}
          onError={() => setImageError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.28,
            mixBlendMode: "luminosity",
            transition: "opacity 0.2s ease, transform 0.3s ease",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        />
      ) : null}

      {/* Dark gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 35%, rgba(11,7,6,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "absolute", left: "14px", bottom: "12px", right: "52px", zIndex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: "14px", lineHeight: 1.2, color: "var(--t)" }}>
          {card.title}
        </div>
        <div style={{ fontSize: "11px", color: "#c9bbb0", marginTop: "3px" }}>{card.subtitle}</div>
      </div>

      {/* Quick Play Trigger (AC-4, AC-5) */}
      <button
        type="button"
        aria-label={
          isPlayDisabled
            ? `Play disabled, ${card.title} is empty`
            : isPlayLoading
              ? `Loading ${card.title}`
              : `Quick play ${card.title}`
        }
        title={
          isPlayDisabled
            ? card.type === "playlist"
              ? "Tracks must be added first"
              : "This album has no tracks"
            : `Quick play ${card.title}`
        }
        disabled={isPlayDisabled || isPlayLoading}
        aria-disabled={isPlayDisabled || isPlayLoading}
        onClick={handlePlayClick}
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: 0,
          background: isPlayDisabled
            ? "rgba(255, 255, 255, 0.15)"
            : isHovered
              ? "var(--accent)"
              : "var(--t)",
          color: isPlayDisabled ? "var(--m)" : "#1a110d",
          display: "grid",
          placeItems: "center",
          cursor: isPlayDisabled || isPlayLoading ? "not-allowed" : "pointer",
          zIndex: 2,
          transform: isHovered && !isPlayDisabled ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.15s ease, background-color 0.15s ease",
        }}
      >
        {isPlayLoading ? (
          <span
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid #1a110d",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.8s linear infinite",
            }}
            aria-hidden="true"
          />
        ) : (
          <svg className="i" width="13" height="13" aria-hidden="true">
            <use href="#play" />
          </svg>
        )}
      </button>
    </div>
  );
}
