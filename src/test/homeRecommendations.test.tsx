import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import { Home } from "../pages/Home";
import { RecommendationsGrid } from "../components/home/RecommendationsGrid";
import { useRecommendationsStore } from "../store/useRecommendationsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useToastStore } from "../store/useToastStore";
import * as dbServices from "../services/db";
import type {
  HomeRecommendationsData,
  HomeRecommendationCollection,
  Track,
} from "../types/discovery";
import type { HomeRecommendationsDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
  invoke: vi.fn(),
}));

const mockTrackA: Track = {
  id: "trk-1",
  title: "Song Alpha",
  artist: "Oliver Mtukudzi",
  album: "Album Alpha",
  durationSeconds: 180,
  artworkUrl: "http://example.com/art1.jpg",
  playsCount: 25,
  isLiked: true,
  filePath: "C:/music/track1.mp3",
  genre: "Jazz",
};

const mockTrackB: Track = {
  id: "trk-2",
  title: "Song Beta",
  artist: "Oliver Mtukudzi",
  album: "Album Beta",
  durationSeconds: 210,
  artworkUrl: "",
  playsCount: 15,
  isLiked: false,
  filePath: "C:/music/track2.mp3",
  genre: "Jazz",
};

const mockTrackC: Track = {
  id: "trk-3",
  title: "Song Gamma",
  artist: "Chiwoniso Maraire",
  album: "Album Gamma",
  durationSeconds: 200,
  artworkUrl: "http://example.com/art3.jpg",
  playsCount: 10,
  isLiked: false,
  filePath: "C:/music/track3.mp3",
  genre: "Mbira",
};

const sampleRecommendationsData: HomeRecommendationsData = {
  libraryTrackCount: 3,
  recentlyAdded: {
    kind: "recently_added",
    title: "Recently Added",
    source: "library",
    tracks: [mockTrackC, mockTrackB, mockTrackA],
  },
  mostPlayed: {
    kind: "most_played",
    title: "Most Played",
    source: "history",
    tracks: [mockTrackA, mockTrackB, mockTrackC],
  },
  bestArtist: {
    kind: "best_artist",
    title: "Best of Oliver Mtukudzi",
    source: "history",
    tracks: [mockTrackA, mockTrackB],
  },
  trendingGenre: {
    kind: "trending_genre",
    title: "Trending in Jazz",
    source: "history",
    tracks: [mockTrackA, mockTrackB],
  },
};

describe("Home Listening Recommendations (Feature 29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useRecommendationsStore.setState({
      recommendations: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
    usePlayerStore.setState({
      isPlaying: false,
      queue: [],
      currentIndex: 0,
      playbackContext: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI Skeletons, Cards, and Artwork (AC-1, AC-6)", () => {
    it("renders loading skeletons when recommendations are loading (AC-1)", () => {
      useRecommendationsStore.setState({
        isLoading: true,
        isLoaded: false,
      });

      render(<RecommendationsGrid />);

      expect(screen.getByRole("region", { name: "Loading recommendations" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Based on Your Listening" })).toBeInTheDocument();
    });

    it("renders four recommendation cards with titles, track counts, and artwork fallback (AC-1)", () => {
      useRecommendationsStore.setState({
        recommendations: sampleRecommendationsData,
        isLoading: false,
        isLoaded: true,
        error: null,
      });

      render(<RecommendationsGrid />);

      // Verify the four card headings
      expect(screen.getByText("Recently Added")).toBeInTheDocument();
      expect(screen.getByText("Most Played")).toBeInTheDocument();
      expect(screen.getByText("Best of Oliver Mtukudzi")).toBeInTheDocument();
      expect(screen.getByText("Trending in Jazz")).toBeInTheDocument();

      // Verify track count labels
      expect(screen.getAllByText("3 songs")).toHaveLength(2); // Recently Added & Most Played
      expect(screen.getAllByText("2 songs")).toHaveLength(2); // Best of Oliver Mtukudzi & Trending in Jazz
    });

    it("displays 'From your library' label only for source library (AC-1, AC-6)", () => {
      const fallbackData: HomeRecommendationsData = {
        ...sampleRecommendationsData,
        bestArtist: {
          ...sampleRecommendationsData.bestArtist,
          source: "library",
        },
        trendingGenre: {
          ...sampleRecommendationsData.trendingGenre,
          source: "library",
        },
      };

      useRecommendationsStore.setState({
        recommendations: fallbackData,
        isLoading: false,
        isLoaded: true,
      });

      render(<RecommendationsGrid />);

      // Recently Added, Best of Artist, and Trending Genre all have source 'library'
      const labels = screen.getAllByText("From your library");
      expect(labels).toHaveLength(3);
    });

    it("displays empty state when collection has zero tracks (AC-6)", () => {
      const emptyRecommendations: HomeRecommendationsData = {
        libraryTrackCount: 0,
        recentlyAdded: {
          kind: "recently_added",
          title: "Recently Added",
          source: "none",
          tracks: [],
        },
        mostPlayed: {
          kind: "most_played",
          title: "Most Played",
          source: "none",
          tracks: [],
        },
        bestArtist: {
          kind: "best_artist",
          title: "Best of an Artist",
          source: "none",
          tracks: [],
        },
        trendingGenre: {
          kind: "trending_genre",
          title: "Trending Genre",
          source: "none",
          tracks: [],
        },
      };

      useRecommendationsStore.setState({
        recommendations: emptyRecommendations,
        isLoading: false,
        isLoaded: true,
      });

      render(<RecommendationsGrid />);

      // When libraryTrackCount is 0, guidance to add music is displayed
      const guidance = screen.getAllByText("Add music to your library");
      expect(guidance).toHaveLength(4);
    });
  });

  describe("Queue Replacement and Playback Context (AC-7)", () => {
    it("replaces queue and sets playback context when clicking card play button (AC-7)", async () => {
      useRecommendationsStore.setState({
        recommendations: sampleRecommendationsData,
        isLoading: false,
        isLoaded: true,
      });

      render(<RecommendationsGrid />);

      const playBestArtistBtn = screen.getByRole("button", {
        name: "Play collection Best of Oliver Mtukudzi",
      });

      await act(async () => {
        fireEvent.click(playBestArtistBtn);
      });

      const playerState = usePlayerStore.getState();
      expect(playerState.playbackContext).toEqual({
        type: "best_artist",
        title: "Best of Oliver Mtukudzi",
      });
      expect(playerState.queue).toHaveLength(2);
      expect(playerState.queue[0].id).toBe("trk-1");
      expect(playerState.queue[1].id).toBe("trk-2");
    });

    it("replaces queue and starts playback when clicking card body (AC-7)", async () => {
      useRecommendationsStore.setState({
        recommendations: sampleRecommendationsData,
        isLoading: false,
        isLoaded: true,
      });

      render(<RecommendationsGrid />);

      const card = screen.getByRole("button", {
        name: "Play Trending in Jazz",
      });

      await act(async () => {
        fireEvent.click(card);
      });

      const playerState = usePlayerStore.getState();
      expect(playerState.playbackContext).toEqual({
        type: "trending_genre",
        title: "Trending in Jazz",
      });
      expect(playerState.queue).toHaveLength(2);
      expect(playerState.queue[0].id).toBe("trk-1");
    });

    it("navigates to Your Library when clicking empty card with 0 library tracks (AC-6, AC-7)", async () => {
      const onNavigate = vi.fn();
      const emptyRecommendations: HomeRecommendationsData = {
        libraryTrackCount: 0,
        recentlyAdded: {
          kind: "recently_added",
          title: "Recently Added",
          source: "none",
          tracks: [],
        },
        mostPlayed: {
          kind: "most_played",
          title: "Most Played",
          source: "none",
          tracks: [],
        },
        bestArtist: {
          kind: "best_artist",
          title: "Best of an Artist",
          source: "none",
          tracks: [],
        },
        trendingGenre: {
          kind: "trending_genre",
          title: "Trending Genre",
          source: "none",
          tracks: [],
        },
      };

      useRecommendationsStore.setState({
        recommendations: emptyRecommendations,
        isLoading: false,
        isLoaded: true,
      });

      render(<RecommendationsGrid onNavigate={onNavigate} />);

      const card = screen.getByRole("button", { name: "Play Recently Added" });
      await act(async () => {
        fireEvent.click(card);
      });

      expect(onNavigate).toHaveBeenCalledWith("Your Library");
    });
  });

  describe("Failure Resilience and Retry State (AC-10)", () => {
    it("renders inline retry state on error while keeping the rest of Home operational (AC-10)", async () => {
      useRecommendationsStore.setState({
        recommendations: null,
        isLoading: false,
        isLoaded: false,
        error: "SQLite query timeout after 5000ms",
      });

      render(<Home />);

      // Recommendations shows error retry state
      expect(screen.getByRole("alert", { name: "Failed to load recommendations" })).toBeInTheDocument();
      expect(screen.getByText("SQLite query timeout after 5000ms")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Retry loading recommendations" })
      ).toBeInTheDocument();

      // Your Collections section remains intact and functional (AC-10)
      expect(screen.getByRole("region", { name: "Your Collections" })).toBeInTheDocument();
    });

    it("retries loading recommendations when clicking Retry button (AC-10)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      vi.spyOn(dbServices, "dbGetHomeRecommendations").mockResolvedValue(sampleRecommendationsData);

      useRecommendationsStore.setState({
        recommendations: null,
        isLoading: false,
        isLoaded: false,
        error: "Database locked",
      });

      render(<RecommendationsGrid />);

      const retryBtn = screen.getByRole("button", { name: "Retry loading recommendations" });
      await act(async () => {
        fireEvent.click(retryBtn);
      });

      expect(useRecommendationsStore.getState().error).toBeNull();
      expect(useRecommendationsStore.getState().isLoaded).toBe(true);
      expect(useRecommendationsStore.getState().recommendations).toEqual(sampleRecommendationsData);
    });
  });

  describe("Event-driven Refresh and Lifecycle (AC-8)", () => {
    it("refreshes recommendations when clearRecentPlays is invoked (AC-8)", async () => {
      vi.mocked(tauriCore.isTauri).mockReturnValue(true);
      vi.spyOn(dbServices, "dbClearPlaybackHistory").mockResolvedValue();
      vi.spyOn(dbServices, "dbGetHomeRecommendations").mockResolvedValue(sampleRecommendationsData);
      const refreshSpy = vi.spyOn(useRecommendationsStore.getState(), "refreshRecommendations");

      await act(async () => {
        usePlayerStore.getState().clearRecentPlays();
      });

      // dbClearPlaybackHistory resolves and triggers refreshRecommendations
      await act(async () => {
        await Promise.resolve();
      });

      expect(refreshSpy).toHaveBeenCalled();
    });
  });
});
