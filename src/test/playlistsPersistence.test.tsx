import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { usePlaylistStore } from "../store/usePlaylistStore";
import { useLikedSongsStore } from "../store/useLikedSongsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { favoritesSync } from "../services/favoritesSync";
import * as dbService from "../services/db";
import type { PlaylistDto, PlaylistDetailDto, TrackDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Playlists and Favorites SQLite Persistence (Feature 16)", () => {
  const mockTrack1: TrackDto = {
    id: "trk-1",
    file_path: "/music/track1.mp3",
    title: "Midnight Cruise",
    artist_id: "art-1",
    artist_name: "Luna Wave",
    album_id: "alb-1",
    album_name: "Nocturne",
    album_artist: "Luna Wave",
    duration: 210,
    year: 2024,
    genre: "Electronic",
    disc_number: 1,
    track_number: 1,
    bitrate: 320,
    format: "mp3",
    cover_art_path: null,
    is_favorite: true,
    liked_at: 1700000000,
    play_count: 5,
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
    title: "Golden Dawn",
    artist_id: "art-2",
    artist_name: "Solar Echo",
    album_id: "alb-2",
    album_name: "Sunrise",
    album_artist: "Solar Echo",
    duration: 185,
    year: 2024,
    genre: "Acoustic",
    disc_number: 1,
    track_number: 2,
    bitrate: 320,
    format: "mp3",
    cover_art_path: null,
    is_favorite: false,
    liked_at: null,
    play_count: 12,
    last_played_at: 1700000600,
    file_modified_at: 1699990000,
    file_size_bytes: 7200000,
    folder_id: "fld-1",
    created_at: 1699990000,
    updated_at: 1700000000,
  };

  const mockPlaylists: PlaylistDto[] = [
    {
      id: "curated-1",
      name: "Late Night Drive",
      description: "Atmospheric beats for nocturnal highway cruising",
      cover_art_path: null,
      gradient_preset: "linear-gradient(180deg, #12141e, #2b2230 62%, #5a3630)",
      is_favorite: false,
      is_curated: true,
      track_count: 5,
      created_at: 1700000000,
      updated_at: 1700000000,
    },
    {
      id: "user-p1",
      name: "Road Trip",
      description: "Driving anthems",
      cover_art_path: null,
      gradient_preset: "linear-gradient(160deg, #3a2c26, #15100e)",
      is_favorite: false,
      is_curated: false,
      track_count: 2,
      created_at: 1700001000,
      updated_at: 1700001000,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    act(() => {
      usePlaylistStore.setState({
        playlists: [],
        playlistTracks: {},
        activePlaylistId: null,
        isLoaded: false,
        isLoading: false,
      });

      useLikedSongsStore.setState({
        tracks: [],
        unlikedPendingIds: [],
        filterQuery: "",
        isLoaded: false,
        isLoading: false,
      });

      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        queueItems: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        likedTrackIds: {},
        playbackContext: null,
      });

      useLibraryStore.setState({
        tracks: [],
      });
    });
  });

  it("hydrates default and user playlists from SQLite on startup (AC-4, AC-5)", async () => {
    vi.spyOn(dbService, "dbGetPlaylists").mockResolvedValue(mockPlaylists);

    await act(async () => {
      await usePlaylistStore.getState().initializePlaylists();
    });

    const state = usePlaylistStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.playlists.length).toBe(2);
    expect(state.playlists[0].title).toBe("Late Night Drive");
    expect(state.playlists[0].isCurated).toBe(true);
    expect(state.playlists[1].title).toBe("Road Trip");
    expect(state.playlists[1].isCurated).toBe(false);
  });

  it("lazily loads playlist tracks and sequence from SQLite via dbGetPlaylistDetails (AC-5)", async () => {
    const mockDetails: PlaylistDetailDto = {
      playlist: mockPlaylists[1],
      tracks: [
        {
          id: "entry-101",
          playlist_id: "user-p1",
          track: mockTrack1,
          position: 0,
          added_at: 1700001100,
        },
        {
          id: "entry-102",
          playlist_id: "user-p1",
          track: mockTrack2,
          position: 1,
          added_at: 1700001200,
        },
      ],
    };

    vi.spyOn(dbService, "dbGetPlaylistDetails").mockResolvedValue(mockDetails);

    await act(async () => {
      await usePlaylistStore.getState().loadPlaylistDetails("user-p1");
    });

    const entries = usePlaylistStore.getState().playlistTracks["user-p1"];
    expect(entries).toBeDefined();
    expect(entries.length).toBe(2);
    expect(entries[0].entryId).toBe("entry-101");
    expect(entries[0].trackId).toBe("trk-1");
    expect(entries[0].position).toBe(0);
    expect(entries[1].entryId).toBe("entry-102");
    expect(entries[1].trackId).toBe("trk-2");
    expect(entries[1].position).toBe(1);
  });

  it("persists playlist creation to SQLite with immediate optimistic ID (AC-2, AC-3)", async () => {
    const createSpy = vi.spyOn(dbService, "dbCreatePlaylist").mockResolvedValue({
      id: "playlist-custom-1",
      name: "Synthwave Nights",
      description: "Neon dreams",
      cover_art_path: null,
      gradient_preset: "linear-gradient(180deg, #12141e, #2b2230 62%, #5a3630)",
      is_favorite: false,
      is_curated: false,
      track_count: 0,
      created_at: 1700002000,
      updated_at: 1700002000,
    });

    let createdId = "";
    act(() => {
      createdId = usePlaylistStore.getState().createPlaylist({
        title: "Synthwave Nights",
        description: "Neon dreams",
      });
    });

    expect(createdId).toBeDefined();
    const state = usePlaylistStore.getState();
    const created = state.playlists.find((p) => p.id === createdId);
    expect(created).toBeDefined();
    expect(created?.title).toBe("Synthwave Nights");
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: createdId,
        name: "Synthwave Nights",
        description: "Neon dreams",
      })
    );
  });

  it("persists playlist updates and protects curated playlists from mutation (AC-2, AC-7)", async () => {
    usePlaylistStore.setState({
      playlists: [
        {
          id: "curated-1",
          title: "Late Night Drive",
          description: "Curated",
          coverGradient: "gradient",
          isCurated: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-1",
          title: "Old Title",
          description: "Old Desc",
          coverGradient: "gradient",
          isCurated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const updateSpy = vi.spyOn(dbService, "dbUpdatePlaylist").mockResolvedValue({} as PlaylistDto);

    // Attempting to update curated playlist must be a no-op
    await act(async () => {
      await usePlaylistStore.getState().updatePlaylist("curated-1", { title: "Hacked Title" });
    });
    expect(usePlaylistStore.getState().playlists[0].title).toBe("Late Night Drive");
    expect(updateSpy).not.toHaveBeenCalled();

    // Updating user playlist persists to database
    await act(async () => {
      await usePlaylistStore.getState().updatePlaylist("user-1", {
        title: "New Title",
        description: "New Desc",
      });
    });

    expect(usePlaylistStore.getState().playlists[1].title).toBe("New Title");
    expect(updateSpy).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        name: "New Title",
        description: "New Desc",
      })
    );
  });

  it("deleting an actively playing playlist clears player context and upcoming queue without cutting current song (AC-12)", async () => {
    usePlaylistStore.setState({
      playlists: [
        {
          id: "user-1",
          title: "Study Beats",
          description: "Focus music",
          coverGradient: "gradient",
          isCurated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      playlistTracks: {
        "user-1": [
          { entryId: "e1", playlistId: "user-1", trackId: "trk-1", position: 0, addedAt: "" },
          { entryId: "e2", playlistId: "user-1", trackId: "trk-2", position: 1, addedAt: "" },
        ],
      },
    });

    usePlayerStore.setState({
      currentTrack: {
        id: "trk-1",
        title: "Midnight Cruise",
        artist: "Luna Wave",
        album: "Study Beats",
        durationSeconds: 210,
        artworkUrl: "",
        playsCount: 0,
        isLiked: true,
        filePath: "/mock/track1.mp3",
      },
      queue: [
        {
          id: "trk-1",
          title: "Midnight Cruise",
          artist: "Luna Wave",
          album: "Study Beats",
          durationSeconds: 210,
          artworkUrl: "",
          playsCount: 0,
          isLiked: true,
          filePath: "",
        },
        {
          id: "trk-2",
          title: "Golden Dawn",
          artist: "Solar Echo",
          album: "Study Beats",
          durationSeconds: 185,
          artworkUrl: "",
          playsCount: 0,
          isLiked: false,
          filePath: "",
        },
      ],
      queueItems: [
        {
          id: "qi-1",
          trackId: "trk-1",
          track: {
            id: "trk-1",
            title: "Midnight Cruise",
            artist: "Luna Wave",
            album: "Study Beats",
            durationSeconds: 210,
            artworkUrl: "",
            playsCount: 0,
            isLiked: true,
            filePath: "",
          },
          addedAt: 1,
          isManuallyQueued: false,
        },
        {
          id: "qi-2",
          trackId: "trk-2",
          track: {
            id: "trk-2",
            title: "Golden Dawn",
            artist: "Solar Echo",
            album: "Study Beats",
            durationSeconds: 185,
            artworkUrl: "",
            playsCount: 0,
            isLiked: false,
            filePath: "",
          },
          addedAt: 2,
          isManuallyQueued: false,
        },
      ],
      currentIndex: 0,
      isPlaying: true,
      playbackContext: { type: "playlist", id: "user-1", title: "Study Beats" },
    });

    const deleteSpy = vi.spyOn(dbService, "dbDeletePlaylist").mockResolvedValue(true);

    await act(async () => {
      await usePlaylistStore.getState().deletePlaylist("user-1");
    });

    expect(deleteSpy).toHaveBeenCalledWith("user-1");
    expect(usePlaylistStore.getState().playlists.length).toBe(0);

    // Player context is cleared and upcoming queue is cleared while active song finishes
    const playerState = usePlayerStore.getState();
    expect(playerState.playbackContext).toBeNull();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.id).toBe("trk-1");
    expect(playerState.queue.length).toBe(1);
    expect(playerState.queue[0].id).toBe("trk-1");
  });

  it("reorders playlist tracks strictly by entry ID via dbReorderPlaylistTracks (AC-8)", async () => {
    usePlaylistStore.setState({
      playlistTracks: {
        "p-1": [
          { entryId: "entry-A", playlistId: "p-1", trackId: "trk-1", position: 0, addedAt: "" },
          { entryId: "entry-B", playlistId: "p-1", trackId: "trk-2", position: 1, addedAt: "" },
          { entryId: "entry-C", playlistId: "p-1", trackId: "trk-1", position: 2, addedAt: "" }, // Duplicate track instance
        ],
      },
    });

    const reorderSpy = vi.spyOn(dbService, "dbReorderPlaylistTracks").mockResolvedValue(true);

    // Move third entry (index 2) to top (index 0)
    await act(async () => {
      await usePlaylistStore.getState().reorderTrack("p-1", 2, 0);
    });

    const updated = usePlaylistStore.getState().playlistTracks["p-1"];
    expect(updated[0].entryId).toBe("entry-C");
    expect(updated[0].position).toBe(0);
    expect(updated[1].entryId).toBe("entry-A");
    expect(updated[1].position).toBe(1);
    expect(updated[2].entryId).toBe("entry-B");
    expect(updated[2].position).toBe(2);

    expect(reorderSpy).toHaveBeenCalledWith("p-1", ["entry-C", "entry-A", "entry-B"]);
  });

  it("removes track from playlist and re-indexes remaining sequence contiguous 0..N-1 (AC-2, AC-8)", async () => {
    usePlaylistStore.setState({
      playlistTracks: {
        "p-1": [
          { entryId: "entry-1", playlistId: "p-1", trackId: "trk-1", position: 0, addedAt: "" },
          { entryId: "entry-2", playlistId: "p-1", trackId: "trk-2", position: 1, addedAt: "" },
          { entryId: "entry-3", playlistId: "p-1", trackId: "trk-3", position: 2, addedAt: "" },
        ],
      },
    });

    const removeSpy = vi.spyOn(dbService, "dbRemovePlaylistTrack").mockResolvedValue(true);

    await act(async () => {
      await usePlaylistStore.getState().removeTrackFromPlaylist("p-1", "entry-2");
    });

    const remaining = usePlaylistStore.getState().playlistTracks["p-1"];
    expect(remaining.length).toBe(2);
    expect(remaining[0].entryId).toBe("entry-1");
    expect(remaining[0].position).toBe(0);
    expect(remaining[1].entryId).toBe("entry-3");
    expect(remaining[1].position).toBe(1);

    expect(removeSpy).toHaveBeenCalledWith("p-1", "entry-2");
  });

  it("persists favorite toggling to SQLite and reactively synchronizes across all stores via favoritesSync coordinator (AC-9, AC-11)", async () => {
    useLikedSongsStore.setState({
      tracks: [
        {
          id: "trk-1",
          title: "Midnight Cruise",
          artist: "Luna Wave",
          album: "Nocturne",
          durationSeconds: 210,
          artworkUrl: "",
          playsCount: 0,
          isLiked: true,
          filePath: "/music/track1.mp3",
          dateAdded: "",
          dateLiked: "2026-10-26T20:00:00Z",
        },
      ],
      unlikedPendingIds: [],
    });

    usePlayerStore.setState({
      likedTrackIds: { "trk-1": true },
      currentTrack: {
        id: "trk-1",
        title: "Midnight Cruise",
        artist: "Luna Wave",
        album: "Nocturne",
        durationSeconds: 210,
        artworkUrl: "",
        playsCount: 0,
        isLiked: true,
        filePath: "/music/track1.mp3",
      },
    });

    useLibraryStore.setState({
      tracks: [
        {
          id: "trk-1",
          title: "Midnight Cruise",
          artist: "Luna Wave",
          album: "Nocturne",
          durationSeconds: 210,
          artworkUrl: "",
          playsCount: 0,
          isLiked: true,
          filePath: "/music/track1.mp3",
          folderId: "fld-1",
          dateAdded: "2026-10-26",
        },
      ],
    });

    const toggleDbSpy = vi.spyOn(dbService, "dbToggleTrackFavorite").mockResolvedValue(false);

    // Unlike track in Liked Songs screen
    await act(async () => {
      await favoritesSync.toggleFavorite("trk-1", true);
    });

    expect(toggleDbSpy).toHaveBeenCalledWith("trk-1");

    // All stores updated reactively without tight coupling
    expect(usePlayerStore.getState().likedTrackIds["trk-1"]).toBe(false);
    expect(usePlayerStore.getState().currentTrack?.isLiked).toBe(false);
    expect(useLibraryStore.getState().tracks[0].isLiked).toBe(false);

    // Liked Songs keeps row with unfilled heart until navigation (AC-10)
    expect(useLikedSongsStore.getState().unlikedPendingIds).toContain("trk-1");
    expect(useLikedSongsStore.getState().tracks[0].isLiked).toBe(false);
  });

  it("rolls back optimistic favorite toggle if SQLite write rejects (AC-7, AC-8)", async () => {
    usePlayerStore.setState({
      likedTrackIds: { "trk-1": false },
    });

    vi.spyOn(dbService, "dbToggleTrackFavorite").mockRejectedValue(
      new Error("Disk I/O error writing database")
    );

    let rollbackError: unknown = null;
    await act(async () => {
      try {
        await favoritesSync.toggleFavorite("trk-1", false);
      } catch (err) {
        rollbackError = err;
      }
    });

    expect(rollbackError).toBeDefined();
    // Rolled back to false
    expect(usePlayerStore.getState().likedTrackIds["trk-1"]).toBe(false);
  });
});
