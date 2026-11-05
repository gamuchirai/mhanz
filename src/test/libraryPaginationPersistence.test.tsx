import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import { useLibraryStore } from "../store/useLibraryStore";
import { useLikedSongsStore } from "../store/useLikedSongsStore";
import type { FolderDto, TrackDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Library Pagination and Full Collection Loading (Finding P4-F6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    act(() => {
      useLibraryStore.setState({
        folders: [],
        tracks: [],
        isFolderPanelExpanded: false,
        selectedFolderId: null,
        filterQuery: "",
        sortState: {
          column: "title",
          direction: "asc",
        },
        isAddFolderModalOpen: false,
        folderPendingRemoval: null,
        isInitialized: false,
      });

      useLikedSongsStore.setState({
        tracks: [],
        unlikedPendingIds: [],
        filterQuery: "",
        sortState: {
          column: "dateLiked",
          direction: "desc",
        },
        isLoaded: false,
        isLoading: false,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads all tracks across multiple pages when library has more than 500 tracks", async () => {
    const totalTracks = 1200;

    const dummyFolder: FolderDto = {
      id: "folder-1",
      path: "C:/Music",
      added_at: 1000,
      last_scanned_at: null,
      is_active: true,
    };

    const makeTrack = (index: number): TrackDto => ({
      id: `track-${index}`,
      file_path: `C:/Music/track-${index}.mp3`,
      title: `Song ${index}`,
      artist_id: "artist-1",
      artist_name: "Artist Name",
      album_id: "album-1",
      album_name: "Album Name",
      album_artist: "Artist Name",
      genre: "Electronic",
      year: 2024,
      duration: 200,
      track_number: index,
      disc_number: 1,
      folder_id: "folder-1",
      file_size_bytes: 4000000,
      bitrate: 320,
      format: "mp3",
      cover_art_path: null,
      liked_at: null,
      file_modified_at: 1000,
      is_favorite: false,
      play_count: 0,
      last_played_at: null,
      created_at: 1000,
      updated_at: 1000,
    });

    const allTracks: TrackDto[] = Array.from({ length: totalTracks }, (_, i) => makeTrack(i));

    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "db_get_folders") {
        return [dummyFolder];
      }
      if (cmd === "db_get_tracks") {
        const { page = 0, limit = 500 } = (args as { page?: number; limit?: number }) ?? {};
        const start = page * limit;
        const pageItems = allTracks.slice(start, start + limit);
        return {
          items: pageItems,
          total: totalTracks,
          page,
          limit,
        };
      }
      return null;
    });

    await act(async () => {
      await useLibraryStore.getState().refreshFromDatabase();
    });

    const storeState = useLibraryStore.getState();
    expect(storeState.tracks).toHaveLength(totalTracks);
    expect(storeState.tracks[0].id).toBe("track-0");
    expect(storeState.tracks[1199].id).toBe("track-1199");
    expect(storeState.folders[0].trackCount).toBe(totalTracks);
  });

  it("loads all liked songs across multiple pages when liked collection exceeds 500 songs", async () => {
    const totalLiked = 750;

    const makeLikedTrack = (index: number): TrackDto => ({
      id: `liked-track-${index}`,
      file_path: `C:/Music/liked-${index}.mp3`,
      title: `Liked Song ${index}`,
      artist_id: "artist-1",
      artist_name: "Artist Name",
      album_id: "album-1",
      album_name: "Album Name",
      album_artist: "Artist Name",
      genre: "Electronic",
      year: 2024,
      duration: 180,
      track_number: index,
      disc_number: 1,
      folder_id: "folder-1",
      file_size_bytes: 3500000,
      bitrate: 320,
      format: "mp3",
      cover_art_path: null,
      liked_at: 1000,
      file_modified_at: 1000,
      is_favorite: true,
      play_count: 5,
      last_played_at: 1000,
      created_at: 1000,
      updated_at: 1000,
    });

    const allLikedTracks: TrackDto[] = Array.from({ length: totalLiked }, (_, i) => makeLikedTrack(i));

    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "db_get_tracks") {
        const { page = 0, limit = 500 } = (args as { page?: number; limit?: number }) ?? {};
        const start = page * limit;
        const pageItems = allLikedTracks.slice(start, start + limit);
        return {
          items: pageItems,
          total: totalLiked,
          page,
          limit,
        };
      }
      return null;
    });

    await act(async () => {
      await useLikedSongsStore.getState().initializeLikedSongs();
    });

    const likedState = useLikedSongsStore.getState();
    expect(likedState.tracks).toHaveLength(totalLiked);
    expect(likedState.tracks[0].id).toBe("liked-track-0");
    expect(likedState.tracks[749].id).toBe("liked-track-749");
    expect(likedState.isLoaded).toBe(true);
  });
});