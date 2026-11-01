import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Home } from "../pages/Home";
import { usePlayerStore } from "../store/usePlayerStore";
import type { PlayHistoryItemDto, TrackDto, DatabaseStatusDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

const mockTrackDto1: TrackDto = {
  id: "trk-1",
  file_path: "/music/track1.mp3",
  title: "Zuva Rimwe",
  artist_id: "art-1",
  artist_name: "Oliver Mtukudzi",
  album_id: "alb-1",
  album_name: "Tuku Music",
  album_artist: "Oliver Mtukudzi",
  duration: 240,
  year: 1999,
  genre: "Afropop",
  disc_number: 1,
  track_number: 1,
  bitrate: 320,
  format: "mp3",
  cover_art_path: "/music/cover1.jpg",
  is_favorite: true,
  liked_at: 1700000000,
  play_count: 42,
  last_played_at: 1700005000,
  file_modified_at: 1700000000,
  file_size_bytes: 8000000,
  folder_id: "fld-1",
  created_at: 1700000000,
  updated_at: 1700000000,
};

const mockTrackDto2: TrackDto = {
  id: "trk-2",
  file_path: "/music/track2.mp3",
  title: "Todii",
  artist_id: "art-1",
  artist_name: "Oliver Mtukudzi",
  album_id: "alb-1",
  album_name: "Tuku Music",
  album_artist: "Oliver Mtukudzi",
  duration: 210,
  year: 1999,
  genre: "Afropop",
  disc_number: 1,
  track_number: 2,
  bitrate: 320,
  format: "mp3",
  cover_art_path: null,
  is_favorite: false,
  liked_at: null,
  play_count: 15,
  last_played_at: 1700004000,
  file_modified_at: 1700000000,
  file_size_bytes: 7000000,
  folder_id: "fld-1",
  created_at: 1700000000,
  updated_at: 1700000000,
};

const mockRecentPlaysDto: PlayHistoryItemDto[] = [
  {
    id: "hist-1",
    track_id: "trk-1",
    played_at: 1700005000,
    context_title: "Tuku Music",
    context_type: "album",
    track: mockTrackDto1,
  },
  {
    id: "hist-2",
    track_id: "trk-2",
    played_at: 1700004000,
    context_title: "Top Zimbabwe",
    context_type: "playlist",
    track: mockTrackDto2,
  },
];

const mockStatusDto: DatabaseStatusDto = {
  is_ready: true,
  schema_version: 5,
  database_path: "/data/mutinhimira.db",
  track_count: 120,
  album_count: 10,
  artist_count: 8,
  playlist_count: 3,
};

describe("Home Listening History and Popular Tracks Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTauri).mockReturnValue(true);

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "db_get_status") {
        return mockStatusDto;
      }
      if (cmd === "db_get_recent_plays") {
        return mockRecentPlaysDto;
      }
      if (cmd === "db_get_popular_tracks") {
        return [mockTrackDto1, mockTrackDto2];
      }
      if (cmd === "db_clear_playback_history") {
        return undefined;
      }
      if (cmd === "audio_play_track") {
        return {
          track_id: "trk-1",
          file_path: "/music/track1.mp3",
          status: "playing",
          position_seconds: 0,
          duration_seconds: 240,
          volume: 0.8,
          is_muted: false,
          context_title: "Tuku Music",
          context_type: "album",
        };
      }
      return null;
    });

    act(() => {
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        queueItems: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        recentPlays: [],
        popularTracks: [],
        libraryTrackCount: 0,
        isHomeInitialized: false,
        playbackContext: null,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates recent plays, popular tracks, and library track count from SQLite (AC-3, AC-4, AC-9, AC-10)", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zuva Rimwe" })).toBeInTheDocument();
      expect(screen.getAllByText("Todii").length).toBeGreaterThan(0);
    });

    expect(invoke).toHaveBeenCalledWith("db_get_status");
    expect(invoke).toHaveBeenCalledWith("db_get_recent_plays", { limit: 20 });
    expect(invoke).toHaveBeenCalledWith("db_get_popular_tracks", { limit: 10 });

    const state = usePlayerStore.getState();
    expect(state.libraryTrackCount).toBe(120);
    expect(state.recentPlays.length).toBe(2);
    expect(state.popularTracks.length).toBe(2);
  });

  it("displays top popular track dynamically in HeroBanner with TOP PLAYED badge (AC-12)", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("TOP PLAYED")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Zuva Rimwe" })).toBeInTheDocument();
    });

    expect(screen.getByText("42 plays")).toBeInTheDocument();
    expect(screen.getByText("From the album Tuku Music")).toBeInTheDocument();
  });

  it("displays play count indicators in popular tracks table (AC-12)", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("• 42 plays")).toBeInTheDocument();
      expect(screen.getByText("• 15 plays")).toBeInTheDocument();
    });
  });

  it("invokes audio_play_track with active playback context when playing a track (AC-7)", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zuva Rimwe" })).toBeInTheDocument();
    });

    act(() => {
      usePlayerStore.getState().setPlaybackContext({
        type: "album",
        id: "alb-1",
        title: "Tuku Music",
      });
    });

    const playHeroBtn = screen.getByLabelText("Play Zuva Rimwe");
    fireEvent.click(playHeroBtn);

    expect(invoke).toHaveBeenCalledWith(
      "audio_play_track",
      expect.objectContaining({
        trackId: "trk-1",
        filePath: "/music/track1.mp3",
        contextTitle: "Tuku Music",
        contextType: "album",
      })
    );
  });

  it("clears recent plays in SQLite and store when clicking Clear button (AC-14)", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zuva Rimwe" })).toBeInTheDocument();
    });

    const clearBtn = screen.getByLabelText("Clear recent plays");
    fireEvent.click(clearBtn);

    expect(invoke).toHaveBeenCalledWith("db_clear_playback_history");
    expect(usePlayerStore.getState().recentPlays).toEqual([]);
    expect(screen.getByText("No recent listening history yet")).toBeInTheDocument();
  });

  it("renders contextual empty state directing to scan folders when library track count is zero (AC-13)", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "db_get_status") {
        return { ...mockStatusDto, track_count: 0 };
      }
      if (cmd === "db_get_recent_plays") return [];
      if (cmd === "db_get_popular_tracks") return [];
      return null;
    });

    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByText("No music in your library yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Scan your local music folders in Your Library to discover and play songs.")
    ).toBeInTheDocument();

    const scanBtn = screen.getByRole("button", { name: "Scan music folder" });
    fireEvent.click(scanBtn);
    expect(mockNavigate).toHaveBeenCalledWith("library");
  });

  it("falls back to mock fixtures in web browser environment without Tauri (AC-10)", async () => {
    vi.mocked(isTauri).mockReturnValue(false);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Recently played")).toBeInTheDocument();
      expect(screen.getByText("Popular tracks")).toBeInTheDocument();
    });

    expect(invoke).not.toHaveBeenCalled();
  });
});
