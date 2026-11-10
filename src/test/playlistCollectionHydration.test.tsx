import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import { computeYourCollectionsCards, CuratedGrid } from "../components/home/CuratedGrid";
import { Playlists } from "../pages/Playlists";
import { PlaylistCard } from "../components/playlists/PlaylistCard";
import { AddSongsDrawer } from "../components/playlists/AddSongsDrawer";
import {
  usePlaylistStore,
  findTrackForPlaylist,
  calculatePlaylistDuration,
  formatPlaylistTotalDuration,
} from "../store/usePlaylistStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useToastStore } from "../store/useToastStore";
import * as dbServices from "../services/db";
import type { Playlist } from "../types/playlist";
import type { Album } from "../types/album";
import type { PlaylistDto, PlaylistDetailDto } from "../types/database";
import type { LibraryTrack } from "../types/library";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
  invoke: vi.fn(),
}));

describe("Playlist and Saved Collection Hydration (Feature 28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    usePlaylistStore.setState({
      playlists: [],
      playlistTracks: {},
      activePlaylistId: null,
      overviewSearchQuery: "",
      detailSearchQuery: "",
      isLoaded: false,
      isLoading: false,
      error: null,
      isDetailLoading: false,
      detailError: null,
    });
    useAlbumStore.setState({
      albums: [],
      albumTracks: {},
      activeAlbumId: null,
      searchQuery: "",
      isLoaded: false,
      isLoading: false,
      error: null,
    });
    usePlayerStore.setState({
      isPlaying: false,
      queue: [],
      currentIndex: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("computeYourCollectionsCards (AC-2)", () => {
    const makePlaylists = (count: number): Playlist[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `pl-${i + 1}`,
        title: `Playlist ${i + 1}`,
        description: `Desc ${i + 1}`,
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: i === 0,
        trackCount: (i + 1) * 2,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      }));

    const makeAlbums = (count: number): Album[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `alb-${i + 1}`,
        title: `Album ${i + 1}`,
        artistId: `art-${i + 1}`,
        artistName: `Artist ${i + 1}`,
        coverUrl: `http://example.com/art-${i + 1}.jpg`,
        releaseYear: 2024,
        genre: "Electronic",
        trackCount: (i + 1) * 3,
        totalDuration: 1800,
        isFavorite: false,
        createdAt: "2026-10-20T22:30:00Z",
      }));

    it("balances 3 playlists and 3 albums when both collections have 3 or more records (AC-2)", () => {
      const playlists = makePlaylists(5);
      const albums = makeAlbums(5);
      const cards = computeYourCollectionsCards(playlists, albums);

      expect(cards).toHaveLength(6);
      expect(cards.filter((c) => c.type === "playlist")).toHaveLength(3);
      expect(cards.filter((c) => c.type === "album")).toHaveLength(3);

      // Sequential ordering: qualifying playlists first, followed by albums
      expect(cards[0].id).toBe("pl-1");
      expect(cards[1].id).toBe("pl-2");
      expect(cards[2].id).toBe("pl-3");
      expect(cards[3].id).toBe("alb-1");
      expect(cards[4].id).toBe("alb-2");
      expect(cards[5].id).toBe("alb-3");
    });

    it("fills unused album slots when playlists count is under three (AC-2)", () => {
      const playlists = makePlaylists(1);
      const albums = makeAlbums(10);
      const cards = computeYourCollectionsCards(playlists, albums);

      expect(cards).toHaveLength(6);
      expect(cards.filter((c) => c.type === "playlist")).toHaveLength(1);
      expect(cards.filter((c) => c.type === "album")).toHaveLength(5);
      expect(cards[0].id).toBe("pl-1");
      expect(cards[1].id).toBe("alb-1");
    });

    it("fills unused playlist slots when albums count is under three (AC-2)", () => {
      const playlists = makePlaylists(8);
      const albums = makeAlbums(1);
      const cards = computeYourCollectionsCards(playlists, albums);

      expect(cards).toHaveLength(6);
      expect(cards.filter((c) => c.type === "playlist")).toHaveLength(5);
      expect(cards.filter((c) => c.type === "album")).toHaveLength(1);
      expect(cards[0].id).toBe("pl-1");
      expect(cards[4].id).toBe("pl-5");
      expect(cards[5].id).toBe("alb-1");
    });

    it("handles zero playlists by showing up to six albums (AC-2)", () => {
      const playlists: Playlist[] = [];
      const albums = makeAlbums(8);
      const cards = computeYourCollectionsCards(playlists, albums);

      expect(cards).toHaveLength(6);
      expect(cards.every((c) => c.type === "album")).toBe(true);
    });

    it("handles zero albums by showing up to six playlists (AC-2)", () => {
      const playlists = makePlaylists(8);
      const albums: Album[] = [];
      const cards = computeYourCollectionsCards(playlists, albums);

      expect(cards).toHaveLength(6);
      expect(cards.every((c) => c.type === "playlist")).toBe(true);
    });
  });

  describe("Tauri SQLite Store Hydration and Failure Resilience (AC-1)", () => {
    it("clears playlists to empty array on Tauri database error and never falls back to fixtures (AC-1)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      vi.spyOn(dbServices, "dbGetPlaylists").mockRejectedValue(
        new Error("SQLite query failed: connection busy")
      );

      await act(async () => {
        await usePlaylistStore.getState().initializePlaylists();
      });

      const state = usePlaylistStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.playlists).toEqual([]);
      expect(state.error).toContain("SQLite query failed");
    });

    it("clears albums to empty array on Tauri database error and never falls back to fixtures (AC-1)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      vi.spyOn(dbServices, "dbGetAlbums").mockRejectedValue(
        new Error("SQLite album query failure")
      );

      await act(async () => {
        await useAlbumStore.getState().initializeAlbums();
      });

      const state = useAlbumStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.albums).toEqual([]);
      expect(state.error).toContain("SQLite album query failure");
    });

    it("ignores duplicate store initialization calls while loading is active (AC-1)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      let resolveFirstCall: (value: PlaylistDto[]) => void;
      const firstCallPromise = new Promise<PlaylistDto[]>((resolve) => {
        resolveFirstCall = resolve;
      });

      const dbGetPlaylistsSpy = vi
        .spyOn(dbServices, "dbGetPlaylists")
        .mockReturnValueOnce(firstCallPromise);

      // Start initial load
      const promise1 = usePlaylistStore.getState().initializePlaylists();
      expect(usePlaylistStore.getState().isLoading).toBe(true);

      // Second invocation while isLoading is true
      const promise2 = usePlaylistStore.getState().initializePlaylists();
      expect(dbGetPlaylistsSpy).toHaveBeenCalledTimes(1);

      resolveFirstCall!([]);
      await promise1;
      await promise2;
      expect(dbGetPlaylistsSpy).toHaveBeenCalledTimes(1);
    });

    it("renders loading skeletons on Playlists screen during initial load (AC-1)", () => {
      usePlaylistStore.setState({
        playlists: [],
        isLoading: true,
      });

      render(<Playlists />);
      expect(screen.getByRole("region", { name: "Loading playlists" })).toBeInTheDocument();
    });

    it("renders visible retry action when Playlists overview fetch fails (AC-1)", () => {
      usePlaylistStore.setState({
        playlists: [],
        isLoading: false,
        error: "Failed to open SQLite database file",
      });

      const initSpy = vi.fn().mockResolvedValue(undefined);
      usePlaylistStore.setState({ initializePlaylists: initSpy });

      render(<Playlists />);
      expect(screen.getByRole("alert", { name: "Playlists load error" })).toBeInTheDocument();
      expect(screen.getByText("Failed to open SQLite database file")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: "Retry loading playlists" });
      fireEvent.click(retryBtn);
      expect(initSpy).toHaveBeenCalled();
    });

    it("renders detail loading skeletons and error retry on playlist detail view (AC-1)", () => {
      const activePlaylist: Playlist = {
        id: "active-1",
        title: "Deep Focus",
        description: "Coding beats",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 5,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      usePlaylistStore.setState({
        activePlaylistId: "active-1",
        playlists: [activePlaylist],
        playlistTracks: {},
        isDetailLoading: true,
        detailError: null,
      });

      const { rerender } = render(<Playlists />);
      expect(screen.getByRole("region", { name: "Loading playlist songs" })).toBeInTheDocument();

      // Switch to detail error
      usePlaylistStore.setState({
        isDetailLoading: false,
        detailError: "Disk I/O error reading playlist entries",
      });
      rerender(<Playlists />);

      expect(screen.getByRole("alert", { name: "Playlist detail error" })).toBeInTheDocument();
      expect(screen.getByText("Disk I/O error reading playlist entries")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry loading playlist songs" })).toBeInTheDocument();
    });
  });

  describe("Home Your Collections Grid and Independent Source Failure (AC-2, AC-3)", () => {
    it("renders up to six cards with playlists first followed by albums (AC-2)", () => {
      const playlists: Playlist[] = [
        {
          id: "p1",
          title: "Midnight Vibez",
          description: "Night beats",
          coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
          isCurated: true,
          trackCount: 4,
          createdAt: "2026-10-20T22:30:00Z",
          updatedAt: "2026-10-20T22:30:00Z",
        },
      ];
      const albums: Album[] = [
        {
          id: "a1",
          title: "Echoes of Dawn",
          artistId: "art-1",
          artistName: "Luna Bay",
          coverUrl: "http://example.com/luna.jpg",
          releaseYear: 2025,
          genre: "Ambient",
          trackCount: 8,
          totalDuration: 2400,
          isFavorite: false,
          createdAt: "2026-10-20T22:30:00Z",
        },
      ];

      usePlaylistStore.setState({ playlists, isLoaded: true, isLoading: false, error: null });
      useAlbumStore.setState({ albums, isLoaded: true, isLoading: false, error: null });

      render(<CuratedGrid title="Your Collections" />);

      expect(screen.getByText("Your Collections")).toBeInTheDocument();
      expect(screen.getByText("Midnight Vibez")).toBeInTheDocument();
      expect(screen.getByText("Echoes of Dawn")).toBeInTheDocument();

      const openPlaylistBtn = screen.getByRole("button", { name: "Open Midnight Vibez playlist" });
      const openAlbumBtn = screen.getByRole("button", { name: "Open Echoes of Dawn album" });
      expect(openPlaylistBtn).toBeInTheDocument();
      expect(openAlbumBtn).toBeInTheDocument();
    });

    it("displays inline retry card in first slot of failed source while keeping healthy source cards (AC-3)", () => {
      const albums: Album[] = [
        {
          id: "a1",
          title: "Sunrise Echoes",
          artistId: "art-1",
          artistName: "Solaris",
          coverUrl: "http://example.com/solaris.jpg",
          releaseYear: 2024,
          genre: "Synth",
          trackCount: 6,
          totalDuration: 1900,
          isFavorite: false,
          createdAt: "2026-10-20T22:30:00Z",
        },
      ];

      // Playlists failed, albums succeeded
      usePlaylistStore.setState({
        playlists: [],
        isLoaded: true,
        isLoading: false,
        error: "Database locked",
      });
      useAlbumStore.setState({
        albums,
        isLoaded: true,
        isLoading: false,
        error: null,
      });

      render(<CuratedGrid title="Your Collections" />);

      // Successful album card is still visible
      expect(screen.getByText("Sunrise Echoes")).toBeInTheDocument();
      // Failed playlist inline retry card is displayed in first slot
      expect(screen.getByRole("alert", { name: "Failed to load playlists" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry loading playlists" })).toBeInTheDocument();
    });

    it("displays inline retry card for album failure while keeping healthy playlists (AC-3)", () => {
      const playlists: Playlist[] = [
        {
          id: "p1",
          title: "Golden Hour Melodies",
          description: "Warm sunset sounds",
          coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
          isCurated: false,
          trackCount: 3,
          createdAt: "2026-10-20T22:30:00Z",
          updatedAt: "2026-10-20T22:30:00Z",
        },
      ];

      usePlaylistStore.setState({
        playlists,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
      useAlbumStore.setState({
        albums: [],
        isLoaded: true,
        isLoading: false,
        error: "Corrupt index",
      });

      render(<CuratedGrid title="Your Collections" />);

      expect(screen.getByText("Golden Hour Melodies")).toBeInTheDocument();
      expect(screen.getByRole("alert", { name: "Failed to load albums" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry loading albums" })).toBeInTheDocument();
    });

    it("displays helpful guidance and actions to open Playlists and add music when both collections are empty (AC-3)", () => {
      usePlayerStore.setState({ curatedCollections: [] });
      usePlaylistStore.setState({
        playlists: [],
        isLoaded: true,
        isLoading: false,
        error: null,
      });
      useAlbumStore.setState({
        albums: [],
        isLoaded: true,
        isLoading: false,
        error: null,
      });

      const onNavigate = vi.fn();
      render(<CuratedGrid title="Your Collections" onNavigate={onNavigate} />);

      expect(screen.getByRole("region", { name: "Empty collections guidance" })).toBeInTheDocument();
      expect(screen.getByText("No collections available yet")).toBeInTheDocument();

      const openPlaylistsBtn = screen.getByRole("button", { name: "Open Playlists" });
      const addMusicBtn = screen.getByRole("button", { name: "Add Music" });

      fireEvent.click(openPlaylistsBtn);
      expect(onNavigate).toHaveBeenCalledWith("Playlists");

      fireEvent.click(addMusicBtn);
      expect(onNavigate).toHaveBeenCalledWith("Your Library");
    });
  });

  describe("Navigation, Play Actions, and Disabled Controls (AC-4, AC-5)", () => {
    it("navigates to Playlists screen when clicking See all (AC-4)", () => {
      const onNavigate = vi.fn();
      render(<CuratedGrid title="Your Collections" onNavigate={onNavigate} />);

      const seeAllBtn = screen.getByRole("button", { name: "See all playlists" });
      fireEvent.click(seeAllBtn);
      expect(onNavigate).toHaveBeenCalledWith("Playlists");
    });

    it("navigates to album detail when clicking an album card (AC-4)", () => {
      const onNavigate = vi.fn();
      const albums: Album[] = [
        {
          id: "alb-99",
          title: "Neon Horizon",
          artistId: "art-1",
          artistName: "Retro Wave",
          coverUrl: "",
          releaseYear: 2026,
          genre: "Synth",
          trackCount: 4,
          totalDuration: 1200,
          isFavorite: false,
          createdAt: "2026-10-20T22:30:00Z",
        },
      ];

      useAlbumStore.setState({ albums, isLoaded: true, isLoading: false, error: null });
      render(<CuratedGrid title="Your Collections" onNavigate={onNavigate} />);

      const albumCard = screen.getByRole("button", { name: "Open Neon Horizon album" });
      fireEvent.click(albumCard);

      expect(useAlbumStore.getState().activeAlbumId).toBe("alb-99");
      expect(onNavigate).toHaveBeenCalledWith("Albums");
    });

    it("navigates to playlist detail when clicking a playlist card (AC-4)", () => {
      const onNavigate = vi.fn();
      const playlists: Playlist[] = [
        {
          id: "pl-42",
          title: "Study Sessions",
          description: "Ambient noise",
          coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
          isCurated: false,
          trackCount: 5,
          createdAt: "2026-10-20T22:30:00Z",
          updatedAt: "2026-10-20T22:30:00Z",
        },
      ];

      usePlaylistStore.setState({ playlists, isLoaded: true, isLoading: false, error: null });
      render(<CuratedGrid title="Your Collections" onNavigate={onNavigate} />);

      const playlistCard = screen.getByRole("button", { name: "Open Study Sessions playlist" });
      fireEvent.click(playlistCard);

      expect(usePlaylistStore.getState().activePlaylistId).toBe("pl-42");
      expect(onNavigate).toHaveBeenCalledWith("Playlists");
    });

    it("disables Play button on playlist card with zero tracks and provides accessible tooltip (AC-4, AC-5)", () => {
      const emptyPlaylist: Playlist = {
        id: "pl-empty",
        title: "Empty Mix",
        description: "No songs yet",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 0,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      render(<PlaylistCard playlist={emptyPlaylist} />);

      const playBtn = screen.getByRole("button", {
        name: "Play disabled, Empty Mix has no tracks",
      });
      expect(playBtn).toBeDisabled();
      expect(playBtn).toHaveAttribute("title", "Tracks must be added first");
      expect(playBtn).toHaveAttribute("aria-disabled", "true");
    });

    it("fetches ordered entries from SQLite and starts playback when selecting Play on playlist card (AC-4)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      const playlist: Playlist = {
        id: "pl-fetch",
        title: "Late Night Drive",
        description: "Nocturnal beats",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 2,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      const detailDto: PlaylistDetailDto = {
        playlist: {
          id: "pl-fetch",
          name: "Late Night Drive",
          description: "Nocturnal beats",
          cover_art_path: null,
          gradient_preset: null,
          is_favorite: false,
          is_curated: false,
          track_count: 2,
          created_at: 1729463400,
          updated_at: 1729463400,
        },
        tracks: [
          {
            id: "entry-1",
            playlist_id: "pl-fetch",
            position: 0,
            added_at: 1729463410,
            track: {
              id: "t-1",
              title: "Midnight Drive",
              artist_id: "art-1",
              artist_name: "Aiden Vale",
              album_id: "alb-1",
              album_name: "Midnight Vibes",
              album_artist: "Aiden Vale",
              duration: 180,
              year: 2024,
              genre: "Chill",
              disc_number: 1,
              track_number: 1,
              bitrate: 320,
              format: "mp3",
              cover_art_path: null,
              file_path: "/music/track1.mp3",
              is_favorite: false,
              liked_at: null,
              play_count: 10,
              last_played_at: null,
              file_modified_at: 1729463400,
              file_size_bytes: 4000000,
              folder_id: "f-1",
              created_at: 1729463400,
              updated_at: 1729463400,
            },
          },
        ],
      };

      vi.spyOn(dbServices, "dbGetPlaylistDetails").mockResolvedValue(detailDto);

      usePlaylistStore.setState({
        playlists: [playlist],
        playlistTracks: {},
      });

      render(<PlaylistCard playlist={playlist} />);

      const playBtn = screen.getByRole("button", { name: "Play Late Night Drive" });
      await act(async () => {
        fireEvent.click(playBtn);
      });

      const playerState = usePlayerStore.getState();
      expect(playerState.isPlaying).toBe(true);
      expect(playerState.currentTrack?.title).toBe("Midnight Drive");
      expect(playerState.playbackContext?.type).toBe("playlist");
      expect(playerState.playbackContext?.id).toBe("pl-fetch");
    });

    it("shows toast notice when playlist detail fetch fails during quick play (AC-4)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      vi.spyOn(dbServices, "dbGetPlaylistDetails").mockRejectedValue(
        new Error("Database connection closed")
      );

      const playlist: Playlist = {
        id: "pl-fail",
        title: "Failed Playlist",
        description: "Error test",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 3,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      usePlaylistStore.setState({
        playlists: [playlist],
        playlistTracks: {},
      });

      render(<PlaylistCard playlist={playlist} />);

      const playBtn = screen.getByRole("button", { name: "Play Failed Playlist" });
      await act(async () => {
        fireEvent.click(playBtn);
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(toasts[0].message).toContain("Failed to load playlist tracks");
      expect(toasts[0].type).toBe("error");
    });
  });

  describe("AddSongsDrawer Library Track Sourcing", () => {
    it("renders user library tracks in Tauri mode instead of demo catalog tracks", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      const realTrack: LibraryTrack = {
        id: "real-lib-track-1",
        title: "Real Local Track",
        artist: "Real Local Artist",
        album: "Real Local Album",
        durationSeconds: 210,
        artworkUrl: "http://asset.localhost/real.jpg",
        playsCount: 5,
        isLiked: true,
        filePath: "C:/music/real.mp3",
        folderId: "folder-1",
        dateAdded: "2026-11-01",
        genre: "Acoustic",
      };

      useLibraryStore.setState({
        tracks: [realTrack],
      });

      const playlist: Playlist = {
        id: "pl-test",
        title: "Test Playlist",
        description: "Test",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 0,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      usePlaylistStore.setState({
        playlists: [playlist],
        playlistTracks: { "pl-test": [] },
        activePlaylistId: "pl-test",
        isAddSongsDrawerOpen: true,
      });

      render(<AddSongsDrawer />);

      expect(screen.getByText("Real Local Track")).toBeInTheDocument();
      expect(screen.getByText(/Real Local Artist/)).toBeInTheDocument();
      expect(screen.queryByText("Neon Nights")).not.toBeInTheDocument();
      expect(screen.queryByText("Cyber City")).not.toBeInTheDocument();
    });

    it("displays empty library guidance in Tauri mode when library has no tracks", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      useLibraryStore.setState({
        tracks: [],
      });

      const playlist: Playlist = {
        id: "pl-empty-lib",
        title: "Empty Lib Playlist",
        description: "Test",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 0,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      usePlaylistStore.setState({
        playlists: [playlist],
        playlistTracks: { "pl-empty-lib": [] },
        activePlaylistId: "pl-empty-lib",
        isAddSongsDrawerOpen: true,
      });

      render(<AddSongsDrawer />);

      expect(
        screen.getByText(/No songs found in your library. Add music folders in Your Library/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Neon Nights")).not.toBeInTheDocument();
    });

    it("persists library track addition to SQLite in Tauri mode", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      const addTracksSpy = vi
        .spyOn(dbServices, "dbAddTracksToPlaylist")
        .mockResolvedValue(undefined as never);
      vi.spyOn(dbServices, "dbGetPlaylistDetails").mockResolvedValue({
        playlist: {
          id: "pl-persist",
          name: "Persist Playlist",
          description: "",
          gradient_preset: "",
          cover_art_path: null,
          is_favorite: false,
          is_curated: false,
          created_at: 1000,
          updated_at: 1000,
          track_count: 1,
        },
        tracks: [
          {
            id: "entry-1",
            playlist_id: "pl-persist",
            position: 0,
            added_at: 1000,
            track: {
              id: "real-lib-track-1",
              title: "Real Local Track",
              artist_name: "Real Local Artist",
              artist_id: null,
              album_name: "Real Local Album",
              album_id: null,
              album_artist: null,
              duration: 210,
              year: 2024,
              genre: "Acoustic",
              disc_number: 1,
              track_number: 1,
              bitrate: 320,
              format: "mp3",
              cover_art_path: null,
              file_path: "C:/music/real.mp3",
              is_favorite: true,
              liked_at: null,
              play_count: 5,
              last_played_at: null,
              file_modified_at: 1000,
              file_size_bytes: 5000000,
              folder_id: "folder-1",
              created_at: 1000,
              updated_at: 1000,
            },
          },
        ],
      });

      const realTrack: LibraryTrack = {
        id: "real-lib-track-1",
        title: "Real Local Track",
        artist: "Real Local Artist",
        album: "Real Local Album",
        durationSeconds: 210,
        artworkUrl: "http://asset.localhost/real.jpg",
        playsCount: 5,
        isLiked: true,
        filePath: "C:/music/real.mp3",
        folderId: "folder-1",
        dateAdded: "2026-11-01",
      };

      useLibraryStore.setState({
        tracks: [realTrack],
      });

      const playlist: Playlist = {
        id: "pl-persist",
        title: "Persist Playlist",
        description: "Test",
        coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
        isCurated: false,
        trackCount: 0,
        createdAt: "2026-10-20T22:30:00Z",
        updatedAt: "2026-10-20T22:30:00Z",
      };

      usePlaylistStore.setState({
        playlists: [playlist],
        playlistTracks: { "pl-persist": [] },
        activePlaylistId: "pl-persist",
        isAddSongsDrawerOpen: true,
      });

      render(<AddSongsDrawer />);

      const addBtn = screen.getByRole("button", { name: /Add Real Local Track to playlist/i });
      await act(async () => {
        fireEvent.click(addBtn);
      });

      expect(addTracksSpy).toHaveBeenCalledWith("pl-persist", ["real-lib-track-1"]);
    });

    it("filters available tracks in AddSongsDrawer by search query across multiple fields", () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      const trackA: LibraryTrack = {
        id: "lib-a",
        title: "Sunset Chords",
        artist: "Golden Duo",
        album: "Summer Horizons",
        durationSeconds: 190,
        artworkUrl: "",
        playsCount: 0,
        isLiked: false,
        filePath: "C:/music/a.mp3",
        folderId: "f1",
        dateAdded: "2026-11-01",
        genre: "Chillout",
      };

      const trackB: LibraryTrack = {
        id: "lib-b",
        title: "Electric Pulse",
        artist: "Cyber Synth",
        album: "Future Beats",
        durationSeconds: 240,
        artworkUrl: "",
        playsCount: 0,
        isLiked: false,
        filePath: "C:/music/b.mp3",
        folderId: "f1",
        dateAdded: "2026-11-01",
        genre: "Electronic",
      };

      useLibraryStore.setState({ tracks: [trackA, trackB] });
      usePlaylistStore.setState({
        playlists: [
          {
            id: "pl-search",
            title: "Search Playlist",
            description: "",
            coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
            isCurated: false,
            createdAt: "",
            updatedAt: "",
          },
        ],
        playlistTracks: { "pl-search": [] },
        activePlaylistId: "pl-search",
        isAddSongsDrawerOpen: true,
      });

      render(<AddSongsDrawer />);

      const searchInput = screen.getByRole("textbox", { name: /Search songs to add/i });

      // Match by genre
      fireEvent.change(searchInput, { target: { value: "Chillout" } });
      expect(screen.getByText("Sunset Chords")).toBeInTheDocument();
      expect(screen.queryByText("Electric Pulse")).not.toBeInTheDocument();

      // Match by album
      fireEvent.change(searchInput, { target: { value: "Future Beats" } });
      expect(screen.queryByText("Sunset Chords")).not.toBeInTheDocument();
      expect(screen.getByText("Electric Pulse")).toBeInTheDocument();

      // No match
      fireEvent.change(searchInput, { target: { value: "NonExistentTrackQuery" } });
      expect(screen.getByText(/No songs found matching/i)).toBeInTheDocument();
    });

    it("displays count badge when track is already in playlist and closes on escape key", () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);

      const trackA: LibraryTrack = {
        id: "lib-existing",
        title: "Already Added Track",
        artist: "Artist X",
        album: "Album X",
        durationSeconds: 180,
        artworkUrl: "",
        playsCount: 0,
        isLiked: false,
        filePath: "C:/music/x.mp3",
        folderId: "f1",
        dateAdded: "2026-11-01",
      };

      useLibraryStore.setState({ tracks: [trackA] });
      usePlaylistStore.setState({
        playlists: [
          {
            id: "pl-badge",
            title: "Badge Playlist",
            description: "",
            coverGradient: "linear-gradient(180deg, #12141e, #2b2230)",
            isCurated: false,
            createdAt: "",
            updatedAt: "",
          },
        ],
        playlistTracks: {
          "pl-badge": [
            {
              entryId: "e1",
              playlistId: "pl-badge",
              trackId: "lib-existing",
              position: 0,
              addedAt: "",
            },
          ],
        },
        activePlaylistId: "pl-badge",
        isAddSongsDrawerOpen: true,
      });

      render(<AddSongsDrawer />);

      expect(screen.getByText("Add (1)")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog", { name: /Add Songs/i });
      fireEvent.keyDown(dialog, { key: "Escape" });

      expect(usePlaylistStore.getState().isAddSongsDrawerOpen).toBe(false);
    });
  });

  describe("Playlist Store Track Resolution and Duration Formatting", () => {
    it("findTrackForPlaylist resolves from library store and caches in memory", () => {
      const track: LibraryTrack = {
        id: "lib-cache-test",
        title: "Cached Lib Track",
        artist: "Cache Artist",
        album: "Cache Album",
        durationSeconds: 205,
        artworkUrl: "http://cover.jpg",
        playsCount: 3,
        isLiked: true,
        filePath: "C:/music/cache.mp3",
        folderId: "f1",
        dateAdded: "2026-11-01",
        genre: "Jazz",
      };

      useLibraryStore.setState({ tracks: [track] });

      const resolved = findTrackForPlaylist("lib-cache-test");
      expect(resolved).toBeDefined();
      expect(resolved?.title).toBe("Cached Lib Track");
      expect(resolved?.artist).toBe("Cache Artist");
      expect(resolved?.durationSeconds).toBe(205);

      // Verify second lookup uses cache even if removed from library store
      useLibraryStore.setState({ tracks: [] });
      const cached = findTrackForPlaylist("lib-cache-test");
      expect(cached).toBeDefined();
      expect(cached?.title).toBe("Cached Lib Track");
    });

    it("formats playlist duration correctly across 0 seconds, minutes, and hours", () => {
      expect(formatPlaylistTotalDuration(0)).toBe("0 min");
      expect(formatPlaylistTotalDuration(-10)).toBe("0 min");
      expect(formatPlaylistTotalDuration(45)).toBe("45 sec");
      expect(formatPlaylistTotalDuration(185)).toBe("3 min 5 sec");
      expect(formatPlaylistTotalDuration(3665)).toBe("1 hr 1 min");
    });

    it("calculates cumulative playlist duration from entries", () => {
      const trackA: LibraryTrack = {
        id: "dur-a",
        title: "Track A",
        artist: "A",
        album: "Alb",
        durationSeconds: 120,
        artworkUrl: "",
        playsCount: 0,
        isLiked: false,
        filePath: "",
        folderId: "",
        dateAdded: "",
      };
      const trackB: LibraryTrack = {
        id: "dur-b",
        title: "Track B",
        artist: "B",
        album: "Alb",
        durationSeconds: 180,
        artworkUrl: "",
        playsCount: 0,
        isLiked: false,
        filePath: "",
        folderId: "",
        dateAdded: "",
      };

      useLibraryStore.setState({ tracks: [trackA, trackB] });

      const entries = [
        { entryId: "e1", playlistId: "p", trackId: "dur-a", position: 0, addedAt: "" },
        { entryId: "e2", playlistId: "p", trackId: "dur-b", position: 1, addedAt: "" },
      ];

      const total = calculatePlaylistDuration(entries);
      expect(total).toBe(300);
      expect(formatPlaylistTotalDuration(total)).toBe("5 min 0 sec");
    });
  });
});
