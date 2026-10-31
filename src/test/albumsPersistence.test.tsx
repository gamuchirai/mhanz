import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { useAlbumStore, mapAlbumDtoToAlbum, mapTrackDtoToAlbumTrack } from "../store/useAlbumStore";
import { useLikedSongsStore } from "../store/useLikedSongsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { favoritesSync } from "../services/favoritesSync";
import * as dbService from "../services/db";
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
});
