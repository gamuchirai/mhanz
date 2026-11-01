import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useArtistStore,
  mapArtistDtoToArtist,
  mapTrackDtoToArtistPopularTrack,
  mapAlbumDtoToArtistRelease,
} from "../store/useArtistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { usePlayerStore } from "../store/usePlayerStore";
import * as dbService from "../services/db";
import { Artists } from "../pages/Artists";
import { ArtistBioCard } from "../components/artists/ArtistBioCard";
import { ArtistCard } from "../components/artists/ArtistCard";
import { ArtistProfileBanner } from "../components/artists/ArtistProfileBanner";
import type { ArtistDto, ArtistProfileDto, AlbumDto, TrackDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
  convertFileSrc: (filePath: string) => `asset://localhost${filePath}`,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Artists and Artist Profile SQLite Persistence (Feature 21)", () => {
  const mockArtist1: ArtistDto = {
    id: "art-1",
    name: "Oliver Mtukudzi",
    bio: "Iconic Zimbabwean musician and humanitarian, pioneer of Tuku Music.",
    avatar_path: "/avatars/oliver.jpg",
    track_count: 5,
    album_count: 2,
    total_plays: 4200,
    created_at: 1700000000,
    updated_at: 1700000000,
  };

  const mockArtist2: ArtistDto = {
    id: "art-2",
    name: "Thomas Mapfumo",
    bio: null, // Test bio fallback
    avatar_path: null, // Test procedural initials fallback
    track_count: 2,
    album_count: 1,
    total_plays: 1800,
    created_at: 1700001000,
    updated_at: 1700001000,
  };

  const mockTrack1: TrackDto = {
    id: "trk-1",
    file_path: "/music/neria.mp3",
    title: "Neria",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    album_id: "alb-1",
    album_name: "Tuku Music",
    album_artist: "Oliver Mtukudzi",
    duration: 310,
    year: 1998,
    genre: "Afro Jazz",
    disc_number: 1,
    track_number: 1,
    bitrate: 320,
    format: "mp3",
    cover_art_path: "/covers/tuku.jpg",
    is_favorite: true,
    liked_at: 1700000000,
    play_count: 85,
    last_played_at: 1700000500,
    file_modified_at: 1699990000,
    file_size_bytes: 8400000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockTrack2: TrackDto = {
    id: "trk-2",
    file_path: "/music/todii.mp3",
    title: "Todii",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    album_id: "alb-1",
    album_name: "Tuku Music",
    album_artist: "Oliver Mtukudzi",
    duration: 290,
    year: 1998,
    genre: "Afro Jazz",
    disc_number: 1,
    track_number: 2,
    bitrate: 320,
    format: "mp3",
    cover_art_path: "/covers/tuku.jpg",
    is_favorite: false,
    liked_at: null,
    play_count: 50,
    last_played_at: 1700000400,
    file_modified_at: 1699990000,
    file_size_bytes: 7800000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockSingleAlbum: AlbumDto = {
    id: "alb-single-1",
    title: "Hear Me Lord",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    year: 2000,
    genre: "Gospel",
    cover_art_path: null,
    total_discs: 1,
    track_count: 1, // Single (AC-10)
    total_duration: 280,
    is_favorite: false,
    created_at: 1700000000,
    updated_at: 1700000000,
  };

  const mockEpAlbum: AlbumDto = {
    id: "alb-ep-1",
    title: "Acoustic Sessions",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    year: 2003,
    genre: "Acoustic",
    cover_art_path: null,
    total_discs: 1,
    track_count: 3, // EP (AC-10)
    total_duration: 650,
    is_favorite: false,
    created_at: 1700000000,
    updated_at: 1700000000,
  };

  const mockFullAlbum: AlbumDto = {
    id: "alb-1",
    title: "Tuku Music",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    year: 1998,
    genre: "Afro Jazz",
    cover_art_path: "/covers/tuku.jpg",
    total_discs: 1,
    track_count: 10, // Full album (AC-10)
    total_duration: 2800,
    is_favorite: true,
    created_at: 1700000000,
    updated_at: 1700000000,
  };

  const mockProfile: ArtistProfileDto = {
    artist: mockArtist1,
    top_tracks: [mockTrack1, mockTrack2],
    albums: [mockSingleAlbum, mockEpAlbum, mockFullAlbum],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dbService, "dbGetArtists").mockResolvedValue([mockArtist1, mockArtist2]);

    act(() => {
      useArtistStore.setState({
        artists: [],
        artistPopularTracks: {},
        artistReleases: {},
        activeArtistId: null,
        searchQuery: "",
        sortBy: "popularity",
        sortDirection: "desc",
        discographyFilter: "all",
        followedArtistIds: [],
        isPopularExpanded: false,
        isLoading: false,
        isLoaded: false,
        isLoadingProfile: false,
        error: null,
      });

      useAlbumStore.setState({
        albums: [],
        activeAlbumId: null,
        searchQuery: "",
        sortBy: "title",
        sortDirection: "asc",
      });

      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        currentIndex: 0,
        isPlaying: false,
      });
    });
  });

  it("mapArtistDtoToArtist converts database ArtistDto into presentation Artist (AC-1)", () => {
    const artist = mapArtistDtoToArtist(mockArtist1);
    expect(artist.id).toBe("art-1");
    expect(artist.name).toBe("Oliver Mtukudzi");
    expect(artist.bio).toBe(mockArtist1.bio);
    expect(artist.trackCount).toBe(5);
    expect(artist.albumCount).toBe(2);
    expect(artist.totalPlays).toBe(4200);
    expect(artist.avatarUrl).toContain("/avatars/oliver.jpg");
  });

  it("mapTrackDtoToArtistPopularTrack converts TrackDto into ArtistPopularTrack (AC-6, AC-7)", () => {
    const popularTrack = mapTrackDtoToArtistPopularTrack(mockTrack1);
    expect(popularTrack.id).toBe("trk-1");
    expect(popularTrack.title).toBe("Neria");
    expect(popularTrack.artistName).toBe("Oliver Mtukudzi");
    expect(popularTrack.albumTitle).toBe("Tuku Music");
    expect(popularTrack.playCount).toBe(85);
    expect(popularTrack.duration).toBe(310);
    expect(popularTrack.audioUrl).toBe("/music/neria.mp3");
  });

  it("mapAlbumDtoToArtistRelease categorizes albums as single, ep, or album based on track count (AC-10)", () => {
    const single = mapAlbumDtoToArtistRelease(mockSingleAlbum);
    expect(single.type).toBe("single");
    expect(single.trackCount).toBe(1);

    const ep = mapAlbumDtoToArtistRelease(mockEpAlbum);
    expect(ep.type).toBe("ep");
    expect(ep.trackCount).toBe(3);

    const fullAlbum = mapAlbumDtoToArtistRelease(mockFullAlbum);
    expect(fullAlbum.type).toBe("album");
    expect(fullAlbum.trackCount).toBe(10);
  });

  it("initializeArtists queries SQLite in desktop mode and hydrates artist catalog with play statistics (AC-1)", async () => {
    await act(async () => {
      await useArtistStore.getState().initializeArtists();
    });

    const state = useArtistStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.artists).toHaveLength(2);

    expect(state.artists[0].name).toBe("Oliver Mtukudzi");
    expect(state.artists[0].totalPlays).toBe(4200);
    expect(state.artists[0].trackCount).toBe(5);
    expect(state.artists[0].albumCount).toBe(2);

    expect(state.artists[1].name).toBe("Thomas Mapfumo");
    expect(state.artists[1].totalPlays).toBe(1800);
  });

  it("renders Midnight theme empty state when zero artists exist in SQLite (AC-3)", async () => {
    vi.spyOn(dbService, "dbGetArtists").mockResolvedValueOnce([]);

    await act(async () => {
      await useArtistStore.getState().initializeArtists();
    });

    render(<Artists />);

    expect(screen.getByRole("status", { name: /no artists found/i })).toBeInTheDocument();
    expect(screen.getByText(/No artists in library/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a music directory in Your Library to populate your collection/i)).toBeInTheDocument();
  });

  it("filters artists by search input and reorders by multi-criteria sort options in memory (AC-4)", async () => {
    await act(async () => {
      await useArtistStore.getState().initializeArtists();
    });

    render(<Artists />);

    // Initial order: sorted by popularity (total_plays descending) -> Oliver (4200) before Thomas (1800)
    const articles = screen.getAllByRole("article");
    expect(articles[0]).toHaveAccessibleName(/artist oliver mtukudzi/i);
    expect(articles[1]).toHaveAccessibleName(/artist thomas mapfumo/i);

    // Search for Thomas
    const searchInput = screen.getByRole("textbox", { name: /search artists/i });
    expect(searchInput).toBeInTheDocument();
    act(() => {
      useArtistStore.getState().setSearchQuery("Thomas");
    });

    expect(screen.getByRole("article", { name: /artist thomas mapfumo/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /artist oliver mtukudzi/i })).not.toBeInTheDocument();

    // Reset search query
    act(() => {
      useArtistStore.getState().setSearchQuery("");
    });

    // Sort by name ascending
    act(() => {
      useArtistStore.getState().setSortBy("name", "asc");
    });

    const articlesByName = screen.getAllByRole("article");
    expect(articlesByName[0]).toHaveAccessibleName(/artist oliver mtukudzi/i);
    expect(articlesByName[1]).toHaveAccessibleName(/artist thomas mapfumo/i);
  });

  it("omits legacy follow buttons and renders real local library metrics across artist cards and banner (AC-5)", () => {
    const artist = mapArtistDtoToArtist(mockArtist1);

    const { unmount } = render(<ArtistCard artist={artist} />);
    expect(screen.getByText(/2 albums/i)).toBeInTheDocument();
    expect(screen.getByText(/5 tracks • 4,200 plays/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /favorite|follow/i })).not.toBeInTheDocument();
    unmount();

    render(<ArtistProfileBanner artist={artist} />);
    expect(screen.getByRole("button", { name: /play top tracks by oliver mtukudzi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more artist options/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /favorite|follow/i })).not.toBeInTheDocument();
  });

  it("loadArtistProfile lazily queries SQLite for top tracks and discography with loading state (AC-6)", async () => {
    vi.spyOn(dbService, "dbGetArtistProfile").mockResolvedValueOnce(mockProfile);

    act(() => {
      useArtistStore.setState({
        artists: [mapArtistDtoToArtist(mockArtist1)],
      });
    });

    let loadPromise: Promise<void>;
    act(() => {
      loadPromise = useArtistStore.getState().loadArtistProfile("art-1");
    });

    await act(async () => {
      await loadPromise;
    });

    const state = useArtistStore.getState();
    expect(state.isLoadingProfile).toBe(false);
    expect(state.artistPopularTracks["art-1"]).toHaveLength(2);
    expect(state.artistPopularTracks["art-1"][0].title).toBe("Neria");
    expect(state.artistReleases["art-1"]).toHaveLength(3);
  });

  it("renders biography fallback notice when artist metadata lacks biographical notes (AC-7)", () => {
    const artistWithoutBio = mapArtistDtoToArtist(mockArtist2);
    render(<ArtistBioCard artist={artistWithoutBio} />);

    expect(
      screen.getByText(/No biography notes available in local tags for this artist/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/1,800/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Plays/i)).toBeInTheDocument();
  });

  it("clicking Play on artist profile queues real audio file tracks in usePlayerStore (AC-8)", async () => {
    vi.spyOn(dbService, "dbGetArtistProfile").mockResolvedValueOnce(mockProfile);

    act(() => {
      useArtistStore.setState({
        artists: [mapArtistDtoToArtist(mockArtist1)],
        activeArtistId: "art-1",
      });
    });

    await act(async () => {
      await useArtistStore.getState().loadArtistProfile("art-1");
    });

    act(() => {
      useArtistStore.getState().playArtistTopTracks("art-1");
    });

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.queue).toHaveLength(2);
    expect(playerState.queue[0].title).toBe("Neria");
    expect(playerState.queue[0].filePath).toBe("/music/neria.mp3");
  });

  it("clicking an album in discography sets active album in useAlbumStore and switches navigation (AC-9)", async () => {
    const onNavigate = vi.fn();

    vi.spyOn(dbService, "dbGetArtistProfile").mockResolvedValueOnce(mockProfile);

    act(() => {
      useArtistStore.setState({
        artists: [mapArtistDtoToArtist(mockArtist1)],
        activeArtistId: "art-1",
        isLoaded: true,
      });
    });

    await act(async () => {
      await useArtistStore.getState().loadArtistProfile("art-1");
    });

    render(<Artists onNavigate={onNavigate} />);

    const tukuMusicCard = screen.getByRole("article", {
      name: /tuku music \(album, 1998\)/i,
    });
    expect(tukuMusicCard).toBeInTheDocument();

    await userEvent.click(tukuMusicCard);

    expect(useAlbumStore.getState().activeAlbumId).toBe("alb-1");
    expect(onNavigate).toHaveBeenCalledWith("Albums");
  });

  it("preserves overview grid in document tree when opening profile for scroll position retention (AC-12)", () => {
    act(() => {
      useArtistStore.setState({
        artists: [mapArtistDtoToArtist(mockArtist1)],
        activeArtistId: "art-1",
        isLoaded: true,
      });
    });

    render(<Artists />);

    // Overview grid container is still mounted in DOM, but hidden with display: none
    const overviewGrid = screen.getByRole("region", {
      name: /artists overview grid/i,
      hidden: true,
    });
    expect(overviewGrid).toBeInTheDocument();

    const parentContainer = overviewGrid.parentElement;
    expect(parentContainer).toHaveStyle({ display: "none" });

    // Profile hero banner is visible
    expect(screen.getByRole("region", { name: /oliver mtukudzi hero profile/i })).toBeInTheDocument();
  });

  it("handles error during initializeArtists by recording error message and resetting isLoading", async () => {
    vi.spyOn(dbService, "dbGetArtists").mockRejectedValueOnce(new Error("Database connection dropped"));

    await act(async () => {
      await useArtistStore.getState().initializeArtists();
    });

    const state = useArtistStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Database connection dropped");
  });
});
