import { useState } from "react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useSearchStore } from "../../store/useSearchStore";
import type { Track } from "../../types/discovery";
import type { AlbumCard, ArtistCard, GenreCard } from "../../types/search";
import { useAlbumStore } from "../../store/useAlbumStore";
import { useArtistStore } from "../../store/useArtistStore";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatListeners(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M plays`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K plays`;
  }
  return `${count} plays`;
}

interface CategorizedResultsProps {
  onNavigate?: (nav: string) => void;
}

export function CategorizedResults({ onNavigate }: CategorizedResultsProps = {}) {
  const results = useSearchStore((state) => state.results);
  const activeCategory = useSearchStore((state) => state.activeCategory);
  const selectGenre = useSearchStore((state) => state.selectGenre);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playCollection = usePlayerStore((state) => state.playCollection);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  const handlePlaySong = (track: Track) => {
    playTrack(track, results.tracks);
  };

  const handlePlayAlbum = (album: AlbumCard) => {
    if (album.tracks.length > 0) {
      playCollection(album.tracks, 0);
    }
  };

  const handleOpenAlbum = (album: AlbumCard) => {
    const storeAlbums = useAlbumStore.getState().albums;
    const match = storeAlbums.find(
      (a) => a.id === album.id || a.title.toLowerCase() === album.title.toLowerCase()
    );
    useAlbumStore.getState().setActiveAlbumId(match ? match.id : (storeAlbums[0]?.id ?? album.id));
    onNavigate?.("Albums");
  };

  const handleOpenArtist = (artist: ArtistCard) => {
    const storeArtists = useArtistStore.getState().artists;
    const match = storeArtists.find(
      (a) => a.id === artist.id || a.name.toLowerCase() === artist.name.toLowerCase()
    );
    useArtistStore.getState().setActiveArtistId(match ? match.id : (storeArtists[0]?.id ?? artist.id));
    onNavigate?.("Artists");
  };

  const topTrack = results.tracks[0];
  const previewTracks = results.tracks.slice(0, 4);

  return (
    <div
      id={`search-panel-${activeCategory}`}
      role="tabpanel"
      aria-label={`${activeCategory} search results`}
      style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}
    >
      {/* ALL CATEGORY VIEW */}
      {activeCategory === "all" && (
        <>
          {/* Top Results Section */}
          {(topTrack || previewTracks.length > 0) && (
            <section aria-label="Top results" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--t)" }}>
                Top Results
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: topTrack ? "minmax(280px, 340px) 1fr" : "1fr",
                  gap: "24px",
                }}
              >
                {/* Featured Top Result Card */}
                {topTrack && (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "14px",
                      background: "rgba(24, 17, 15, 0.7)",
                      border: "1px solid var(--l)",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px",
                      transition: "background 0.2s ease, border-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(30, 22, 19, 0.85)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(24, 17, 15, 0.7)";
                      e.currentTarget.style.borderColor = "var(--l)";
                    }}
                  >
                    <img
                      src={topTrack.artworkUrl}
                      alt={topTrack.title}
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "10px",
                        objectFit: "cover",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
                      }}
                    />

                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "10px",
                          background: "rgba(240, 169, 130, 0.15)",
                          color: "var(--accent)",
                          fontWeight: 600,
                        }}
                      >
                        Song
                      </span>
                      <h4
                        style={{
                          margin: "10px 0 4px 0",
                          fontSize: "22px",
                          fontWeight: 700,
                          color: "var(--t)",
                        }}
                      >
                        {topTrack.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: "14px", color: "var(--m)" }}>
                        {topTrack.artist} &bull; {topTrack.album}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--m)" }}>
                        {formatDuration(topTrack.durationSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlaySong(topTrack)}
                        aria-label={`Play ${topTrack.title}`}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "var(--accent)",
                          color: "#1c0f09",
                          border: 0,
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(240,169,130,0.3)",
                          transition: "transform 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        <svg className="i" width="18" height="18" aria-hidden="true">
                          <use href={currentTrack?.id === topTrack.id && isPlaying ? "#pause" : "#play"} />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Songs List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {previewTracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isLiked = !!likedTrackIds[track.id];

                    return (
                      <div
                        key={track.id}
                        onDoubleClick={() => handlePlaySong(track)}
                        onMouseEnter={() => setHoveredTrackId(track.id)}
                        onMouseLeave={() => setHoveredTrackId(null)}
                        aria-label={`Song: ${track.title} by ${track.artist}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background: isCurrent
                            ? "rgba(240, 169, 130, 0.1)"
                            : hoveredTrackId === track.id
                            ? "rgba(255, 255, 255, 0.04)"
                            : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <span style={{ width: "20px", textAlign: "center", fontSize: "13px", color: "var(--m)" }}>
                          {hoveredTrackId === track.id ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaySong(track);
                              }}
                              aria-label={`Play ${track.title}`}
                              style={{
                                background: "none",
                                border: 0,
                                color: "var(--accent)",
                                padding: 0,
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <svg className="i" width="14" height="14" aria-hidden="true">
                                <use href="#play" />
                              </svg>
                            </button>
                          ) : (
                            idx + 1
                          )}
                        </span>

                        <img
                          src={track.artworkUrl}
                          alt=""
                          aria-hidden="true"
                          style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: isCurrent ? "var(--accent)" : "var(--t)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {track.title}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--m)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {track.artist}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track.id);
                          }}
                          aria-label={`Like ${track.title}`}
                          style={{
                            background: "none",
                            border: 0,
                            color: isLiked ? "var(--accent)" : "var(--m)",
                            padding: "4px",
                            cursor: "pointer",
                            opacity: isLiked || hoveredTrackId === track.id ? 1 : 0.4,
                          }}
                        >
                          <svg className="i" width="16" height="16" aria-hidden="true">
                            <use href="#heart" />
                          </svg>
                        </button>

                        <span style={{ fontSize: "12px", color: "var(--m)", width: "36px", textAlign: "right" }}>
                          {formatDuration(track.durationSeconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Albums Section */}
          {results.albums.length > 0 && (
            <section aria-label="Albums" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--t)" }}>
                  Albums
                </h3>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "18px",
                }}
              >
                {results.albums.map((album) => (
                  <AlbumCardItem
                    key={album.id}
                    album={album}
                    onPlay={handlePlayAlbum}
                    onAlbumClick={handleOpenAlbum}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists Section */}
          {results.artists.length > 0 && (
            <section aria-label="Artists" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--t)" }}>
                Artists
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "20px",
                }}
              >
                {results.artists.map((artist) => (
                  <ArtistCardItem key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {/* Genres Section */}
          {results.genres.length > 0 && (
            <section aria-label="Matching genres" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--t)" }}>
                Genres
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {results.genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => selectGenre(genre)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 18px",
                      borderRadius: "20px",
                      background: genre.colorGradient,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--t)",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <svg className="i" width="14" height="14" style={{ color: genre.accentColor }} aria-hidden="true">
                      <use href={`#${genre.icon}`} />
                    </svg>
                    <span>{genre.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ISOLATED SONGS VIEW */}
      {activeCategory === "songs" && (
        <section aria-label="Song results" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 1fr 80px 60px",
              padding: "8px 12px",
              color: "var(--m)",
              fontSize: "12px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              borderBottom: "1px solid var(--l)",
            }}
          >
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Like</span>
            <span style={{ textAlign: "right" }}>Duration</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {results.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = !!likedTrackIds[track.id];

              return (
                <div
                  key={track.id}
                  onDoubleClick={() => handlePlaySong(track)}
                  onMouseEnter={() => setHoveredTrackId(track.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  aria-label={`Song: ${track.title} by ${track.artist}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 80px 60px",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: isCurrent
                      ? "rgba(240, 169, 130, 0.12)"
                      : hoveredTrackId === track.id
                      ? "rgba(255, 255, 255, 0.04)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--m)" }}>
                    {hoveredTrackId === track.id ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(track);
                        }}
                        aria-label={`Play ${track.title}`}
                        style={{
                          background: "none",
                          border: 0,
                          color: "var(--accent)",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <svg className="i" width="14" height="14" aria-hidden="true">
                          <use href="#play" />
                        </svg>
                      </button>
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <img
                      src={track.artworkUrl}
                      alt=""
                      aria-hidden="true"
                      style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover" }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: isCurrent ? "var(--accent)" : "var(--t)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--m)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--m)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {track.album}
                  </span>

                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track.id);
                      }}
                      aria-label={`Like ${track.title}`}
                      style={{
                        background: "none",
                        border: 0,
                        color: isLiked ? "var(--accent)" : "var(--m)",
                        padding: "4px",
                        cursor: "pointer",
                        opacity: isLiked || hoveredTrackId === track.id ? 1 : 0.4,
                      }}
                    >
                      <svg className="i" width="16" height="16" aria-hidden="true">
                        <use href="#heart" />
                      </svg>
                    </button>
                  </div>

                  <span style={{ fontSize: "13px", color: "var(--m)", textAlign: "right" }}>
                    {formatDuration(track.durationSeconds)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ISOLATED ALBUMS VIEW */}
      {activeCategory === "albums" && (
        <section aria-label="Album results" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
            }}
          >
            {results.albums.map((album) => (
              <AlbumCardItem
                key={album.id}
                album={album}
                onPlay={handlePlayAlbum}
                onAlbumClick={handleOpenAlbum}
              />
            ))}
          </div>
        </section>
      )}

      {/* ISOLATED ARTISTS VIEW */}
      {activeCategory === "artists" && (
        <section aria-label="Artist results" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "24px",
            }}
          >
            {results.artists.map((artist) => (
              <ArtistCardItem
                key={artist.id}
                artist={artist}
                onArtistClick={handleOpenArtist}
              />
            ))}
          </div>
        </section>
      )}

      {/* ISOLATED GENRES VIEW */}
      {activeCategory === "genres" && (
        <section aria-label="Genre results" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "18px",
            }}
          >
            {results.genres.map((genre: GenreCard) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => selectGenre(genre)}
                aria-label={`Genre ${genre.name}, ${genre.trackCount} tracks`}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  height: "130px",
                  borderRadius: "14px",
                  background: genre.colorGradient,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.3)",
                      color: genre.accentColor,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <svg className="i" width="15" height="15" aria-hidden="true">
                      <use href={`#${genre.icon}`} />
                    </svg>
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--m)" }}>{genre.trackCount} tracks</span>
                </div>
                <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--t)" }}>{genre.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AlbumCardItem({
  album,
  onPlay,
  onAlbumClick,
}: {
  album: AlbumCard;
  onPlay: (album: AlbumCard) => void;
  onAlbumClick?: (album: AlbumCard) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onAlbumClick?.(album)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAlbumClick?.(album);
        }
      }}
      aria-label={`Album ${album.title} by ${album.artist}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "12px",
        borderRadius: "12px",
        background: hovered ? "rgba(255, 255, 255, 0.04)" : "rgba(24, 17, 15, 0.5)",
        border: "1px solid var(--l)",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", overflow: "hidden" }}>
        <img
          src={album.coverUrl}
          alt={album.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {hovered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(album);
            }}
            aria-label={`Play album ${album.title}`}
            style={{
              position: "absolute",
              right: "10px",
              bottom: "10px",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#1c0f09",
              border: 0,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#play" />
            </svg>
          </button>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {album.title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--m)" }}>
          {album.artist} &bull; {album.releaseYear}
        </div>
      </div>
    </div>
  );
}

function ArtistCardItem({
  artist,
  onArtistClick,
}: {
  artist: ArtistCard;
  onArtistClick?: (artist: ArtistCard) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onArtistClick?.(artist)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onArtistClick?.(artist);
        }
      }}
      aria-label={`Artist ${artist.name}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
        padding: "16px",
        borderRadius: "14px",
        background: hovered ? "rgba(255, 255, 255, 0.04)" : "rgba(24, 17, 15, 0.4)",
        border: hovered ? "1px solid rgba(240, 169, 130, 0.3)" : "1px solid var(--l)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <img
        src={artist.avatarUrl}
        alt={artist.name}
        style={{
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          objectFit: "cover",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          border: hovered ? "2px solid var(--accent)" : "2px solid rgba(255,255,255,0.08)",
          transition: "border-color 0.2s ease",
        }}
      />
      <div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--t)" }}>{artist.name}</div>
        <div style={{ fontSize: "12px", color: "var(--m)", marginTop: "4px" }}>
          {formatListeners(artist.monthlyListeners)}
        </div>
      </div>
    </div>
  );
}
