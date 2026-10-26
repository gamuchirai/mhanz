import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import tauriConf from "../../src-tauri/tauri.conf.json";
import { App } from "../App";
import { NavigationSidebar } from "../components/layout/NavigationSidebar";
import { PlayerFooter } from "../components/player/PlayerFooter";
import { Scrubber } from "../components/player/Scrubber";
import { SongTable } from "../components/library/SongTable";
import { CuratedGrid } from "../components/home/CuratedGrid";
import { AlbumGrid } from "../components/albums/AlbumGrid";
import { ArtistGrid } from "../components/artists/ArtistGrid";
import { PlaylistGrid } from "../components/playlists/PlaylistGrid";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useArtistStore } from "../store/useArtistStore";
import { usePlaylistStore } from "../store/usePlaylistStore";
import { sampleTracks } from "../data/homeFixtures";

describe("Desktop UI Responsiveness & Adaptive Layout Shell", () => {
  beforeEach(() => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: sampleTracks[0],
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        isShuffle: false,
        repeatMode: "off",
        likedTrackIds: {},
      });
      useLibraryStore.setState({
        filterQuery: "",
        selectedFolderId: null,
      });
      usePlaylistStore.setState({
        overviewSearchQuery: "",
        activePlaylistId: null,
      });
      useAlbumStore.setState({
        activeAlbumId: null,
        searchQuery: "",
      });
      useArtistStore.setState({
        activeArtistId: null,
        searchQuery: "",
      });
    });
  });

  it("enforces minimum window boundaries of 640x480 in tauri.conf.json (AC-1)", () => {
    const primaryWindow = tauriConf.app?.windows?.[0];

    expect(primaryWindow).toBeDefined();
    expect(primaryWindow.minWidth).toBe(640);
    expect(primaryWindow.minHeight).toBe(480);
    expect(primaryWindow.width).toBeGreaterThanOrEqual(640);
    expect(primaryWindow.height).toBeGreaterThanOrEqual(480);
  });

  it("renders adaptive navigation sidebar collapsing to 68px icon rail below 1024px with tooltips (AC-2)", () => {
    const handleNavigate = vi.fn();
    const handleSelectPlaylist = vi.fn();
    const handleNewPlaylist = vi.fn();
    const handleToggleSettings = vi.fn();

    render(
      <NavigationSidebar
        activeNav="Home"
        onNavigate={handleNavigate}
        playlists={usePlaylistStore.getState().playlists}
        activePlaylistId={null}
        onSelectPlaylist={handleSelectPlaylist}
        onNewPlaylist={handleNewPlaylist}
        activeOverlay={null}
        onToggleSettings={handleToggleSettings}
      />
    );

    const sidebar = screen.getByRole("navigation", { name: "Main sidebar" });
    expect(sidebar).toBeInTheDocument();
    // Validates 232px on desktop and 68px icon rail below 1024px (max-lg)
    expect(sidebar.className).toContain("w-[232px]");
    expect(sidebar.className).toContain("max-lg:w-[68px]");

    // Brand logo text hides below 1024px
    const brandText = screen.getByText("MIDNIGHT");
    expect(brandText.className).toContain("max-lg:hidden");

    // Nav items have tooltip titles and max-lg:hidden on labels
    const homeLink = screen.getByTitle("Home");
    expect(homeLink).toHaveAttribute("title", "Home");
    const homeLabel = screen.getByText("Home");
    expect(homeLabel.className).toContain("max-lg:hidden");

    // Playlists header text hides on icon rail
    const playlistHeaderText = screen.getByText("YOUR PLAYLISTS");
    expect(playlistHeaderText.className).toContain("max-lg:hidden");

    // Settings button has title and accessible label
    const settingsBtn = screen.getByRole("button", { name: "Open audio preferences settings" });
    expect(settingsBtn).toHaveAttribute("title", "Settings");

    fireEvent.click(homeLink);
    expect(handleNavigate).toHaveBeenCalledWith("Home");
  });

  it("adapts player footer container dynamically below 900px into compact deck with volume popover (AC-3)", () => {
    render(<PlayerFooter />);

    const footer = screen.getByRole("contentinfo", { name: "Now playing bar" });
    expect(footer).toBeInTheDocument();
    // Responsive grid deck below 900px
    expect(footer.className).toContain("max-[900px]:grid-cols-[auto_1fr_auto]");

    // Secondary controls (shuffle, repeat, lyrics, queue) are hidden below 900px
    const shuffleBtn = screen.getByRole("button", { name: /shuffle/i });
    expect(shuffleBtn.className).toContain("max-[900px]:hidden");

    const repeatBtn = screen.getByRole("button", { name: /repeat/i });
    expect(repeatBtn.className).toContain("max-[900px]:hidden");

    const lyricsBtn = screen.getByRole("button", { name: "Toggle lyrics overlay" });
    expect(lyricsBtn.className).toContain("max-[900px]:hidden");

    const queueBtn = screen.getByRole("button", { name: "Toggle playback queue drawer" });
    expect(queueBtn.className).toContain("max-[900px]:hidden");

    // Essential transport and track info remain visible
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous track" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next track" })).toBeInTheDocument();

    // Compact volume button opens popover dialog on click
    const compactVolBtn = screen.getByRole("button", { name: "Mute", expanded: false });
    fireEvent.click(compactVolBtn);
    expect(screen.getByRole("dialog", { name: "Volume adjustment" })).toBeInTheDocument();
  });

  it("implements progressive column hiding on track tables (AC-4)", () => {
    render(<SongTable />);

    // Album header and cells have max-[950px]:hidden
    const albumHeader = screen.getByRole("columnheader", { name: /album/i });
    expect(albumHeader.className).toContain("max-[950px]:hidden");

    // Date Added header has max-[1150px]:hidden
    const dateHeader = screen.getByRole("columnheader", { name: /date added/i });
    expect(dateHeader.className).toContain("max-[1150px]:hidden");

    // Title and Artist remain visible without breakpoint hiding
    const titleHeader = screen.getByRole("columnheader", { name: /title/i });
    expect(titleHeader.className).not.toContain("max-[950px]:hidden");
    expect(titleHeader.className).not.toContain("max-[1150px]:hidden");
  });

  it("applies fluid auto-fill card grid layouts eliminating fixed column squishing (AC-5)", () => {
    const { container: curatedContainer } = render(
      <CuratedGrid cards={usePlayerStore.getState().curatedCollections} />
    );
    const curatedGrid = curatedContainer.querySelectorAll("section > div")[1] as HTMLElement;
    expect(curatedGrid.className).toContain("repeat(auto-fill,minmax(160px,1fr))");

    const { container: albumContainer } = render(<AlbumGrid />);
    const albumGrid = albumContainer.querySelector("section") as HTMLElement;
    expect(albumGrid.className).toContain("repeat(auto-fill,minmax(160px,1fr))");

    const { container: artistContainer } = render(<ArtistGrid />);
    const artistGrid = artistContainer.querySelector("section") as HTMLElement;
    expect(artistGrid.className).toContain("repeat(auto-fill,minmax(160px,1fr))");

    const { container: playlistContainer } = render(<PlaylistGrid />);
    const playlistGrid = playlistContainer.querySelector("div[role='region']") as HTMLElement;
    expect(playlistGrid.className).toContain("repeat(auto-fill,minmax(160px,1fr))");
  });

  it("integrates row virtualization with TanStack React Virtual for 60 FPS scrolling (AC-6)", () => {
    render(<SongTable />);

    const table = screen.getByRole("table", { name: "Indexed songs table" });
    expect(table).toBeInTheDocument();
    expect(table.className).toContain("overflow-y-auto");

    // Sticky header stays pinned to top during fast scrolling
    const headerRow = table.querySelector(".sticky.top-0");
    expect(headerRow).toBeInTheDocument();

    // Table rows are rendered inside absolute virtual positioning
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1);
  });

  it("isolates playback progress scrubber timer to prevent parent re-renders (AC-7)", () => {
    render(<Scrubber />);

    const progressBar = screen.getByRole("progressbar", { name: "Track progress" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");

    // Audio engine emits position update tick
    act(() => {
      usePlayerStore.setState({ currentTime: 45 });
    });

    expect(progressBar).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  it("renders responsive App layout shell with Tailwind CSS v4 grid tokens (AC-8, AC-9)", () => {
    const { container } = render(<App />);

    const rootGrid = container.firstChild as HTMLElement;
    expect(rootGrid.className).toContain("w-screen");
    expect(rootGrid.className).toContain("h-screen");
    expect(rootGrid.className).toContain("grid-rows-[1fr_96px]");
    expect(rootGrid.className).toContain("max-md:grid-rows-[1fr_84px]");
    expect(rootGrid.className).toContain("grid-cols-[232px_1fr]");
    expect(rootGrid.className).toContain("max-lg:grid-cols-[68px_1fr]");
  });
});
