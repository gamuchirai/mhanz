import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { ArtistLink } from "../components/common/ArtistLink";
import { AlbumLink } from "../components/common/AlbumLink";
import { useEntityNavigation } from "../hooks/useEntityNavigation";
import { PlayerFooter } from "../components/player/PlayerFooter";
import { useArtistStore } from "../store/useArtistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useSearchStore } from "../store/useSearchStore";
import { useNavigationStore } from "../store/useNavigationStore";
import { useOverlayStore } from "../store/useOverlayStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { initialArtists } from "../data/artistFixtures";
import { initialAlbums } from "../data/mockAlbums";

describe("Universal Album and Artist Navigation Links (Feature 24)", () => {
  beforeEach(() => {
    act(() => {
      // Reset stores to predictable baseline
      useArtistStore.setState({
        artists: [
          ...JSON.parse(JSON.stringify(initialArtists)),
          {
            id: "artist-ewf",
            name: "Earth, Wind & Fire",
            avatarUrl: "",
            trackCount: 10,
            albumCount: 2,
            totalPlays: 50000,
            genres: ["Funk", "Soul"],
          },
        ],
        activeArtistId: null,
        isLoaded: true,
        isLoading: false,
      });

      useAlbumStore.setState({
        albums: [
          ...JSON.parse(JSON.stringify(initialAlbums)),
          {
            id: "album-gh-artist-a",
            title: "Greatest Hits",
            artistId: "artist-a",
            artistName: "Artist A",
            coverUrl: "",
            releaseYear: 2020,
            genre: "Pop",
            trackCount: 12,
            totalDuration: 2400,
          },
          {
            id: "album-gh-artist-b",
            title: "Greatest Hits",
            artistId: "artist-b",
            artistName: "Artist B",
            coverUrl: "",
            releaseYear: 2022,
            genre: "Rock",
            trackCount: 14,
            totalDuration: 2800,
          },
        ],
        activeAlbumId: null,
        isLoaded: true,
        isLoading: false,
      });

      useSearchStore.setState({
        query: "",
        activeCategory: "all",
        results: {
          query: "",
          tracks: [],
          albums: [],
          artists: [],
          playlists: [],
          genres: [],
          totalMatches: 0,
        },
      });

      useNavigationStore.setState({
        current: { id: "test-home", view: "Home", timestamp: Date.now() },
        history: [{ id: "test-home", view: "Home", timestamp: Date.now() }],
        currentIndex: 0,
      });

      useOverlayStore.setState({
        activeOverlay: "none",
        fullscreenViewMode: "artwork",
      });
    });
  });

  it("navigates to Artist profile when clicking a valid artist link (AC-1, AC-3)", async () => {
    render(<ArtistLink name="Amina V" artistId="artist-amina-v" />);

    const link = screen.getByRole("link", { name: /view artist amina v/i });
    expect(link).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useArtistStore.getState().activeArtistId).toBe("artist-amina-v");
    expect(useNavigationStore.getState().current.view).toBe("Artists");
    expect(useNavigationStore.getState().current.params?.artistId).toBe("artist-amina-v");
  });

  it("navigates to Album detail when clicking a valid album link (AC-2, AC-4)", async () => {
    render(<AlbumLink title="Timeless Vibrations" albumId="album-1" artistName="Amina V" />);

    const link = screen.getByRole("link", { name: /view album timeless vibrations/i });
    expect(link).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");
    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("album-1");
  });

  it("disambiguates identical album titles using artistName (AC-4)", async () => {
    render(
      <div>
        <AlbumLink title="Greatest Hits" artistName="Artist B" />
      </div>
    );

    const link = screen.getByRole("link", { name: /view album greatest hits/i });

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useAlbumStore.getState().activeAlbumId).toBe("album-gh-artist-b");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("album-gh-artist-b");
  });

  it("falls back to search screen with synchronized prefilled query when entity is unknown (AC-5)", async () => {
    render(<ArtistLink name="Unknown Band Nowhere in Library" />);

    const link = screen.getByRole("link", { name: /view artist unknown band nowhere in library/i });

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useNavigationStore.getState().current.view).toBe("Search");
    expect(useNavigationStore.getState().current.params?.searchQuery).toBe(
      "Unknown Band Nowhere in Library"
    );
    expect(useSearchStore.getState().query).toBe("Unknown Band Nowhere in Library");
  });

  it("stops event propagation on click and double click to prevent row activation (AC-6)", async () => {
    const onRowClick = vi.fn();
    const onRowDoubleClick = vi.fn();

    render(
      <div onClick={onRowClick} onDoubleClick={onRowDoubleClick}>
        <ArtistLink name="Amina V" artistId="artist-amina-v" />
      </div>
    );

    const link = screen.getByRole("link", { name: /view artist amina v/i });

    await act(async () => {
      fireEvent.click(link);
      fireEvent.doubleClick(link);
    });

    expect(onRowClick).not.toHaveBeenCalled();
    expect(onRowDoubleClick).not.toHaveBeenCalled();
  });

  it("unconditionally closes active overlay when navigating (AC-7)", async () => {
    act(() => {
      useOverlayStore.getState().openOverlay("queue");
    });
    expect(useOverlayStore.getState().activeOverlay).toBe("queue");

    render(<ArtistLink name="Amina V" artistId="artist-amina-v" />);
    const link = screen.getByRole("link", { name: /view artist amina v/i });

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useOverlayStore.getState().activeOverlay).toBe("none");
    expect(useNavigationStore.getState().current.view).toBe("Artists");
  });

  it("preserves compound band names matching existing artists in store without splitting (AC-8)", async () => {
    render(<ArtistLink name="Earth, Wind & Fire" />);

    // Should render as a single link, not three separate pieces
    const link = screen.getByRole("link", { name: /view artist earth, wind & fire/i });
    expect(link).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(link);
    });

    expect(useArtistStore.getState().activeArtistId).toBe("artist-ewf");
  });

  it("splits multi-artist collaboration strings and preserves delimiter typography (AC-8)", async () => {
    render(<ArtistLink name="Amina V feat. Kundai Chitepo" artistId="artist-amina-v" />);

    const primaryLink = screen.getByRole("link", { name: /view artist amina v/i });
    const featuredLink = screen.getByRole("link", { name: /view artist kundai chitepo/i });

    expect(primaryLink).toBeInTheDocument();
    expect(featuredLink).toBeInTheDocument();
    expect(screen.getByText(/^\s*feat\.\s*$/i)).toBeInTheDocument();

    // Clicking primary link binds primary artistId
    await act(async () => {
      fireEvent.click(primaryLink);
    });
    expect(useArtistStore.getState().activeArtistId).toBe("artist-amina-v");

    // Clicking featured link resolves by name
    await act(async () => {
      fireEvent.click(featuredLink);
    });
    expect(useArtistStore.getState().activeArtistId).toBe("artist-kundai-chitepo");
  });

  it("renders generic placeholder tokens as inert non-clickable text (AC-9)", () => {
    const { container } = render(
      <div>
        <ArtistLink name="Unknown Artist" />
        <ArtistLink name="Various Artists" />
        <ArtistLink name="-" />
        <AlbumLink title="Unknown Album" />
      </div>
    );

    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(0);

    expect(container.textContent).toContain("Unknown Artist");
    expect(container.textContent).toContain("Various Artists");
    expect(container.textContent).toContain("-");
    expect(container.textContent).toContain("Unknown Album");
  });

  it("supports keyboard activation using Enter and Space keys (AC-10)", async () => {
    render(<ArtistLink name="Amina V" artistId="artist-amina-v" />);

    const link = screen.getByRole("link", { name: /view artist amina v/i });

    await act(async () => {
      fireEvent.keyDown(link, { key: "Enter" });
    });

    expect(useArtistStore.getState().activeArtistId).toBe("artist-amina-v");
    expect(useNavigationStore.getState().current.view).toBe("Artists");

    // Reset view
    act(() => {
      useNavigationStore.setState({
        current: { id: "test-home", view: "Home", timestamp: Date.now() },
      });
    });

    await act(async () => {
      fireEvent.keyDown(link, { key: " " });
    });

    expect(useNavigationStore.getState().current.view).toBe("Artists");
  });

  it("handles empty or whitespace inputs without error or state change (AC-3, AC-4)", async () => {
    const { result } = renderHook(() => useEntityNavigation());

    await act(async () => {
      await result.current.navigateToArtist("   ");
      await result.current.navigateToAlbum("   ");
    });

    expect(useNavigationStore.getState().current.view).toBe("Home");
    expect(useArtistStore.getState().activeArtistId).toBe(null);
    expect(useAlbumStore.getState().activeAlbumId).toBe(null);
  });

  it("awaits store hydration when store is currently loading on boot (AC-3, AC-4)", async () => {
    act(() => {
      useArtistStore.setState({ isLoaded: false, isLoading: true });
    });

    const { result } = renderHook(() => useEntityNavigation());

    const navPromise = result.current.navigateToArtist("Amina V");

    // Simulate store hydration completing after 50ms
    setTimeout(() => {
      act(() => {
        useArtistStore.setState({ isLoaded: true, isLoading: false });
      });
    }, 50);

    await act(async () => {
      await navPromise;
    });

    expect(useArtistStore.getState().activeArtistId).toBe("artist-amina-v");
    expect(useNavigationStore.getState().current.view).toBe("Artists");
  });

  it("splits collaboration strings with various delimiters like &, ft., vs., featuring, and comma (AC-8)", () => {
    render(
      <div>
        <ArtistLink name="Artist One & Artist Two" />
        <ArtistLink name="Artist Three ft. Artist Four" />
        <ArtistLink name="Artist Five vs. Artist Six" />
        <ArtistLink name="Artist Seven featuring Artist Eight" />
        <ArtistLink name="Artist Nine, Artist Ten" />
      </div>
    );

    expect(screen.getByRole("link", { name: /view artist artist one/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist two/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist three/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist four/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist five/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist six/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist seven/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist eight/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist nine/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view artist artist ten/i })).toBeInTheDocument();
  });

  it("supports keyboard activation and double click isolation on AlbumLink (AC-6, AC-10)", async () => {
    const onDoubleClick = vi.fn();
    render(
      <div onDoubleClick={onDoubleClick}>
        <AlbumLink title="Timeless Vibrations" albumId="album-1" className="custom-album-class" />
      </div>
    );

    const link = screen.getByRole("link", { name: /view album timeless vibrations/i });
    expect(link).toHaveClass("custom-album-class");

    // Double click should stop propagation
    await act(async () => {
      fireEvent.doubleClick(link);
    });
    expect(onDoubleClick).not.toHaveBeenCalled();

    // Keyboard activation with Enter
    await act(async () => {
      fireEvent.keyDown(link, { key: "Enter" });
    });
    expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");
    expect(useNavigationStore.getState().current.view).toBe("Albums");
  });

  it("renders interactive artist link in PlayerFooter and navigates to artist profile (AC-1, AC-3)", async () => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: {
          id: "trk-sample",
          title: "Solitary Horizon",
          artist: "Amina V",
          artistId: "artist-amina-v",
          album: "Timeless Vibrations",
          albumId: "album-1",
          durationSeconds: 240,
          artworkUrl: "",
          playsCount: 15,
          isLiked: false,
        },
      });
    });

    render(<PlayerFooter />);

    const artistLink = screen.getByRole("link", { name: /view artist amina v/i });
    expect(artistLink).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(artistLink);
    });

    expect(useArtistStore.getState().activeArtistId).toBe("artist-amina-v");
    expect(useNavigationStore.getState().current.view).toBe("Artists");
  });
});
