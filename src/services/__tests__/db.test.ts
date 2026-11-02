import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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
  mapAlbumDtoToUi,
  mapArtistDtoToUi,
  mapPlayHistoryDtoToUi,
  mapSearchResultsDtoToUi,
  mapTrackDtoToUi,
} from "../db";
import type {
  AlbumDto,
  ArtistDto,
  PlayHistoryItemDto,
  SearchResultsDto,
  TrackDto,
} from "../../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
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

  describe("Metadata Reading and Cover Art UI Hydration", () => {
    it("mapAlbumDtoToUi hydrates cover art via formatCoverArtUrl and handles defaults", () => {
      const albumWithLocalCover: AlbumDto = {
        id: "alb-1",
        title: "Neon Nights",
        artist_id: "art-1",
        artist_name: "Synthwave Master",
        year: 2024,
        genre: "Electronic",
        cover_art_path: "C:/AppData/covers/synth_cover.jpg",
        total_discs: 1,
        track_count: 8,
        total_duration: 1800,
        is_favorite: true,
        created_at: 1700000000,
        updated_at: 1700000000,
      };

      const uiAlbum = mapAlbumDtoToUi(albumWithLocalCover);
      expect(uiAlbum.id).toBe("alb-1");
      expect(uiAlbum.title).toBe("Neon Nights");
      expect(uiAlbum.artist).toBe("Synthwave Master");
      expect(uiAlbum.releaseYear).toBe(2024);
      expect(uiAlbum.trackCount).toBe(8);
      expect(convertFileSrc).toHaveBeenCalledWith("C:/AppData/covers/synth_cover.jpg");
      expect(uiAlbum.coverUrl).toContain("asset://localhost");

      // Remote cover art
      const albumWithRemoteCover: AlbumDto = {
        ...albumWithLocalCover,
        id: "alb-2",
        cover_art_path: "https://images.example.com/cover.webp",
      };
      expect(mapAlbumDtoToUi(albumWithRemoteCover).coverUrl).toBe(
        "https://images.example.com/cover.webp"
      );

      // Missing or null cover art falls back to default placeholder
      const albumWithoutCover: AlbumDto = {
        ...albumWithLocalCover,
        id: "alb-3",
        cover_art_path: null,
      };
      expect(mapAlbumDtoToUi(albumWithoutCover).coverUrl).toBe(
        "/assets/images/defaults/album-art.webp"
      );

      // Empty string cover art falls back to default placeholder
      const albumWithEmptyCover: AlbumDto = {
        ...albumWithLocalCover,
        id: "alb-4",
        cover_art_path: "",
      };
      expect(mapAlbumDtoToUi(albumWithEmptyCover).coverUrl).toBe(
        "/assets/images/defaults/album-art.webp"
      );
    });

    it("mapArtistDtoToUi hydrates avatar via formatCoverArtUrl and handles defaults", () => {
      const artistWithLocalAvatar: ArtistDto = {
        id: "art-1",
        name: "Test Artist",
        bio: "Bio description",
        avatar_path: "C:/AppData/avatars/artist_thumb.png",
        track_count: 12,
        album_count: 2,
        total_plays: 1500,
        created_at: 1700000000,
        updated_at: 1700000000,
      };

      const uiArtist = mapArtistDtoToUi(artistWithLocalAvatar);
      expect(uiArtist.id).toBe("art-1");
      expect(uiArtist.name).toBe("Test Artist");
      expect(convertFileSrc).toHaveBeenCalledWith("C:/AppData/avatars/artist_thumb.png");
      expect(uiArtist.avatarUrl).toContain("asset://localhost");

      // Remote avatar
      const artistWithRemoteAvatar: ArtistDto = {
        ...artistWithLocalAvatar,
        avatar_path: "https://images.example.com/avatar.jpg",
      };
      expect(mapArtistDtoToUi(artistWithRemoteAvatar).avatarUrl).toBe(
        "https://images.example.com/avatar.jpg"
      );

      // Null avatar falls back to default artist avatar
      const artistWithoutAvatar: ArtistDto = {
        ...artistWithLocalAvatar,
        avatar_path: null,
      };
      expect(mapArtistDtoToUi(artistWithoutAvatar).avatarUrl).toBe(
        "/assets/images/defaults/artist-avatar.webp"
      );

      // Empty string avatar falls back to default artist avatar
      const artistWithEmptyAvatar: ArtistDto = {
        ...artistWithLocalAvatar,
        avatar_path: "   ",
      };
      expect(mapArtistDtoToUi(artistWithEmptyAvatar).avatarUrl).toBe(
        "/assets/images/defaults/artist-avatar.webp"
      );
    });

    it("mapTrackDtoToUi hydrates track metadata and cover art properly", () => {
      const trackDto: TrackDto = {
        id: "trk-100",
        file_path: "D:/Music/Album/01.flac",
        title: "Opening Track",
        artist_id: "art-1",
        artist_name: "Featured Artist",
        album_id: "alb-1",
        album_name: "Greatest Hits",
        album_artist: "Featured Artist",
        duration: 245.8,
        year: 2023,
        genre: "Afrobeats",
        disc_number: 1,
        track_number: 1,
        bitrate: 1411,
        format: "flac",
        cover_art_path: "C:/AppData/covers/flac_cover.jpg",
        is_favorite: true,
        liked_at: 1700000000,
        play_count: 42,
        last_played_at: 1700000100,
        file_modified_at: 1700000000,
        file_size_bytes: 25000000,
        folder_id: "fold-1",
        created_at: 1700000000,
        updated_at: 1700000000,
      };

      const uiTrack = mapTrackDtoToUi(trackDto);
      expect(uiTrack.id).toBe("trk-100");
      expect(uiTrack.title).toBe("Opening Track");
      expect(uiTrack.artist).toBe("Featured Artist");
      expect(uiTrack.album).toBe("Greatest Hits");
      expect(uiTrack.durationSeconds).toBe(246);
      expect(uiTrack.isLiked).toBe(true);
      expect(uiTrack.playsCount).toBe(42);
      expect(uiTrack.genre).toBe("Afrobeats");
      expect(uiTrack.filePath).toBe("D:/Music/Album/01.flac");
      expect(uiTrack.artworkUrl).toContain("asset://localhost");

      // Fallback for null cover
      const trackWithoutCover: TrackDto = {
        ...trackDto,
        cover_art_path: null,
      };
      expect(mapTrackDtoToUi(trackWithoutCover).artworkUrl).toBe(
        "/assets/images/defaults/album-art.webp"
      );
    });

    it("mapSearchResultsDtoToUi hydrates nested track, album, and artist artworks", () => {
      const searchDto: SearchResultsDto = {
        query: "Neon",
        tracks: [
          {
            id: "trk-1",
            file_path: "/music/track.mp3",
            title: "Neon Track",
            artist_id: "art-1",
            artist_name: "Neon Artist",
            album_id: "alb-1",
            album_name: "Neon Album",
            album_artist: null,
            duration: 180,
            year: 2024,
            genre: "Synth",
            disc_number: 1,
            track_number: 1,
            bitrate: 320,
            format: "mp3",
            cover_art_path: "C:/Cache/track_art.jpg",
            is_favorite: false,
            liked_at: null,
            play_count: 5,
            last_played_at: null,
            file_modified_at: 1700000000,
            file_size_bytes: 5000000,
            folder_id: "f-1",
            created_at: 1700000000,
            updated_at: 1700000000,
          },
        ],
        albums: [
          {
            id: "alb-1",
            title: "Neon Album",
            artist_id: "art-1",
            artist_name: "Neon Artist",
            year: 2024,
            genre: "Synth",
            cover_art_path: "C:/Cache/album_art.jpg",
            total_discs: 1,
            track_count: 10,
            total_duration: 2000,
            is_favorite: false,
            created_at: 1700000000,
            updated_at: 1700000000,
          },
        ],
        artists: [
          {
            id: "art-1",
            name: "Neon Artist",
            bio: null,
            avatar_path: "C:/Cache/artist_avatar.jpg",
            track_count: 10,
            album_count: 1,
            total_plays: 50,
            created_at: 1700000000,
            updated_at: 1700000000,
          },
        ],
        playlists: [],
        genres: [],
        total_matches: 3,
        execution_time_ms: 12.5,
      };

      const uiResults = mapSearchResultsDtoToUi(searchDto);
      expect(uiResults.tracks[0].artworkUrl).toContain("asset://localhost");
      expect(uiResults.albums[0].coverUrl).toContain("asset://localhost");
      expect(uiResults.artists[0].avatarUrl).toContain("asset://localhost");
    });

    it("mapPlayHistoryDtoToUi hydrates track entity artwork inside listening history", () => {
      const historyItem: PlayHistoryItemDto = {
        id: "hist-1",
        track_id: "trk-1",
        played_at: 1700000500,
        context_title: "My Chill Mix",
        context_type: "playlist",
        track: {
          id: "trk-1",
          file_path: "/music/track.mp3",
          title: "Chill Song",
          artist_id: "art-1",
          artist_name: "Chill Artist",
          album_id: "alb-1",
          album_name: "Chill Album",
          album_artist: null,
          duration: 200,
          year: 2022,
          genre: "Ambient",
          disc_number: 1,
          track_number: 2,
          bitrate: 320,
          format: "mp3",
          cover_art_path: "C:/Cache/ambient_art.jpg",
          is_favorite: true,
          liked_at: 1700000000,
          play_count: 10,
          last_played_at: 1700000500,
          file_modified_at: 1700000000,
          file_size_bytes: 4000000,
          folder_id: "f-1",
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      };

      const uiHistory = mapPlayHistoryDtoToUi(historyItem);
      expect(uiHistory.id).toBe("hist-1");
      expect(uiHistory.trackId).toBe("trk-1");
      expect(uiHistory.contextTitle).toBe("My Chill Mix");
      expect(uiHistory.track.artworkUrl).toContain("asset://localhost");
    });
  });
});
