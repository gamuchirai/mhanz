/**
 * Search and Explore mock fixtures for genres, albums, artists, and tracks.
 * Aligns with the Midnight dark aesthetic and provides rich data for debounced query filtering.
 */

import type { Track } from "../types/discovery";
import type { AlbumCard, ArtistCard, GenreCard } from "../types/search";
import { sampleTracks } from "./homeFixtures";

export const exploreGenres: GenreCard[] = [
  {
    id: "genre-chillwave",
    name: "Chillwave",
    slug: "chillwave",
    colorGradient: "linear-gradient(135deg, #3a221a 0%, #1a100d 100%)",
    accentColor: "#f0a982",
    icon: "spark",
    trackCount: 42,
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-indie-pop",
    name: "Indie Pop",
    slug: "indie-pop",
    colorGradient: "linear-gradient(135deg, #442a22 0%, #1b120f 100%)",
    accentColor: "#f3b999",
    icon: "disc",
    trackCount: 56,
    coverUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-synthwave",
    name: "Synthwave",
    slug: "synthwave",
    colorGradient: "linear-gradient(135deg, #2f1e29 0%, #150d14 100%)",
    accentColor: "#d982b5",
    icon: "star",
    trackCount: 38,
    coverUrl:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-acoustic",
    name: "Acoustic",
    slug: "acoustic",
    colorGradient: "linear-gradient(135deg, #3d321d 0%, #16130b 100%)",
    accentColor: "#dfbc6a",
    icon: "list",
    trackCount: 29,
    coverUrl:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-lofi-beats",
    name: "Lofi Beats",
    slug: "lofi-beats",
    colorGradient: "linear-gradient(135deg, #242930 0%, #0d1014 100%)",
    accentColor: "#7eb3d4",
    icon: "disc",
    trackCount: 64,
    coverUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-ambient",
    name: "Ambient",
    slug: "ambient",
    colorGradient: "linear-gradient(135deg, #212c2a 0%, #0c1211 100%)",
    accentColor: "#70c1b3",
    icon: "spark",
    trackCount: 31,
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-soul",
    name: "Soul & R&B",
    slug: "soul",
    colorGradient: "linear-gradient(135deg, #42221d 0%, #1a0d0a 100%)",
    accentColor: "#f2796e",
    icon: "heart",
    trackCount: 47,
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "genre-jazz",
    name: "Midnight Jazz",
    slug: "jazz",
    colorGradient: "linear-gradient(135deg, #37281f 0%, #16100c 100%)",
    accentColor: "#e6a15c",
    icon: "disc",
    trackCount: 35,
    coverUrl:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
  },
];

export const mockAlbums: AlbumCard[] = [
  {
    id: "album-midnight-sessions",
    title: "Midnight Sessions",
    artist: "Aiden Vale",
    releaseYear: 2024,
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    trackCount: 10,
    tracks: sampleTracks.filter((t) => t.album === "Midnight Sessions"),
  },
  {
    id: "album-neon-echoes",
    title: "Neon Echoes",
    artist: "Aiden Vale",
    releaseYear: 2023,
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    trackCount: 8,
    tracks: sampleTracks.filter((t) => t.album === "Neon Echoes"),
  },
  {
    id: "album-wanderlust",
    title: "Wanderlust",
    artist: "Hollow Coves",
    releaseYear: 2022,
    coverUrl:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80",
    trackCount: 11,
    tracks: sampleTracks.filter((t) => t.album === "Wanderlust"),
  },
  {
    id: "album-21",
    title: "21",
    artist: "Adele",
    releaseYear: 2011,
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    trackCount: 11,
    tracks: sampleTracks.filter((t) => t.artist === "Adele"),
  },
  {
    id: "album-monsters",
    title: "Monsters",
    artist: "Tom Odell",
    releaseYear: 2021,
    coverUrl:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
    trackCount: 12,
    tracks: sampleTracks.filter((t) => t.album === "Monsters"),
  },
];

export const mockArtists: ArtistCard[] = [
  {
    id: "artist-aiden-vale",
    name: "Aiden Vale",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    followersCount: 1240000,
    monthlyListeners: 3450000,
    popularTracks: sampleTracks.filter((t) => t.artist === "Aiden Vale"),
  },
  {
    id: "artist-hollow-coves",
    name: "Hollow Coves",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    followersCount: 890000,
    monthlyListeners: 2100000,
    popularTracks: sampleTracks.filter((t) => t.artist === "Hollow Coves"),
  },
  {
    id: "artist-adele",
    name: "Adele",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    followersCount: 18200000,
    monthlyListeners: 49000000,
    popularTracks: sampleTracks.filter((t) => t.artist === "Adele"),
  },
  {
    id: "artist-tom-odell",
    name: "Tom Odell",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    followersCount: 4200000,
    monthlyListeners: 15800000,
    popularTracks: sampleTracks.filter((t) => t.artist === "Tom Odell"),
  },
  {
    id: "artist-billie-eilish",
    name: "Billie Eilish",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
    followersCount: 32000000,
    monthlyListeners: 68000000,
    popularTracks: sampleTracks.filter((t) => t.artist === "Billie Eilish"),
  },
];

export const searchTracksPool: Track[] = [...sampleTracks];
