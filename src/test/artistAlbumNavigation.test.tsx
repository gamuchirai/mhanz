import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { useArtistStore } from "../store/useArtistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useNavigationStore } from "../store/useNavigationStore";
import { initialArtists, initialArtistPopularTracks, initialArtistReleases } from "../data/artistFixtures";
import { initialAlbums } from "../data/mockAlbums";

describe("Reproduce Artist page album links navigation issue", () => {
  beforeEach(() => {
    act(() => {
      useArtistStore.setState({
        artists: JSON.parse(JSON.stringify(initialArtists)),
        artistPopularTracks: JSON.parse(JSON.stringify(initialArtistPopularTracks)),
        artistReleases: JSON.parse(JSON.stringify(initialArtistReleases)),
        activeArtistId: "artist-amina-v",
        isPopularExpanded: true,
        isLoaded: true,
        isLoading: false,
      });

      useAlbumStore.setState({
        albums: JSON.parse(JSON.stringify(initialAlbums)),
        activeAlbumId: null,
        isLoaded: true,
        isLoading: false,
      });

      useNavigationStore.setState({
        current: {
          id: "nav-artists",
          view: "Artists",
          params: { artistId: "artist-amina-v" },
          timestamp: Date.now(),
        },
        history: [
          {
            id: "nav-artists",
            view: "Artists",
            params: { artistId: "artist-amina-v" },
            timestamp: Date.now(),
          },
        ],
        currentIndex: 0,
      });
    });
  });

  it("clicks AlbumLink for Neon Safari single in popular track row on Artist page and navigates to album detail", async () => {
    render(<App />);

    // Locate the AlbumLink for "Neon Safari" in Amina V's popular tracks (first link)
    const albumLinks = screen.getAllByRole("link", { name: /view album neon safari/i });
    expect(albumLinks.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(albumLinks[0]);
    });

    // It should navigate to Albums with albumId "rel-amina-single-1"
    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("rel-amina-single-1");
    expect(useAlbumStore.getState().activeAlbumId).toBe("rel-amina-single-1");

    // It should render Albums screen and display Album Detail banner with heading "Neon Safari"
    expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Neon Safari" })).toBeInTheDocument();
  });

  it("clicks cover art thumbnail in popular track row and navigates to album detail", async () => {
    render(<App />);

    // Locate the cover art button for Solitary Horizon / Timeless Vibrations
    const coverBtns = screen.getAllByRole("button", { name: /view album timeless vibrations/i });
    expect(coverBtns.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(coverBtns[0]);
    });

    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("album-1");
    expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");

    expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Timeless Vibrations" })).toBeInTheDocument();
  });

  it("clicks Go to Album in popular track more options menu and navigates to album detail", async () => {
    render(<App />);

    const moreBtn = screen.getByRole("button", { name: /more options for solitary horizon/i });
    expect(moreBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(moreBtn);
    });

    const goToAlbumItem = screen.getByRole("menuitem", { name: /go to album/i });
    expect(goToAlbumItem).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(goToAlbumItem);
    });

    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("album-1");
    expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");

    expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Timeless Vibrations" })).toBeInTheDocument();
  });

  it("clicks Neon Safari card in Discography on Artist page and navigates to album detail", async () => {
    render(<App />);

    // Locate the Neon Safari card in Discography
    const albumCard = screen.getByRole("article", {
      name: /neon safari \(single, 2023\)/i,
    });
    expect(albumCard).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(albumCard);
    });

    // It should navigate to Albums with albumId "rel-amina-single-1"
    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("rel-amina-single-1");
    expect(useAlbumStore.getState().activeAlbumId).toBe("rel-amina-single-1");

    // It should render Albums screen and display Album Detail banner with heading "Neon Safari"
    expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Neon Safari" })).toBeInTheDocument();
  });

  it("clicks title AlbumLink inside Neon Safari Discography card and navigates to album detail", async () => {
    render(<App />);

    // Locate the AlbumLink for "Neon Safari" in Discography (second link)
    const albumLinks = screen.getAllByRole("link", { name: /view album neon safari/i });
    expect(albumLinks.length).toBe(2);

    await act(async () => {
      fireEvent.click(albumLinks[1]);
    });

    // It should navigate to Albums with albumId "rel-amina-single-1"
    expect(useNavigationStore.getState().current.view).toBe("Albums");
    expect(useNavigationStore.getState().current.params?.albumId).toBe("rel-amina-single-1");
    expect(useAlbumStore.getState().activeAlbumId).toBe("rel-amina-single-1");

    // It should render Albums screen and display Album Detail banner with heading "Neon Safari"
    expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Neon Safari" })).toBeInTheDocument();
  });
});
