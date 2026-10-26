import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { App } from "../App";
import { Artists } from "../pages/Artists";
import { useArtistStore } from "../store/useArtistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSearchStore } from "../store/useSearchStore";
import {
  initialArtists,
  initialArtistPopularTracks,
  initialArtistReleases,
} from "../data/artistFixtures";
import { initialAlbums } from "../data/mockAlbums";

describe("Artists and Artist Profile Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    act(() => {
      // Reset artist store to pristine fixtures
      useArtistStore.setState({
        artists: JSON.parse(JSON.stringify(initialArtists)),
        artistPopularTracks: JSON.parse(JSON.stringify(initialArtistPopularTracks)),
        artistReleases: JSON.parse(JSON.stringify(initialArtistReleases)),
        activeArtistId: null,
        searchQuery: "",
        sortBy: "popularity",
        sortDirection: "desc",
        discographyFilter: "all",
        followedArtistIds: initialArtists.filter((a) => a.isFollowed).map((a) => a.id),
        isPopularExpanded: false,
        isLoading: false,
        error: null,
      });

      // Reset album store
      useAlbumStore.setState({
        albums: JSON.parse(JSON.stringify(initialAlbums)),
        activeAlbumId: null,
        searchQuery: "",
        sortBy: "title",
        sortDirection: "asc",
      });

      // Reset player store
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        isShuffle: false,
        repeatMode: "off",
        likedTrackIds: {},
      });

      // Reset search store
      useSearchStore.setState({
        query: "",
        activeCategory: "all",
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigating to Artists in the sidebar renders the Artists overview screen (AC-1)", () => {
    render(<App />);

    const artistsNav = screen.getByRole("link", { name: /artists/i });
    expect(artistsNav).toBeInTheDocument();

    act(() => {
      fireEvent.click(artistsNav);
    });

    const artistsMain = screen.getByRole("main", { name: /artists screen/i });
    expect(artistsMain).toBeInTheDocument();

    // Verify header title and total artist count
    expect(screen.getByRole("heading", { level: 1, name: "Artists" })).toBeInTheDocument();
    expect(screen.getByText(/8 artists/i)).toBeInTheDocument();

    // Verify search input and sort selector
    expect(screen.getByRole("textbox", { name: /search artists/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /sort artists by/i })).toBeInTheDocument();

    // Verify artist cards are displayed
    expect(screen.getByRole("article", { name: /artist amina v/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /artist tadiwa nyoni/i })).toBeInTheDocument();
  });

  it("typing into the search input filters artists instantly and shows empty state when no match (AC-2)", () => {
    render(<Artists />);

    const searchInput = screen.getByRole("textbox", { name: /search artists/i });

    // Search for existing genre
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Jazz" } });
    });

    expect(screen.getByText("Tadiwa Nyoni")).toBeInTheDocument();
    expect(screen.queryByText("Farai & The Groove")).not.toBeInTheDocument();

    // Search for nonexistent term
    act(() => {
      fireEvent.change(searchInput, { target: { value: "NonExistentMusicianXYZ" } });
    });

    const emptyStatus = screen.getByRole("status", { name: /no artists found/i });
    expect(emptyStatus).toBeInTheDocument();
    expect(screen.getByText(/No artists matching "NonExistentMusicianXYZ"/i)).toBeInTheDocument();

    // Clear search button restores list
    const clearButton = screen.getByRole("button", { name: /clear search/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(screen.getByText("Amina V")).toBeInTheDocument();
    expect(screen.getByText("Tadiwa Nyoni")).toBeInTheDocument();
  });

  it("selecting sort options reorders the artist grid and toggling direction inverts order (AC-3)", () => {
    render(<Artists />);

    const sortSelect = screen.getByRole("combobox", { name: /sort artists by/i });
    const toggleButton = screen.getByRole("button", { name: /toggle sort direction/i });

    // Sort by name
    act(() => {
      fireEvent.change(sortSelect, { target: { value: "name" } });
    });

    const articlesByName = screen.getAllByRole("article");
    expect(articlesByName[0]).toHaveAccessibleName(/artist amina v/i);

    // Toggle direction to descending
    act(() => {
      fireEvent.click(toggleButton);
    });

    const articlesDesc = screen.getAllByRole("article");
    expect(articlesDesc[0]).toHaveAccessibleName(/artist the obsidian trio/i);
  });

  it("clicking an artist card opens Artist Profile view with hero banner and action controls (AC-4)", () => {
    render(<Artists />);

    const aminaCard = screen.getByRole("article", { name: /artist amina v/i });
    act(() => {
      fireEvent.click(aminaCard);
    });

    // Profile hero banner
    expect(screen.getByRole("region", { name: /amina v hero profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Amina V" })).toBeInTheDocument();
    expect(screen.getByText(/1,420,500 plays/i)).toBeInTheDocument();
    expect(screen.getByText(/In Library/i)).toBeInTheDocument();

    // Action controls
    expect(screen.getByRole("button", { name: /play top tracks by amina v/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /favorited amina v/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more artist options/i })).toBeInTheDocument();
  });

  it("clicking the back button in Artist Profile returns to overview grid preserving query (AC-5)", () => {
    render(<Artists />);

    const searchInput = screen.getByRole("textbox", { name: /search artists/i });
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Amina" } });
    });

    const aminaCard = screen.getByRole("article", { name: /artist amina v/i });
    act(() => {
      fireEvent.click(aminaCard);
    });

    expect(screen.getByRole("heading", { level: 1, name: "Amina V" })).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByRole("button", { name: /back to all artists/i });
    act(() => {
      fireEvent.click(backBtn);
    });

    // Returned to grid with search query preserved
    const restoredInput = screen.getByRole("textbox", {
      name: /search artists/i,
    }) as HTMLInputElement;
    expect(restoredInput.value).toBe("Amina");
    expect(screen.getByText("Amina V")).toBeInTheDocument();
  });

  it("clicking an album in discography navigates directly to Albums screen with that album active (AC-6)", () => {
    const handleNavigate = vi.fn();
    render(<Artists onNavigate={handleNavigate} />);

    // Open Amina V
    act(() => {
      useArtistStore.getState().setActiveArtistId("artist-amina-v");
    });

    // Locate the Timeless Vibrations album card in Discography
    const albumCard = screen.getByRole("article", {
      name: /timeless vibrations \(album, 2024\)/i,
    });
    expect(albumCard).toBeInTheDocument();

    act(() => {
      fireEvent.click(albumCard);
    });

    // Verify navigation and album store activation
    expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");
    expect(handleNavigate).toHaveBeenCalledWith("Albums");
  });

  it("clicking Play on artist hero banner queues top tracks and begins playback (AC-7)", () => {
    render(<Artists />);

    act(() => {
      useArtistStore.getState().setActiveArtistId("artist-amina-v");
    });

    const playHeroBtn = screen.getByRole("button", { name: /play top tracks by amina v/i });
    act(() => {
      fireEvent.click(playHeroBtn);
    });

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.title).toBe("Solitary Horizon");
    expect(playerState.queue.length).toBeGreaterThanOrEqual(5);
  });

  it("displays top 5 popular tracks and expands to 10 with Show More toggle (AC-8)", () => {
    render(<Artists />);

    act(() => {
      useArtistStore.getState().setActiveArtistId("artist-amina-v");
    });

    const popularSection = screen.getByRole("region", { name: /popular tracks/i });
    expect(popularSection).toBeInTheDocument();

    // Verify top 5 tracks are rendered initially
    expect(
      within(popularSection).getByRole("row", { name: /popular track 1\. solitary horizon/i })
    ).toBeInTheDocument();
    expect(
      within(popularSection).getByRole("row", { name: /popular track 5\. dusk whispers/i })
    ).toBeInTheDocument();
    expect(
      within(popularSection).queryByRole("row", { name: /popular track 6\. neon safari/i })
    ).not.toBeInTheDocument();

    // Click Show More
    const showMoreBtn = screen.getByRole("button", { name: /show more popular songs/i });
    act(() => {
      fireEvent.click(showMoreBtn);
    });

    // Now 10 tracks are shown
    expect(
      within(popularSection).getByRole("row", { name: /popular track 6\. neon safari/i })
    ).toBeInTheDocument();
    expect(
      within(popularSection).getByRole("row", { name: /popular track 10\. midnight prelude/i })
    ).toBeInTheDocument();

    // Toggle button changes to Show Less
    const showLessBtn = screen.getByRole("button", { name: /show fewer popular songs/i });
    expect(showLessBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(showLessBtn);
    });

    // Collapsed back to 5
    expect(
      within(popularSection).queryByRole("row", { name: /popular track 6\. neon safari/i })
    ).not.toBeInTheDocument();
  });

  it("popular track rows support playing and liking tracks (AC-9)", () => {
    render(<Artists />);

    act(() => {
      useArtistStore.getState().setActiveArtistId("artist-amina-v");
    });

    const row3 = screen.getByRole("row", { name: /popular track 3\. sub-saharan pulse/i });

    // Double-click row starts playback of track 3
    act(() => {
      fireEvent.doubleClick(row3);
    });

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.title).toBe("Sub-Saharan Pulse");

    // Toggle like button on track 2
    const likeBtn = screen.getByRole("button", { name: /like golden hour glow/i });
    act(() => {
      fireEvent.click(likeBtn);
    });

    expect(usePlayerStore.getState().likedTrackIds["amina-pop-2"]).toBe(true);
  });

  it("clicking follow button toggles follow status and increments/decrements count (AC-10)", () => {
    render(<Artists />);

    const tadiwaCard = screen.getByRole("article", { name: /artist tadiwa nyoni/i });
    const followBtn = within(tadiwaCard).getByRole("button", { name: /favorite tadiwa nyoni/i });

    expect(followBtn).toHaveTextContent("Favorite");
    const initialFollowers =
      useArtistStore.getState().getArtistById("artist-tadiwa-nyoni")?.followerCount ?? 0;

    // Follow Tadiwa
    act(() => {
      fireEvent.click(followBtn);
    });

    expect(
      within(tadiwaCard).getByRole("button", { name: /favorited tadiwa nyoni/i })
    ).toHaveTextContent("Favorited");
    const updatedFollowers =
      useArtistStore.getState().getArtistById("artist-tadiwa-nyoni")?.followerCount ?? 0;
    expect(updatedFollowers).toBe(initialFollowers + 1);

    // Unfollow Tadiwa
    const unfollowBtn = within(tadiwaCard).getByRole("button", { name: /favorited tadiwa nyoni/i });
    act(() => {
      fireEvent.click(unfollowBtn);
    });

    expect(
      within(tadiwaCard).getByRole("button", { name: /favorite tadiwa nyoni/i })
    ).toHaveTextContent("Favorite");
    expect(useArtistStore.getState().getArtistById("artist-tadiwa-nyoni")?.followerCount).toBe(
      initialFollowers
    );
  });

  it("renders procedural gradient avatar fallback when avatar is missing or fails (AC-11)", () => {
    render(<Artists />);

    // The Obsidian Trio has avatarUrl: ""
    const obsidianCard = screen.getByRole("article", { name: /artist the obsidian trio/i });
    expect(obsidianCard).toBeInTheDocument();

    const proceduralAvatar = within(obsidianCard).getByRole("img", {
      name: /procedural avatar for the obsidian trio/i,
    });
    expect(proceduralAvatar).toBeInTheDocument();
    expect(within(proceduralAvatar).getByText("TO")).toBeInTheDocument();
  });

  it("clicking an artist card from Search screen deep links to Artist Profile view (AC-12)", () => {
    render(<App />);

    // Go to Search
    const searchNav = screen.getByRole("link", { name: /search/i });
    act(() => {
      fireEvent.click(searchNav);
    });

    const searchInput = screen.getByRole("textbox", { name: /search music/i });

    act(() => {
      fireEvent.change(searchInput, { target: { value: "Amina" } });
      vi.advanceTimersByTime(200);
    });

    // Switch to Artists tab in search results
    const artistsPill = screen.getByRole("tab", { name: /artists/i });
    act(() => {
      fireEvent.click(artistsPill);
    });

    // Locate the artist card in search results and click it
    const artistCardInSearch = screen.getByRole("button", { name: /artist amina v/i });
    expect(artistCardInSearch).toBeInTheDocument();

    act(() => {
      fireEvent.click(artistCardInSearch);
    });

    // Should now be on Artists page
    expect(screen.getByRole("main", { name: /artists screen/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /amina v hero profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Amina V" })).toBeInTheDocument();

    // Working back button
    const backBtn = screen.getByRole("button", { name: /back to all artists/i });
    expect(backBtn).toBeInTheDocument();
  });

  it("renders graceful fallback message when activeArtistId is invalid", () => {
    render(<Artists />);

    act(() => {
      useArtistStore.setState({ activeArtistId: "invalid-artist-999" });
    });

    expect(screen.getByRole("heading", { level: 2, name: "Artist Not Found" })).toBeInTheDocument();
    const returnBtn = screen.getByRole("button", { name: /return to artists grid/i });

    act(() => {
      fireEvent.click(returnBtn);
    });

    expect(screen.getByRole("heading", { level: 1, name: "Artists" })).toBeInTheDocument();
  });
});
