import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  dbAddFolder,
  dbAddTracksToPlaylist,
  dbCreatePlaylist,
  dbDeletePlaylist,
  dbGetAlbumDetails,
  dbGetAlbums,
  dbGetArtistProfile,
  dbGetArtists,
  dbGetFolders,
  dbGetPlaylistDetails,
  dbGetPlaylists,
  dbGetSetting,
  dbGetStatus,
  dbGetTrackById,
  dbGetTracks,
  dbIncrementPlayCount,
  dbRemoveFolder,
  dbRemovePlaylistTrack,
  dbReorderPlaylistTracks,
  dbSetSetting,
  dbToggleTrackFavorite,
  dbUpdatePlaylist,
} from "../db";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("Database Service (src/services/db.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dbGetStatus invokes db_get_status command and returns status report", async () => {
    const mockStatus = {
      is_ready: true,
      schema_version: 1,
      database_path: "C:/Users/AppData/mutinhimira.db",
      track_count: 1420,
      album_count: 85,
      artist_count: 32,
      playlist_count: 5,
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

    const result = await dbGetStatus();
    expect(invoke).toHaveBeenCalledWith("db_get_status");
    expect(result).toEqual(mockStatus);
  });

  it("dbGetFolders and dbAddFolder handle monitored library directories", async () => {
    const mockFolders = [
      {
        id: "f-1",
        path: "D:/Music/Flac",
        added_at: 1700000000,
        last_scanned_at: null,
        is_active: true,
      },
    ];
    vi.mocked(invoke).mockResolvedValueOnce(mockFolders);

    const folders = await dbGetFolders();
    expect(invoke).toHaveBeenCalledWith("db_get_folders");
    expect(folders).toHaveLength(1);

    const newFolder = {
      id: "f-2",
      path: "D:/Music/HiRes",
      added_at: 1700000100,
      last_scanned_at: null,
      is_active: true,
    };
    vi.mocked(invoke).mockResolvedValueOnce(newFolder);

    const added = await dbAddFolder("D:/Music/HiRes");
    expect(invoke).toHaveBeenCalledWith("db_add_folder", {
      path: "D:/Music/HiRes",
    });
    expect(added.path).toBe("D:/Music/HiRes");
  });

  it("dbRemoveFolder deactivates and removes folder record", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(true);

    const removed = await dbRemoveFolder("f-2");
    expect(invoke).toHaveBeenCalledWith("db_remove_folder", { id: "f-2" });
    expect(removed).toBe(true);
  });

  it("dbGetTracks passes pagination and filter arguments", async () => {
    const mockPage = {
      items: [
        {
          id: "trk-1",
          file_path: "/music/track1.mp3",
          title: "Midnight Drive",
          artist_id: "art-1",
          artist_name: "Kavinsky",
          album_id: "alb-1",
          album_name: "Outrun",
          album_artist: null,
          duration: 215.5,
          year: 2013,
          genre: "Synthwave",
          disc_number: 1,
          track_number: 1,
          bitrate: 320,
          format: "mp3",
          cover_art_path: null,
          is_favorite: true,
          play_count: 14,
          last_played_at: 1700000500,
          file_modified_at: 1690000000,
          file_size_bytes: 8400000,
          folder_id: "f-1",
          created_at: 1700000000,
          updated_at: 1700000500,
        },
      ],
      total: 1,
      page: 0,
      limit: 50,
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockPage);

    const result = await dbGetTracks(0, 50, { is_favorite: true });
    expect(invoke).toHaveBeenCalledWith("db_get_tracks", {
      page: 0,
      limit: 50,
      filter: { is_favorite: true },
    });
    expect(result.items[0].title).toBe("Midnight Drive");
  });

  it("dbGetTrackById, dbToggleTrackFavorite, and dbIncrementPlayCount work reliably", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      id: "trk-1",
      title: "Midnight Drive",
    });
    const track = await dbGetTrackById("trk-1");
    expect(invoke).toHaveBeenCalledWith("db_get_track_by_id", { id: "trk-1" });
    expect(track?.title).toBe("Midnight Drive");

    vi.mocked(invoke).mockResolvedValueOnce(true);
    const favResult = await dbToggleTrackFavorite("trk-1");
    expect(invoke).toHaveBeenCalledWith("db_toggle_track_favorite", {
      id: "trk-1",
    });
    expect(favResult).toBe(true);

    vi.mocked(invoke).mockResolvedValueOnce(15);
    const playCount = await dbIncrementPlayCount("trk-1");
    expect(invoke).toHaveBeenCalledWith("db_increment_play_count", {
      id: "trk-1",
    });
    expect(playCount).toBe(15);
  });

  it("dbGetAlbums and dbGetAlbumDetails retrieve discography", async () => {
    const mockAlbums = [
      {
        id: "alb-1",
        title: "Outrun",
        artist_id: "art-1",
        artist_name: "Kavinsky",
        year: 2013,
        genre: "Synthwave",
        cover_art_path: null,
        total_discs: 1,
        track_count: 13,
        created_at: 1700000000,
        updated_at: 1700000000,
      },
    ];
    vi.mocked(invoke).mockResolvedValueOnce(mockAlbums);

    const albums = await dbGetAlbums();
    expect(invoke).toHaveBeenCalledWith("db_get_albums");
    expect(albums).toHaveLength(1);

    vi.mocked(invoke).mockResolvedValueOnce({
      album: mockAlbums[0],
      tracks: [],
    });
    const details = await dbGetAlbumDetails("alb-1");
    expect(invoke).toHaveBeenCalledWith("db_get_album_details", {
      id: "alb-1",
    });
    expect(details?.album.title).toBe("Outrun");
  });

  it("dbGetArtists and dbGetArtistProfile query artist catalog", async () => {
    const mockArtists = [
      {
        id: "art-1",
        name: "Kavinsky",
        bio: "French house and synthwave artist",
        avatar_path: null,
        track_count: 13,
        album_count: 1,
        created_at: 1700000000,
        updated_at: 1700000000,
      },
    ];
    vi.mocked(invoke).mockResolvedValueOnce(mockArtists);

    const artists = await dbGetArtists();
    expect(invoke).toHaveBeenCalledWith("db_get_artists");
    expect(artists[0].name).toBe("Kavinsky");

    vi.mocked(invoke).mockResolvedValueOnce({
      artist: mockArtists[0],
      top_tracks: [],
      albums: [],
    });
    const profile = await dbGetArtistProfile("art-1");
    expect(invoke).toHaveBeenCalledWith("db_get_artist_profile", {
      id: "art-1",
    });
    expect(profile?.artist.name).toBe("Kavinsky");
  });

  it("Playlist CRUD and track reordering commands work as expected", async () => {
    const mockPlaylist = {
      id: "pl-1",
      name: "Night Drive",
      description: "Cruising neon highways",
      cover_art_path: null,
      gradient_preset: null,
      is_favorite: false,
      track_count: 0,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    vi.mocked(invoke).mockResolvedValueOnce([mockPlaylist]);
    const playlists = await dbGetPlaylists();
    expect(invoke).toHaveBeenCalledWith("db_get_playlists");
    expect(playlists).toHaveLength(1);

    vi.mocked(invoke).mockResolvedValueOnce(mockPlaylist);
    const created = await dbCreatePlaylist("Night Drive", "Cruising neon highways");
    expect(invoke).toHaveBeenCalledWith("db_create_playlist", {
      payload: {
        name: "Night Drive",
        description: "Cruising neon highways",
      },
    });
    expect(created.id).toBe("pl-1");

    vi.mocked(invoke).mockResolvedValueOnce({
      ...mockPlaylist,
      name: "Night Drive Redux",
    });
    const updated = await dbUpdatePlaylist("pl-1", "Night Drive Redux");
    expect(invoke).toHaveBeenCalledWith("db_update_playlist", {
      id: "pl-1",
      payload: {
        name: "Night Drive Redux",
        description: undefined,
      },
    });
    expect(updated.name).toBe("Night Drive Redux");

    vi.mocked(invoke).mockResolvedValueOnce(2);
    const addedCount = await dbAddTracksToPlaylist("pl-1", ["trk-1", "trk-2"]);
    expect(invoke).toHaveBeenCalledWith("db_add_tracks_to_playlist", {
      playlistId: "pl-1",
      trackIds: ["trk-1", "trk-2"],
    });
    expect(addedCount).toBe(2);

    vi.mocked(invoke).mockResolvedValueOnce(true);
    const reordered = await dbReorderPlaylistTracks("pl-1", ["entry-2", "entry-1"]);
    expect(invoke).toHaveBeenCalledWith("db_reorder_playlist_tracks", {
      playlistId: "pl-1",
      orderedEntryIds: ["entry-2", "entry-1"],
    });
    expect(reordered).toBe(true);

    vi.mocked(invoke).mockResolvedValueOnce(true);
    const removedTrack = await dbRemovePlaylistTrack("pl-1", "entry-1");
    expect(invoke).toHaveBeenCalledWith("db_remove_playlist_track", {
      playlistId: "pl-1",
      entryId: "entry-1",
    });
    expect(removedTrack).toBe(true);

    vi.mocked(invoke).mockResolvedValueOnce({
      playlist: mockPlaylist,
      tracks: [],
    });
    const details = await dbGetPlaylistDetails("pl-1");
    expect(invoke).toHaveBeenCalledWith("db_get_playlist_details", {
      id: "pl-1",
    });
    expect(details?.playlist.id).toBe("pl-1");

    vi.mocked(invoke).mockResolvedValueOnce(true);
    const deleted = await dbDeletePlaylist("pl-1");
    expect(invoke).toHaveBeenCalledWith("db_delete_playlist", { id: "pl-1" });
    expect(deleted).toBe(true);
  });

  it("dbGetSetting and dbSetSetting persist preference key-value pairs", async () => {
    vi.mocked(invoke).mockResolvedValueOnce("0.85");
    const volume = await dbGetSetting("master_volume");
    expect(invoke).toHaveBeenCalledWith("db_get_setting", {
      key: "master_volume",
    });
    expect(volume).toBe("0.85");

    vi.mocked(invoke).mockResolvedValueOnce(true);
    const saved = await dbSetSetting("master_volume", "0.90");
    expect(invoke).toHaveBeenCalledWith("db_set_setting", {
      key: "master_volume",
      value: "0.90",
    });
    expect(saved).toBe(true);
  });
});
