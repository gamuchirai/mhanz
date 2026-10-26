/**
 * Mock data fixtures for playlists, preset gradients, and initial track entries.
 */

import type { GradientPreset, Playlist, PlaylistTrackEntry } from "../types/playlist";
import type { Track } from "../types/discovery";
import { sampleTracks } from "./homeFixtures";
import { initialLibraryTracks } from "./libraryFixtures";

export const MIDNIGHT_GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "late-night",
    name: "Late Night Drive",
    gradient: "linear-gradient(180deg, #12141e, #2b2230 62%, #5a3630)",
  },
  {
    id: "acoustic-wood",
    name: "Acoustic Wood",
    gradient: "linear-gradient(160deg, #3a2c26, #15100e)",
  },
  {
    id: "midnight-indigo",
    name: "Midnight Indigo",
    gradient: "linear-gradient(180deg, #2a2a30, #121216)",
  },
  {
    id: "sunset-amber",
    name: "Sunset Amber",
    gradient: "linear-gradient(180deg, #4b2d4d, #dc7650 64%, #190d0b 65%)",
  },
  {
    id: "ocean-breeze",
    name: "Oceanic Twilight",
    gradient: "linear-gradient(135deg, #1b263b, #415a77 50%, #778da9)",
  },
  {
    id: "velvet-glow",
    name: "Velvet Glow",
    gradient: "linear-gradient(145deg, #38182f, #702842 55%, #f0a982 95%)",
  },
];

export const initialPlaylists: Playlist[] = [
  {
    id: "playlist-1",
    title: "Late Night Drive",
    description: "Atmospheric beats and nocturnal melodies for midnight highway cruising.",
    coverGradient: "linear-gradient(180deg, #12141e, #2b2230 62%, #5a3630)",
    isCurated: false,
    createdAt: "2026-10-20T22:30:00Z",
    updatedAt: "2026-10-21T02:15:00Z",
  },
  {
    id: "playlist-2",
    title: "Acoustic Mornings",
    description: "Gentle acoustic strings, morning coffee, and warm golden hour light.",
    coverGradient: "linear-gradient(160deg, #3a2c26, #15100e)",
    isCurated: false,
    createdAt: "2026-10-18T08:00:00Z",
    updatedAt: "2026-10-22T09:40:00Z",
  },
  {
    id: "playlist-3",
    title: "Heartbreak Diaries",
    description: "Melancholic harmonies, introspective vocals, and rainy city nights.",
    coverGradient: "linear-gradient(180deg, #2a2a30, #121216)",
    isCurated: false,
    createdAt: "2026-10-15T19:20:00Z",
    updatedAt: "2026-10-20T21:10:00Z",
  },
  {
    id: "playlist-4",
    title: "Good Vibes",
    description: "Uplifting rhythms, vibrant energy, and feel-good weekend anthems.",
    coverGradient: "linear-gradient(180deg, #4b2d4d, #dc7650 64%, #190d0b 65%)",
    isCurated: false,
    createdAt: "2026-10-12T14:00:00Z",
    updatedAt: "2026-10-19T16:45:00Z",
  },
  {
    id: "playlist-5",
    title: "Midnight Essentials",
    description: "Handcrafted selections from the Mumhanzi editorial desk.",
    coverGradient: "linear-gradient(145deg, #38182f, #702842 55%, #f0a982 95%)",
    isCurated: true,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-23T12:00:00Z",
  },
];

export const initialPlaylistTracks: Record<string, PlaylistTrackEntry[]> = {
  "playlist-1": [
    {
      entryId: "entry-1-1",
      playlistId: "playlist-1",
      trackId: "track-1",
      position: 0,
      addedAt: "2026-10-20T22:31:00Z",
    },
    {
      entryId: "entry-1-2",
      playlistId: "playlist-1",
      trackId: "track-2",
      position: 1,
      addedAt: "2026-10-20T22:32:00Z",
    },
    {
      entryId: "entry-1-3",
      playlistId: "playlist-1",
      trackId: "track-3",
      position: 2,
      addedAt: "2026-10-20T22:33:00Z",
    },
    {
      entryId: "entry-1-4",
      playlistId: "playlist-1",
      trackId: "lib-track-3",
      position: 3,
      addedAt: "2026-10-21T02:15:00Z",
    },
  ],
  "playlist-2": [
    {
      entryId: "entry-2-1",
      playlistId: "playlist-2",
      trackId: "track-4",
      position: 0,
      addedAt: "2026-10-18T08:05:00Z",
    },
    {
      entryId: "entry-2-2",
      playlistId: "playlist-2",
      trackId: "lib-track-7",
      position: 1,
      addedAt: "2026-10-19T11:15:00Z",
    },
    {
      entryId: "entry-2-3",
      playlistId: "playlist-2",
      trackId: "lib-track-8",
      position: 2,
      addedAt: "2026-10-22T09:40:00Z",
    },
  ],
  "playlist-3": [
    {
      entryId: "entry-3-1",
      playlistId: "playlist-3",
      trackId: "track-5",
      position: 0,
      addedAt: "2026-10-15T19:25:00Z",
    },
    {
      entryId: "entry-3-2",
      playlistId: "playlist-3",
      trackId: "track-6",
      position: 1,
      addedAt: "2026-10-16T10:30:00Z",
    },
    {
      entryId: "entry-3-3",
      playlistId: "playlist-3",
      trackId: "lib-track-5",
      position: 2,
      addedAt: "2026-10-20T21:10:00Z",
    },
  ],
  "playlist-4": [
    {
      entryId: "entry-4-1",
      playlistId: "playlist-4",
      trackId: "lib-track-1",
      position: 0,
      addedAt: "2026-10-12T14:10:00Z",
    },
    {
      entryId: "entry-4-2",
      playlistId: "playlist-4",
      trackId: "lib-track-2",
      position: 1,
      addedAt: "2026-10-14T17:20:00Z",
    },
    {
      entryId: "entry-4-3",
      playlistId: "playlist-4",
      trackId: "track-7",
      position: 2,
      addedAt: "2026-10-19T16:45:00Z",
    },
  ],
  "playlist-5": [
    {
      entryId: "entry-5-1",
      playlistId: "playlist-5",
      trackId: "track-1",
      position: 0,
      addedAt: "2026-10-01T00:01:00Z",
    },
    {
      entryId: "entry-5-2",
      playlistId: "playlist-5",
      trackId: "track-4",
      position: 1,
      addedAt: "2026-10-01T00:02:00Z",
    },
    {
      entryId: "entry-5-3",
      playlistId: "playlist-5",
      trackId: "lib-track-2",
      position: 2,
      addedAt: "2026-10-01T00:03:00Z",
    },
    {
      entryId: "entry-5-4",
      playlistId: "playlist-5",
      trackId: "track-7",
      position: 3,
      addedAt: "2026-10-01T00:04:00Z",
    },
    {
      entryId: "entry-5-5",
      playlistId: "playlist-5",
      trackId: "lib-track-6",
      position: 4,
      addedAt: "2026-10-01T00:05:00Z",
    },
  ],
};

/**
 * Universal track catalog combining discovery fixtures and library tracks.
 */
export const allSampleCatalogTracks: Track[] = [
  ...sampleTracks,
  ...initialLibraryTracks.map((libTrack) => ({
    id: libTrack.id,
    title: libTrack.title,
    artist: libTrack.artist,
    album: libTrack.album,
    durationSeconds: libTrack.durationSeconds,
    artworkUrl: libTrack.artworkUrl,
    playsCount: libTrack.playsCount,
    isLiked: libTrack.isLiked,
    filePath: libTrack.filePath,
    genre: libTrack.genre,
  })),
];

/**
 * Resolves a track from either discovery fixtures or library tracks.
 */
export function findCatalogTrackById(trackId: string): Track | undefined {
  return allSampleCatalogTracks.find((t) => t.id === trackId);
}
