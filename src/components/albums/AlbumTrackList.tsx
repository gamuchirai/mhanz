import type { Album, AlbumTrack } from "../../types/album";
import { useAlbumStore, useAlbumTracks } from "../../store/useAlbumStore";
import { AlbumDiscHeader } from "./AlbumDiscHeader";
import { AlbumTrackRow } from "./AlbumTrackRow";

interface AlbumTrackListProps {
  album: Album;
}

export function AlbumTrackList({ album }: AlbumTrackListProps) {
  const tracks = useAlbumTracks(album.id);
  const playAlbum = useAlbumStore((state) => state.playAlbum);

  if (tracks.length === 0) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          color: "var(--m)",
          fontSize: "14px",
        }}
      >
        No tracks available for this album.
      </div>
    );
  }

  // Determine if this is a multi-disc album
  const discNumbers = Array.from(new Set(tracks.map((t) => t.discNumber || 1))).sort(
    (a, b) => a - b
  );
  const isMultiDisc = discNumbers.length > 1;

  // Group tracks by disc number
  const tracksByDisc: Record<number, AlbumTrack[]> = {};
  discNumbers.forEach((d) => {
    tracksByDisc[d] = tracks.filter((t) => (t.discNumber || 1) === d);
  });

  return (
    <div
      role="table"
      aria-label={`Tracks for ${album.title}`}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        paddingBottom: "48px",
      }}
    >
      {/* Table Column Headers */}
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 120px 70px 48px",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          color: "var(--m)",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        <span style={{ textAlign: "center" }}>#</span>
        <span>Title</span>
        <span>Artist</span>
        <span style={{ textAlign: "right" }}>Duration</span>
        <span />
      </div>

      {/* Track Rows, partitioned by disc if multi-disc */}
      {isMultiDisc ? (
        discNumbers.map((discNumber) => (
          <div key={`disc-${discNumber}`} style={{ display: "flex", flexDirection: "column" }}>
            <AlbumDiscHeader discNumber={discNumber} />
            {tracksByDisc[discNumber]?.map((track) => (
              <AlbumTrackRow
                key={track.id}
                track={track}
                albumArtistName={album.artistName}
                onPlay={() => playAlbum(album.id, track.id)}
              />
            ))}
          </div>
        ))
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "4px" }}>
          {tracks.map((track) => (
            <AlbumTrackRow
              key={track.id}
              track={track}
              albumArtistName={album.artistName}
              onPlay={() => playAlbum(album.id, track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
