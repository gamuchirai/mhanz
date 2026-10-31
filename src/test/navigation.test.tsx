import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { AppShell } from "../components/layout/AppShell";
import { TopNavBar, getNavTitle } from "../components/layout/TopNavBar";
import {
  Button,
  IconButton,
  Card,
  Badge,
  TextInput,
} from "../components/ui";
import {
  sanitizeNavView,
  useNavigationStore,
} from "../store/useNavigationStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useArtistStore } from "../store/useArtistStore";
import { usePlaylistStore } from "../store/usePlaylistStore";

describe("Design System and Navigation Shell", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.getState().reset("Home");
    });
  });

  describe("useNavigationStore History Traversal (AC-1, AC-2, AC-3, AC-4, AC-5)", () => {
    it("initializes with Home view and single history entry at index 0 (AC-1)", () => {
      const state = useNavigationStore.getState();
      expect(state.current.view).toBe("Home");
      expect(state.history.length).toBe(1);
      expect(state.currentIndex).toBe(0);
      expect(state.current.id).toBeDefined();
      expect(state.current.timestamp).toBeGreaterThan(0);
    });

    it("pushes new entries and clears forward history on navigation (AC-1, AC-2)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });
      let state = useNavigationStore.getState();
      expect(state.current.view).toBe("Albums");
      expect(state.history.length).toBe(2);
      expect(state.currentIndex).toBe(1);

      act(() => {
        useNavigationStore.getState().navigate("Artists");
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Artists");
      expect(state.history.length).toBe(3);
      expect(state.currentIndex).toBe(2);

      // Step back to Albums
      act(() => {
        useNavigationStore.getState().goBack();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Albums");
      expect(state.currentIndex).toBe(1);

      // Navigate to Playlists from Albums: forward history entry Artists is discarded
      act(() => {
        useNavigationStore.getState().navigate("Playlists");
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Playlists");
      expect(state.history.length).toBe(3);
      expect(state.currentIndex).toBe(2);
      expect(state.history.map((h) => h.view)).toEqual(["Home", "Albums", "Playlists"]);
    });

    it("steps back and forward through history stack safely (AC-3, AC-4)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Search");
        useNavigationStore.getState().navigate("Your Library");
      });

      let state = useNavigationStore.getState();
      expect(state.current.view).toBe("Your Library");
      expect(state.currentIndex).toBe(2);

      // Step back to Search
      act(() => {
        useNavigationStore.getState().goBack();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Search");
      expect(state.currentIndex).toBe(1);

      // Step back to Home
      act(() => {
        useNavigationStore.getState().goBack();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Home");
      expect(state.currentIndex).toBe(0);

      // Step back at boundary is a safe no op
      act(() => {
        useNavigationStore.getState().goBack();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Home");
      expect(state.currentIndex).toBe(0);

      // Step forward to Search
      act(() => {
        useNavigationStore.getState().goForward();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Search");
      expect(state.currentIndex).toBe(1);

      // Step forward to Your Library
      act(() => {
        useNavigationStore.getState().goForward();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Your Library");
      expect(state.currentIndex).toBe(2);

      // Step forward at forward boundary is a safe no op
      act(() => {
        useNavigationStore.getState().goForward();
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Your Library");
      expect(state.currentIndex).toBe(2);
    });

    it("suppresses duplicate navigations with matching view and params (AC-1)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });
      expect(useNavigationStore.getState().history.length).toBe(2);

      // Same view with no params is suppressed
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });
      expect(useNavigationStore.getState().history.length).toBe(2);

      // Navigating to detail view with albumId is NOT suppressed
      act(() => {
        useNavigationStore.getState().navigate("Albums", { albumId: "album-99" });
      });
      expect(useNavigationStore.getState().history.length).toBe(3);
      expect(useNavigationStore.getState().current.params?.albumId).toBe("album-99");

      // Duplicate with same albumId is suppressed
      act(() => {
        useNavigationStore.getState().navigate("Albums", { albumId: "album-99" });
      });
      expect(useNavigationStore.getState().history.length).toBe(3);

      // Returning to Albums overview with empty params is allowed
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });
      expect(useNavigationStore.getState().history.length).toBe(4);
    });

    it("caps history stack at 50 records to prevent memory drift (AC-1)", () => {
      act(() => {
        for (let i = 0; i < 60; i++) {
          const view = i % 2 === 0 ? "Search" : "Home";
          useNavigationStore.getState().navigate(view, { searchQuery: `query-${i}` });
        }
      });

      const state = useNavigationStore.getState();
      expect(state.history.length).toBe(50);
      expect(state.currentIndex).toBe(49);
    });

    it("sanitizes unrecognized view values safely to Home (AC-1)", () => {
      expect(sanitizeNavView("UnknownScreen")).toBe("Home");
      expect(sanitizeNavView("Albums")).toBe("Albums");

      act(() => {
        // @ts-expect-error testing runtime fallback
        useNavigationStore.getState().navigate("NonExistentRoute");
      });
      expect(useNavigationStore.getState().current.view).toBe("Home");
    });

    it("supports in place replacement and full stack reset (AC-1)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Playlists");
        useNavigationStore.getState().replace("Albums", { albumId: "album-1" });
      });

      let state = useNavigationStore.getState();
      expect(state.current.view).toBe("Albums");
      expect(state.current.params?.albumId).toBe("album-1");
      expect(state.history.length).toBe(2);

      act(() => {
        useNavigationStore.getState().reset("Search");
      });
      state = useNavigationStore.getState();
      expect(state.current.view).toBe("Search");
      expect(state.history.length).toBe(1);
      expect(state.currentIndex).toBe(0);
    });
  });

  describe("TopNavBar Controls and Keyboard Shortcuts (AC-3, AC-4, AC-5)", () => {
    it("renders disabled visual states when navigation boundaries are reached (AC-5)", () => {
      render(<TopNavBar />);

      const backBtn = screen.getByTestId("nav-back-button");
      const forwardBtn = screen.getByTestId("nav-forward-button");

      expect(backBtn).toBeDisabled();
      expect(forwardBtn).toBeDisabled();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Home");
    });

    it("enables back button when history is available and triggers navigation (AC-3, AC-5)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });

      render(<TopNavBar />);

      const backBtn = screen.getByTestId("nav-back-button");
      const forwardBtn = screen.getByTestId("nav-forward-button");

      expect(backBtn).toBeEnabled();
      expect(forwardBtn).toBeDisabled();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Albums");

      fireEvent.click(backBtn);
      expect(useNavigationStore.getState().current.view).toBe("Home");
    });

    it("enables forward button after stepping back and steps forward on click (AC-4, AC-5)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Liked Songs");
        useNavigationStore.getState().goBack();
      });

      render(<TopNavBar />);

      const backBtn = screen.getByTestId("nav-back-button");
      const forwardBtn = screen.getByTestId("nav-forward-button");

      expect(backBtn).toBeDisabled();
      expect(forwardBtn).toBeEnabled();

      fireEvent.click(forwardBtn);
      expect(useNavigationStore.getState().current.view).toBe("Liked Songs");
    });

    it("handles Alt+Left and Alt+Right desktop keyboard shortcuts (AC-3, AC-4)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Search");
      });

      render(<TopNavBar />);
      expect(useNavigationStore.getState().current.view).toBe("Search");

      // Press Alt+ArrowLeft to go back
      fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });
      expect(useNavigationStore.getState().current.view).toBe("Home");

      // Press Alt+ArrowRight to go forward
      fireEvent.keyDown(window, { key: "ArrowRight", altKey: true });
      expect(useNavigationStore.getState().current.view).toBe("Search");
    });

    it("ignores Alt keyboard shortcuts when focus is inside text input (Invariants)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Playlists");
      });

      render(
        <div>
          <TopNavBar />
          <input data-testid="search-box" />
        </div>
      );

      const input = screen.getByTestId("search-box");
      input.focus();

      // Trigger shortcut on the input element
      fireEvent.keyDown(input, { key: "ArrowLeft", altKey: true });
      // View should remain on Playlists because input has focus
      expect(useNavigationStore.getState().current.view).toBe("Playlists");
    });

    it("handles mouse buttons 3 and 4 for back and forward traversal (AC-3, AC-4)", () => {
      act(() => {
        useNavigationStore.getState().navigate("Your Library");
      });

      render(<TopNavBar />);

      // Mouse back button (button index 3)
      fireEvent.mouseUp(window, { button: 3 });
      expect(useNavigationStore.getState().current.view).toBe("Home");

      // Mouse forward button (button index 4)
      fireEvent.mouseUp(window, { button: 4 });
      expect(useNavigationStore.getState().current.view).toBe("Your Library");
    });

    it("resolves entity title in breadcrumb via getNavTitle (AC-1, AC-3)", () => {
      const albumTitle = useAlbumStore.getState().albums[0]?.title ?? "First Album";
      const albumId = useAlbumStore.getState().albums[0]?.id ?? "album-1";

      const title = getNavTitle({
        id: "test-id",
        view: "Albums",
        params: { albumId },
        timestamp: Date.now(),
      });
      expect(title).toBe(albumTitle);

      const artistName = useArtistStore.getState().artists[0]?.name ?? "First Artist";
      const artistId = useArtistStore.getState().artists[0]?.id ?? "artist-1";

      const artistTitle = getNavTitle({
        id: "test-id-2",
        view: "Artists",
        params: { artistId },
        timestamp: Date.now(),
      });
      expect(artistTitle).toBe(artistName);

      const playlistTitle = usePlaylistStore.getState().playlists[0]?.title ?? "First Playlist";
      const playlistId = usePlaylistStore.getState().playlists[0]?.id ?? "pl-1";

      const plTitle = getNavTitle({
        id: "test-id-3",
        view: "Playlists",
        params: { playlistId },
        timestamp: Date.now(),
      });
      expect(plTitle).toBe(playlistTitle);

      // Fallback titles when entity is missing
      expect(
        getNavTitle({
          id: "missing-1",
          view: "Albums",
          params: { albumId: "nonexistent" },
          timestamp: Date.now(),
        })
      ).toBe("Album");

      expect(
        getNavTitle({
          id: "missing-2",
          view: "Artists",
          params: { artistId: "nonexistent" },
          timestamp: Date.now(),
        })
      ).toBe("Artist");

      expect(
        getNavTitle({
          id: "missing-3",
          view: "Playlists",
          params: { playlistId: "nonexistent" },
          timestamp: Date.now(),
        })
      ).toBe("Playlist");
    });

    it("respects custom onBack, onForward, and explicit canGoBack overrides (AC-3, AC-4, AC-5)", () => {
      const customBack = vi.fn();
      const customForward = vi.fn();

      render(
        <TopNavBar
          onBack={customBack}
          onForward={customForward}
          canGoBack={true}
          canGoForward={true}
          title="Custom View Title"
        />
      );

      const backBtn = screen.getByTestId("nav-back-button");
      const forwardBtn = screen.getByTestId("nav-forward-button");
      const titleSpan = screen.getByTestId("nav-current-title");

      expect(titleSpan).toHaveTextContent("Custom View Title");
      expect(backBtn).toBeEnabled();
      expect(forwardBtn).toBeEnabled();

      fireEvent.click(backBtn);
      expect(customBack).toHaveBeenCalledTimes(1);

      fireEvent.click(forwardBtn);
      expect(customForward).toHaveBeenCalledTimes(1);
    });
  });

  describe("Midnight UI Primitives (AC-6, AC-7)", () => {
    it("renders Button in primary, ghost, outline, and disabled states (AC-7)", () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <Button variant="primary" size="md" onClick={handleClick}>
          Play Song
        </Button>
      );

      const btn = screen.getByRole("button", { name: "Play Song" });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain("bg-midnight-accent");

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      rerender(
        <Button variant="ghost" disabled={true}>
          Ghost Action
        </Button>
      );
      const ghostBtn = screen.getByRole("button", { name: "Ghost Action" });
      expect(ghostBtn).toBeDisabled();
      expect(ghostBtn.className).toContain("opacity-40");

      rerender(
        <Button variant="outline" size="sm">
          Small Outline
        </Button>
      );
      const outlineBtn = screen.getByRole("button", { name: "Small Outline" });
      expect(outlineBtn.className).toContain("border-midnight-border");
      expect(outlineBtn.className).toContain("text-xs");
    });

    it("renders IconButton with accessible label, tooltip, and icon (AC-7)", () => {
      const handleIconClick = vi.fn();
      render(
        <IconButton
          icon="#home"
          label="Return Home"
          size="md"
          variant="panel"
          onClick={handleIconClick}
        />
      );

      const iconBtn = screen.getByRole("button", { name: "Return Home" });
      expect(iconBtn).toHaveAttribute("title", "Return Home");
      expect(iconBtn).toHaveAttribute("aria-label", "Return Home");

      fireEvent.click(iconBtn);
      expect(handleIconClick).toHaveBeenCalledTimes(1);
    });

    it("renders Card container with panel and subtle variants (AC-7)", () => {
      const handleCardClick = vi.fn();
      const { rerender } = render(
        <Card variant="panel" interactive={true} onClick={handleCardClick}>
          <span>Card Content</span>
        </Card>
      );

      const card = screen.getByRole("button");
      expect(card).toBeInTheDocument();
      expect(card.className).toContain("bg-midnight-panel");
      expect(card.className).toContain("border-midnight-border");

      fireEvent.click(card);
      expect(handleCardClick).toHaveBeenCalledTimes(1);

      // Keyboard activation via Enter key
      fireEvent.keyDown(card, { key: "Enter" });
      expect(handleCardClick).toHaveBeenCalledTimes(2);

      rerender(
        <Card variant="subtle" interactive={false}>
          <span>Subtle Content</span>
        </Card>
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("Subtle Content").parentElement?.className).toContain(
        "bg-midnight-surface/60"
      );
    });

    it("renders Badge pill with accent, neutral, and subtle variants (AC-7)", () => {
      const { rerender } = render(<Badge variant="accent">Hi-Res</Badge>);
      const badge = screen.getByText("Hi-Res");
      expect(badge.className).toContain("bg-midnight-accent/15");
      expect(badge.className).toContain("text-midnight-accent");

      rerender(<Badge variant="neutral">Lossless</Badge>);
      expect(screen.getByText("Lossless").className).toContain("bg-white/10");

      rerender(<Badge variant="subtle">FLAC</Badge>);
      expect(screen.getByText("FLAC").className).toContain("bg-midnight-panel");
    });

    it("renders Button in large size and prevents clicks when disabled (AC-7)", () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <Button size="lg" onClick={handleClick}>
          Large Button
        </Button>
      );

      const btn = screen.getByRole("button", { name: "Large Button" });
      expect(btn.className).toContain("text-base");
      expect(btn.className).toContain("py-2.5");

      rerender(
        <Button size="lg" disabled={true} onClick={handleClick}>
          Large Disabled
        </Button>
      );
      const disabledBtn = screen.getByRole("button", { name: "Large Disabled" });
      expect(disabledBtn).toBeDisabled();
      fireEvent.click(disabledBtn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("renders IconButton without leading hash and supports primary and subtle variants (AC-7)", () => {
      const { rerender } = render(
        <IconButton icon="play" label="Play Track" variant="primary" size="lg" />
      );

      const primaryBtn = screen.getByRole("button", { name: "Play Track" });
      expect(primaryBtn.className).toContain("bg-midnight-accent");
      expect(primaryBtn.className).toContain("w-10");
      const svgUse = primaryBtn.querySelector("use");
      expect(svgUse).toHaveAttribute("href", "#play");

      rerender(
        <IconButton icon="#volume" label="Mute Volume" variant="subtle" size="sm" />
      );
      const subtleBtn = screen.getByRole("button", { name: "Mute Volume" });
      expect(subtleBtn.className).toContain("bg-white/5");
      expect(subtleBtn.className).toContain("w-7");
    });

    it("activates interactive Card via Space key and ignores other keys (AC-7)", () => {
      const handleCardClick = vi.fn();
      render(
        <Card interactive={true} onClick={handleCardClick}>
          <span>Space Activation Card</span>
        </Card>
      );

      const card = screen.getByRole("button");

      // Press Escape: should not trigger
      fireEvent.keyDown(card, { key: "Escape" });
      expect(handleCardClick).not.toHaveBeenCalled();

      // Press Space: should trigger
      fireEvent.keyDown(card, { key: " " });
      expect(handleCardClick).toHaveBeenCalledTimes(1);
    });

    it("renders TextInput with placeholder, icon, and handles change (AC-7)", () => {
      const handleChange = vi.fn();
      render(
        <TextInput
          value="Rock"
          onChange={handleChange}
          placeholder="Search library..."
          icon="#search"
        />
      );

      const input = screen.getByPlaceholderText("Search library...");
      expect(input).toHaveValue("Rock");
      expect(input.className).toContain("border-midnight-border");

      fireEvent.change(input, { target: { value: "Jazz" } });
      expect(handleChange).toHaveBeenCalledWith("Jazz");
    });

    it("renders TextInput without icon and verifies disabled state (AC-7)", () => {
      const handleChange = vi.fn();
      render(
        <TextInput
          value=""
          placeholder="Filter tracks..."
          disabled={true}
          onChange={handleChange}
        />
      );

      const input = screen.getByPlaceholderText("Filter tracks...");
      expect(input).toBeDisabled();
      expect(input.className).toContain("px-3.5");
      expect(input.className).toContain("disabled:opacity-40");
    });
  });

  describe("AppShell Layout and App Integration (AC-1, AC-2, AC-8)", () => {
    it("renders AppShell modular slots with clean scroll containment (AC-8)", () => {
      render(
        <AppShell
          sidebar={<aside data-testid="test-sidebar">Sidebar</aside>}
          topNav={<header data-testid="test-topnav">TopNav</header>}
          footer={<footer data-testid="test-footer">Footer</footer>}
          overlays={<div data-testid="test-overlays">Overlays</div>}
        >
          <div data-testid="test-content">View Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("test-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("test-topnav")).toBeInTheDocument();
      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByTestId("test-footer")).toBeInTheDocument();
      expect(screen.getByTestId("test-overlays")).toBeInTheDocument();
    });

    it("renders AppShell without optional slots and applies custom className (AC-8)", () => {
      const { container } = render(
        <AppShell
          sidebar={<aside data-testid="minimal-sidebar">Sidebar</aside>}
          footer={<footer data-testid="minimal-footer">Footer</footer>}
          className="custom-shell-class"
        >
          <div data-testid="minimal-content">Minimal Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("minimal-content")).toBeInTheDocument();
      expect(screen.getByTestId("minimal-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("minimal-footer")).toBeInTheDocument();
      expect(container.firstElementChild?.className).toContain("custom-shell-class");
    });

    it("integrates App with useNavigationStore and TopNavBar across view changes (AC-1, AC-2, AC-8)", () => {
      render(<App />);

      // Starts on Home
      expect(screen.getByRole("main", { name: "Home and discovery screen" })).toBeInTheDocument();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Home");

      // Navigate to Albums via sidebar
      const albumsLink = screen.getByTitle("Albums");
      fireEvent.click(albumsLink);

      expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Albums");
      expect(useNavigationStore.getState().current.view).toBe("Albums");

      // Navigate to Search via sidebar
      const searchLink = screen.getByTitle("Search");
      fireEvent.click(searchLink);

      expect(screen.getByRole("main", { name: "Search and explore screen" })).toBeInTheDocument();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Search");

      // Click TopNavBar back button
      const backBtn = screen.getByTestId("nav-back-button");
      fireEvent.click(backBtn);

      // Restores Albums screen
      expect(screen.getByRole("main", { name: "Albums screen" })).toBeInTheDocument();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Albums");

      // Click TopNavBar back button again
      fireEvent.click(backBtn);

      // Restores Home screen
      expect(screen.getByRole("main", { name: "Home and discovery screen" })).toBeInTheDocument();
      expect(screen.getByTestId("nav-current-title")).toHaveTextContent("Home");
    });

    it("synchronizes route parameters with active entity stores and restores detail state on history traversal (AC-1, AC-2, AC-3)", () => {
      render(<App />);

      // Navigate to Albums
      act(() => {
        useNavigationStore.getState().navigate("Albums");
      });
      expect(useAlbumStore.getState().activeAlbumId).toBeNull();

      // Navigate to specific Album detail
      act(() => {
        useNavigationStore.getState().navigate("Albums", { albumId: "album-1" });
      });
      expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");

      // Navigate to Playlists overview
      act(() => {
        useNavigationStore.getState().navigate("Playlists");
      });
      expect(usePlaylistStore.getState().activePlaylistId).toBeNull();

      // Go back: restores Albums view and album-1 active state
      act(() => {
        useNavigationStore.getState().goBack();
      });
      expect(useNavigationStore.getState().current.view).toBe("Albums");
      expect(useAlbumStore.getState().activeAlbumId).toBe("album-1");

      // Go back again: restores Albums overview with null activeAlbumId
      act(() => {
        useNavigationStore.getState().goBack();
      });
      expect(useNavigationStore.getState().current.view).toBe("Albums");
      expect(useAlbumStore.getState().activeAlbumId).toBeNull();
    });
  });
});
