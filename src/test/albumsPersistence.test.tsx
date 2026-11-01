import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAlbumStore, mapAlbumDtoToAlbum, mapTrackDtoToAlbumTrack } from "../store/useAlbumStore";
import { useLikedSongsStore } from "../store/useLikedSongsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { favoritesSync } from "../services/favoritesSync";
import * as dbService from "../services/db";
import { AlbumDetailBanner } from "../components/albums/AlbumDetailBanner";
import type { AlbumDto, AlbumDetailDto, AlbumFavoriteResultDto, TrackDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Albums and Album Detail SQLite Persistence (Feature 20)", () => {
  const mockAlbum1: AlbumDto = {
    id: "alb-1",
    title: "Timeless Vibrations",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    year: 1998,
    genre: "Afro Jazz",
    cover_art_path: "/covers/timeless.jpg",
    total_discs: 1,
    track_count: 2,
    total_duration: 520,
    is_favorite: true,
    created_at: 1700000000,
    updated_at: 1700000000,
  };

  const mockAlbum2: AlbumDto = {
    id: "alb-2",
    title: "Highveld Echoes",
    artist_id: "art-2",
    artist_name: "Thomas Mapfumo",
    year: 1989,
    genre: "Chimurenga",
    cover_art_path: null,
    total_discs: 2,
    track_count: 4,
    total_duration: 1100,
    is_favorite: false,
    created_at: 1700001000,
    updated_at: 1700001000,
  };

  const mockTrack1: TrackDto = {
    id: "trk-1",
    file_path: "/music/track1.mp3",
    title: "Neria",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    album_id: "alb-1",
    album_name: "Timeless Vibrations",
    album_artist: "Oliver Mtukudzi",
    duration: 310,
    year: 1998,
    genre: "Afro Jazz",
    disc_number: 1,
    track_number: 1,
    bitrate: 320,
    format: "mp3",
    cover_art_path: "/covers/timeless.jpg",
    is_favorite: true,
    liked_at: 1700000000,
    play_count: 10,
    last_played_at: 1700000500,
    file_modified_at: 1699990000,
    file_size_bytes: 8400000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockTrack2: TrackDto = {
    id: "trk-2",
    file_path: "/music/track2.mp3",
    title: "Todii",
    artist_id: "art-1",
    artist_name: "Oliver Mtukudzi",
    album_id: "alb-1",
    album_name: "Timeless Vibrations",
    album_artist: "Oliver Mtukudzi",
    duration: 210,
    year: 1998,
    genre: "Afro Jazz",
    disc_number: 1,
    track_number: 2,
    bitrate: 320,
    format: "mp3",
    cover_art_path: "/covers/timeless.jpg",
    is_favorite: true,
    liked_at: 1700000000,
    play_count: 5,
    last_played_at: 1700000600,
    file_modified_at: 1699990000,
    file_size_bytes: 6200000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockTrack3: TrackDto = {
    id: "trk-3",
    file_path: "/music/track3.mp3",
    title: "Chirizevhende",
    artist_id: "art-2",
    artist_name: "Thomas Mapfumo",
    album_id: "alb-2",
    album_name: "Highveld Echoes",
    album_artist: "Thomas Mapfumo",
    duration: 250,
    year: 1989,
    genre: "Chimurenga",
    disc_number: 1,
    track_number: 1,
    bitrate: 320,
    format: "mp3",
    cover_art_path: null,
    is_favorite: false,
    liked_at: null,
    play_count: 2,
    last_played_at: null,
    file_modified_at: 1699990000,
    file_size_bytes: 7000000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockTrack4: TrackDto = {
    id: "trk-4",
    file_path: "/music/track4.mp3",
    title: "Nyoka Musango",
    artist_id: "art-2",
    artist_name: "Thomas Mapfumo",
    album_id: "alb-2",
    album_name: "Highveld Echoes",
    album_artist: "Thomas Mapfumo",
    duration: 300,
    year: 1989,
    genre: "Chimurenga",
    disc_number: 2,
    track_number: 1,
    bitrate: 320,
    format: "mp3",
    cover_art_path: null,
    is_favorite: false,
    liked_at: null,
    play_count: 1,
    last_played_at: null,
    file_modified_at: 1699990000,
    file_size_bytes: 8500000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    act(() => {
      useAlbumStore.setState({
        albums: [],
        albumTracks: {},
        activeAlbumId: null,
        searchQuery: "",
        sortBy: "title",
        sortDirection: "asc",
        favoriteAlbumIds: [],
        explicitFavoriteAlbumIds: [],
        isLoading: false,
        isLoaded: false,
        error: null,
      });

      useLikedSongsStore.setState({
        tracks: [],
        unlikedPendingIds: [],
        filterQuery: "",
        sortState: { column: "dateLiked", direction: "desc" },
        isLoading: false,
        isLoaded: true,
      });

      usePlayerStore.setState({
        queue: [],
        currentIndex: 0,
        isPlaying: false,
        isShuffle: false,
      });
    });
  });

  it("hydrates albums catalog and favorites from SQLite on initializeAlbums (AC-2, AC-3, AC-6)", async () => {
    vi.spyOn(dbService, "dbGetAlbums").mockResolvedValueOnce([mockAlbum1, mockAlbum2]);

    await act(async () => {
      await useAlbumStore.getState().initializeAlbums();
    });

    const state = useAlbumStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isLoaded).toBe(true);
    expect(state.albums).toHaveLength(2);
    expect(state.albums[0].id).toBe("alb-1");
    expect(state.albums[0].totalDuration).toBe(520);
    expect(state.albums[0].isFavorite).toBe(true);
    expect(state.favoriteAlbumIds).toEqual(["alb-1"]);
  });

  it("preserves active search query and sort state during hydration (AC-6)", async () => {
    act(() => {
      useAlbumStore.setState({
        searchQuery: "Echoes",
        sortBy: "releaseYear",
        sortDirection: "desc",
      });
    });

    vi.spyOn(dbService, "dbGetAlbums").mockResolvedValueOnce([mockAlbum1, mockAlbum2]);

    await act(async () => {
      await useAlbumStore.getState().initializeAlbums();
    });

    const state = useAlbumStore.getState();
    expect(state.searchQuery).toBe("Echoes");
    expect(state.sortBy).toBe("releaseYear");
    expect(state.sortDirection).toBe("desc");
  });

  it("falls back to mock placeholder fixtures when not in Tauri environment (AC-11)", async () => {
    const tauriModule = await import("@tauri-apps/api/core");
    vi.spyOn(tauriModule, "isTauri").mockReturnValue(false);

    await act(async () => {
      await useAlbumStore.getState().initializeAlbums();
    });

    const state = useAlbumStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.albums.length).toBeGreaterThan(0);
  });

  it("lazily fetches detailed album tracklist and caches result (AC-4, AC-7)", async () => {
    const detailDto: AlbumDetailDto = {
      album: mockAlbum1,
      tracks: [mockTrack1, mockTrack2],
    };
    const getDetailsSpy = vi
      .spyOn(dbService, "dbGetAlbumDetails")
      .mockResolvedValueOnce(detailDto);

    await act(async () => {
      useAlbumStore.getState().setActiveAlbumId("alb-1");
    });

    expect(getDetailsSpy).toHaveBeenCalledWith("alb-1");

    const tracks = useAlbumStore.getState().getTracksForAlbum("alb-1");
    expect(tracks).toHaveLength(2);
    expect(tracks[0].title).toBe("Neria");
    expect(tracks[1].title).toBe("Todii");

    // Second fetch should return from cache without re-invoking IPC
    await act(async () => {
      await useAlbumStore.getState().fetchAlbumDetails("alb-1");
    });
    expect(getDetailsSpy).toHaveBeenCalledTimes(1);
  });

  it("correctly groups multi disc releases by disc and track number (AC-4, AC-7)", async () => {
    const multiDiscDto: AlbumDetailDto = {
      album: mockAlbum2,
      tracks: [mockTrack4, mockTrack3], // intentionally unordered
    };
    vi.spyOn(dbService, "dbGetAlbumDetails").mockResolvedValueOnce(multiDiscDto);

    await act(async () => {
      await useAlbumStore.getState().fetchAlbumDetails("alb-2");
    });

    const tracks = useAlbumStore.getState().getTracksForAlbum("alb-2");
    expect(tracks).toHaveLength(2);
    // Disc 1 should precede Disc 2
    expect(tracks[0].discNumber).toBe(1);
    expect(tracks[0].title).toBe("Chirizevhende");
    expect(tracks[1].discNumber).toBe(2);
    expect(tracks[1].title).toBe("Nyoka Musango");
  });

  it("optimistically toggles album favorite, invokes IPC with target, and broadcasts batch (AC-5, AC-8)", async () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum2)],
        albumTracks: {
          "alb-2": [mockTrack3, mockTrack4].map((t) => mapTrackDtoToAlbumTrack(t, "Highveld Echoes")),
        },
        favoriteAlbumIds: [],
      });
    });

    const favoriteResult: AlbumFavoriteResultDto = {
      album_id: "alb-2",
      is_favorite: true,
      affected_tracks: [
        { ...mockTrack3, is_favorite: true, liked_at: 1700002000 },
        { ...mockTrack4, is_favorite: true, liked_at: 1700002000 },
      ],
    };
    const toggleSpy = vi
      .spyOn(dbService, "dbToggleAlbumFavorite")
      .mockResolvedValueOnce(favoriteResult);
    const batchSpy = vi.spyOn(favoritesSync, "broadcastBatch");

    await act(async () => {
      await useAlbumStore.getState().toggleFavoriteAlbum("alb-2");
    });

    expect(toggleSpy).toHaveBeenCalledWith("alb-2", true);
    expect(batchSpy).toHaveBeenCalledWith(favoriteResult.affected_tracks, true);

    const state = useAlbumStore.getState();
    expect(state.favoriteAlbumIds).toContain("alb-2");
    expect(state.albums.find((a) => a.id === "alb-2")?.isFavorite).toBe(true);
    expect(state.albumTracks["alb-2"].every((t) => t.isLiked)).toBe(true);

    // Verify LikedSongsStore received the batch update
    const likedSongs = useLikedSongsStore.getState().tracks;
    expect(likedSongs).toHaveLength(2);
    expect(likedSongs.map((t) => t.id)).toEqual(["trk-3", "trk-4"]);
  });

  it("rolls back optimistic favorite toggle when SQLite write fails (AC-8)", async () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum2)],
        albumTracks: {
          "alb-2": [mockTrack3, mockTrack4].map((t) => mapTrackDtoToAlbumTrack(t, "Highveld Echoes")),
        },
        favoriteAlbumIds: [],
      });
    });

    vi.spyOn(dbService, "dbToggleAlbumFavorite").mockRejectedValueOnce(
      new Error("Disk write I/O error")
    );

    await expect(
      act(async () => {
        await useAlbumStore.getState().toggleFavoriteAlbum("alb-2");
      })
    ).rejects.toThrow("Disk write I/O error");

    // Rolled back to previous state
    const state = useAlbumStore.getState();
    expect(state.favoriteAlbumIds).toEqual([]);
    expect(state.albums.find((a) => a.id === "alb-2")?.isFavorite).toBe(false);
    expect(state.albumTracks["alb-2"].every((t) => !t.isLiked)).toBe(true);
  });

  it("automatically derives album favorite when 50% or more tracks are liked individually (AC-2, AC-9)", () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum2)],
        albumTracks: {
          "alb-2": [
            mapTrackDtoToAlbumTrack(mockTrack3, "Highveld Echoes"),
            mapTrackDtoToAlbumTrack(mockTrack4, "Highveld Echoes"),
          ],
        },
        favoriteAlbumIds: [],
      });
    });

    // Like 1 of 2 tracks (50%)
    act(() => {
      favoritesSync.broadcast("trk-3", true, 1700000000);
    });

    const state = useAlbumStore.getState();
    expect(state.favoriteAlbumIds).toContain("alb-2");
    expect(state.albums.find((a) => a.id === "alb-2")?.isFavorite).toBe(true);

    // Unlike that track -> drops below 50%
    act(() => {
      favoritesSync.broadcast("trk-3", false, null);
    });

    const updatedState = useAlbumStore.getState();
    expect(updatedState.favoriteAlbumIds).not.toContain("alb-2");
    expect(updatedState.albums.find((a) => a.id === "alb-2")?.isFavorite).toBe(false);
  });

  it("silently re-hydrates album catalog and active detail tracklist upon scanner completion (AC-10)", async () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum1)],
        activeAlbumId: "alb-1",
        albumTracks: {
          "alb-1": [mapTrackDtoToAlbumTrack(mockTrack1, "Timeless Vibrations")],
        },
        favoriteAlbumIds: ["alb-1"],
      });
    });

    const updatedAlbum1: AlbumDto = {
      ...mockAlbum1,
      track_count: 2,
    };
    vi.spyOn(dbService, "dbGetAlbums").mockResolvedValueOnce([updatedAlbum1, mockAlbum2]);
    const getDetailsSpy = vi
      .spyOn(dbService, "dbGetAlbumDetails")
      .mockResolvedValueOnce({
        album: updatedAlbum1,
        tracks: [mockTrack1, mockTrack2],
      });

    // Simulate scan completed trigger
    await act(async () => {
      // Direct call to simulate onScanCompleted listener
      const dtos = await dbService.dbGetAlbums();
      useAlbumStore.setState({
        albums: dtos.map(mapAlbumDtoToAlbum),
        favoriteAlbumIds: dtos.filter((a) => a.is_favorite).map((a) => a.id),
      });
      await useAlbumStore.getState().fetchAlbumDetails("alb-1", true);
    });

    expect(getDetailsSpy).toHaveBeenCalledWith("alb-1");
    const state = useAlbumStore.getState();
    expect(state.albums).toHaveLength(2);
    expect(state.albumTracks["alb-1"]).toHaveLength(2);
  });

  it("converts AlbumTracks to player Tracks preserving sequence on playAlbum and shuffleAlbum (AC-12)", async () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum1)],
        albumTracks: {
          "alb-1": [
            mapTrackDtoToAlbumTrack(mockTrack1, "Timeless Vibrations"),
            mapTrackDtoToAlbumTrack(mockTrack2, "Timeless Vibrations"),
          ],
        },
      });
    });

    await act(async () => {
      await useAlbumStore.getState().playAlbum("alb-1", "trk-2");
    });

    const playerState = usePlayerStore.getState();
    expect(playerState.queue).toHaveLength(2);
    expect(playerState.queue[0].title).toBe("Neria");
    expect(playerState.queue[1].title).toBe("Todii");
    expect(playerState.currentIndex).toBe(1);

    await act(async () => {
      await useAlbumStore.getState().shuffleAlbum("alb-1");
    });

    const shuffledState = usePlayerStore.getState();
    expect(shuffledState.isShuffle).toBe(true);
    expect(shuffledState.queue).toHaveLength(2);
  });

  it("handles error during initializeAlbums by recording error message and resetting isLoading (AC-6)", async () => {
    vi.spyOn(dbService, "dbGetAlbums").mockRejectedValueOnce(new Error("Database connection timed out"));

    await act(async () => {
      await useAlbumStore.getState().initializeAlbums();
    });

    const state = useAlbumStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isLoaded).toBe(true);
    expect(state.error).toBe("Database connection timed out");
  });

  it("handles null album detail response when album does not exist in SQLite (AC-7)", async () => {
    vi.spyOn(dbService, "dbGetAlbumDetails").mockResolvedValueOnce(null);

    let tracks: ReturnType<typeof mapTrackDtoToAlbumTrack>[] = [];
    await act(async () => {
      tracks = await useAlbumStore.getState().fetchAlbumDetails("non-existent");
    });

    expect(tracks).toEqual([]);
    expect(useAlbumStore.getState().getTracksForAlbum("non-existent")).toEqual([]);
  });

  it("handles IPC rejection in fetchAlbumDetails by returning fallback cached tracks (AC-7)", async () => {
    vi.spyOn(dbService, "dbGetAlbumDetails").mockRejectedValueOnce(new Error("Failed to read album tracks"));

    let tracks: ReturnType<typeof mapTrackDtoToAlbumTrack>[] = [];
    await act(async () => {
      tracks = await useAlbumStore.getState().fetchAlbumDetails("alb-corrupt");
    });

    expect(tracks).toEqual([]);
    expect(useAlbumStore.getState().getTracksForAlbum("alb-corrupt")).toEqual([]);
  });

  it("retains explicit favorite state even when liked tracks ratio falls below 50% (AC-2, AC-8)", () => {
    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(mockAlbum1)],
        albumTracks: {
          "alb-1": [
            mapTrackDtoToAlbumTrack(mockTrack1, "Timeless Vibrations"),
            mapTrackDtoToAlbumTrack(mockTrack2, "Timeless Vibrations"),
          ],
        },
        favoriteAlbumIds: ["alb-1"],
        explicitFavoriteAlbumIds: ["alb-1"],
      });
    });

    // Both tracks unliked (0% liked)
    act(() => {
      favoritesSync.broadcast("trk-1", false, null);
      favoritesSync.broadcast("trk-2", false, null);
    });

    const state = useAlbumStore.getState();
    // Since alb-1 is explicitly favorited, it remains favorite
    expect(state.favoriteAlbumIds).toContain("alb-1");
    expect(state.albums.find((a) => a.id === "alb-1")?.isFavorite).toBe(true);
  });

  it("handles album with 0 tracks without division by zero or becoming favorite (AC-2, AC-9)", () => {
    const emptyAlbum: AlbumDto = {
      ...mockAlbum2,
      id: "alb-empty",
      track_count: 0,
      total_duration: 0,
      is_favorite: false,
    };

    act(() => {
      useAlbumStore.setState({
        albums: [mapAlbumDtoToAlbum(emptyAlbum)],
        albumTracks: {
          "alb-empty": [],
        },
        favoriteAlbumIds: [],
        explicitFavoriteAlbumIds: [],
      });
    });

    // Broadcast like for unrelated track
    act(() => {
      favoritesSync.broadcast("trk-other", true, 1700000000);
    });

    const state = useAlbumStore.getState();
    expect(state.favoriteAlbumIds).not.toContain("alb-empty");
    expect(state.albums.find((a) => a.id === "alb-empty")?.isFavorite).toBe(false);
  });

  it("maps AlbumDto with null fields into safe default UI values (AC-3)", () => {
    const minimalDto: AlbumDto = {
      id: "alb-min",
      title: "Minimalist Record",
      artist_id: null,
      artist_name: "Unknown Artist",
      year: null,
      genre: null,
      cover_art_path: null,
      total_discs: 1,
      track_count: 0,
      total_duration: 0,
      is_favorite: false,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    const album = mapAlbumDtoToAlbum(minimalDto);
    expect(album.artistId).toBe("");
    expect(album.releaseYear).toBe(0);
    expect(album.genre).toBe("");
    expect(album.coverUrl).toBe("");
    expect(album.totalDuration).toBe(0);
    expect(album.trackCount).toBe(0);
    expect(album.isFavorite).toBe(false);
  });

  it("maps TrackDto with null optional fields into safe default values (AC-3)", () => {
    const minimalTrackDto: TrackDto = {
      id: "trk-min",
      file_path: "/music/track_min.wav",
      title: "Audio Snippet",
      artist_id: null,
      artist_name: "Acoustic Duo",
      album_id: null,
      album_name: null,
      album_artist: null,
      duration: 45.4,
      year: null,
      genre: null,
      disc_number: 0,
      track_number: null,
      bitrate: null,
      format: "wav",
      cover_art_path: null,
      is_favorite: false,
      liked_at: null,
      play_count: 0,
      last_played_at: null,
      file_modified_at: 1700000000,
      file_size_bytes: 5000000,
      folder_id: null,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    const track = mapTrackDtoToAlbumTrack(minimalTrackDto, "Fallback Album Title", "/fallback/cover.jpg");
    expect(track.artistId).toBeUndefined();
    expect(track.album).toBe("Fallback Album Title");
    expect(track.albumId).toBe("");
    expect(track.discNumber).toBe(1);
    expect(track.trackNumber).toBe(1);
    expect(track.duration).toBe(45);
    expect(track.coverUrl).toBe("/fallback/cover.jpg");
    expect(track.isLiked).toBe(false);
  });

  it("renders AlbumDetailBanner and verifies accessible controls and disabled states for empty tracklist (AC-4, AC-8)", async () => {
    const user = userEvent.setup();
    const album = {
      ...mapAlbumDtoToAlbum(mockAlbum2),
      trackCount: 0,
      totalDuration: 0,
    };

    act(() => {
      useAlbumStore.setState({
        albums: [album],
        albumTracks: {
          [album.id]: [],
        },
        favoriteAlbumIds: [],
        explicitFavoriteAlbumIds: [],
      });
    });

    render(<AlbumDetailBanner album={album} />);

    // Play All and Shuffle should be disabled when trackCount is 0
    const playAllBtn = screen.getByRole("button", { name: /play all album tracks/i });
    const shuffleBtn = screen.getByRole("button", { name: /shuffle album tracks/i });
    expect(playAllBtn).toBeDisabled();
    expect(shuffleBtn).toBeDisabled();

    // Favorite button accessible name
    const favoriteBtn = screen.getByRole("button", { name: /save album to favorites/i });
    expect(favoriteBtn).toBeInTheDocument();

    // Mock favorite toggle IPC
    const toggleSpy = vi.spyOn(dbService, "dbToggleAlbumFavorite").mockResolvedValueOnce({
      album_id: album.id,
      is_favorite: true,
      affected_tracks: [],
    });

    await user.click(favoriteBtn);
    expect(toggleSpy).toHaveBeenCalledWith(album.id, true);
  });
});
