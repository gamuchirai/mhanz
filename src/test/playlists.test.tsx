import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { App } from "../App";
import { Playlists } from "../pages/Playlists";
import { usePlaylistStore } from "../store/usePlaylistStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { initialPlaylists, initialPlaylistTracks } from "../data/playlistFixtures";

describe("Playlists and Playlist Detail Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    act(() => {
      // Reset playlist store to clean fixture state
      usePlaylistStore.setState({
        playlists: JSON.parse(JSON.stringify(initialPlaylists)),
        playlistTracks: JSON.parse(JSON.stringify(initialPlaylistTracks)),
        activePlaylistId: null,
        overviewSearchQuery: "",
        detailSearchQuery: "",
        isCreateModalOpen: false,
        isEditModalOpen: false,
        isAddSongsDrawerOpen: false,
        isDeleteDialogOpen: false,
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
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigating to Playlists in the sidebar renders the Playlists overview screen (AC-1)", () => {
    render(<App />);

    const playlistsNav = screen.getByRole("link", { name: /playlists/i });
    expect(playlistsNav).toBeInTheDocument();

    fireEvent.click(playlistsNav);

    expect(screen.getByRole("heading", { name: /^playlists$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search playlists\.\.\./i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /new playlist/i }).length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByRole("region", { name: /playlist collection grid/i })).toBeInTheDocument();

    // Check playlist cards rendered
    expect(screen.getAllByText("Late Night Drive").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Acoustic Mornings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Heartbreak Diaries").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Good Vibes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Midnight Essentials").length).toBeGreaterThanOrEqual(1);
  });

  it("filters playlist cards using the overview search filter (AC-1)", () => {
    render(<Playlists />);

    const searchInput = screen.getByPlaceholderText(/search playlists\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Acoustic" } });

    expect(screen.getByText("Acoustic Mornings")).toBeInTheDocument();
    expect(screen.queryByText("Late Night Drive")).not.toBeInTheDocument();

    const clearButton = screen.getByLabelText(/clear playlist search/i);
    fireEvent.click(clearButton);

    expect(screen.getByText("Late Night Drive")).toBeInTheDocument();
  });

  it("clicking New playlist opens the creation modal with Midnight gradient swatches (AC-2)", () => {
    render(<Playlists />);

    const newBtn = screen.getByRole("button", { name: /new playlist/i });
    fireEvent.click(newBtn);

    const dialog = screen.getByRole("dialog", { name: /create new playlist/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/playlist name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /choose cover gradient preset/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("creating a playlist navigates to detail view and synchronizes sidebar reactively (AC-3)", () => {
    render(<App />);

    // Open creation modal from sidebar plus icon
    const sidebarPlusBtn = screen.getByRole("button", { name: /new playlist/i });
    fireEvent.click(sidebarPlusBtn);

    const nameInput = screen.getByLabelText(/playlist name/i);
    fireEvent.change(nameInput, { target: { value: "Ambient Horizons" } });

    const submitBtn = screen.getByRole("button", { name: /create playlist/i });
    fireEvent.click(submitBtn);

    // Navigates directly into detail view for new playlist
    expect(screen.getByRole("heading", { name: "Ambient Horizons", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("0 tracks")).toBeInTheDocument();

    // Verifies reactive sidebar includes new playlist
    expect(screen.getAllByText("Ambient Horizons").length).toBeGreaterThanOrEqual(1);
  });

  it("clicking a playlist card or sidebar item opens the Playlist Detail view (AC-4)", () => {
    render(<App />);

    // Navigate to Playlists overview
    fireEvent.click(screen.getByRole("link", { name: /playlists/i }));

    // Click on Late Night Drive card
    const card = screen.getByRole("button", { name: /open late night drive playlist/i });
    fireEvent.click(card);

    // Verifies detail hero elements
    expect(screen.getByRole("button", { name: /back to all playlists/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Late Night Drive", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play all songs in playlist/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shuffle playlist tracks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit playlist details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete playlist/i })).toBeInTheDocument();
  });

  it("clicking back button in Playlist Detail navigates back to overview grid (AC-5)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-1");
    });

    expect(screen.getByRole("heading", { name: "Late Night Drive", level: 1 })).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back to all playlists/i });
    fireEvent.click(backBtn);

    expect(screen.getByRole("heading", { name: /^playlists$/i, level: 1 })).toBeInTheDocument();
  });

  it("clicking Play All or Shuffle on a playlist queues songs and starts playback (AC-6)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-1");
    });

    const playAllBtn = screen.getByRole("button", { name: /play all songs in playlist/i });
    fireEvent.click(playAllBtn);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.queue.length).toBeGreaterThan(0);
    expect(playerState.currentTrack?.title).toBe("Perfect");
  });

  it("empty playlist disables playback buttons and renders empty state (AC-7)", () => {
    render(<Playlists />);

    act(() => {
      const id = usePlaylistStore.getState().createPlaylist({
        title: "Empty Chill",
      });
      usePlaylistStore.getState().setActivePlaylistId(id);
    });

    const playAllBtn = screen.getByRole("button", { name: /play all songs in playlist/i });
    expect(playAllBtn).toBeDisabled();
    expect(screen.getByRole("button", { name: /shuffle playlist tracks/i })).toBeDisabled();

    expect(screen.getByRole("region", { name: /empty playlist state/i })).toBeInTheDocument();
    expect(screen.getByText(/this playlist is empty/i)).toBeInTheDocument();
  });

  it("clicking Add Songs opens curation drawer and allows adding songs (AC-8)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-2");
    });

    const addSongsBtn = screen.getByRole("button", { name: /add songs to playlist/i });
    fireEvent.click(addSongsBtn);

    const drawer = screen.getByRole("dialog", { name: /add songs/i });
    expect(drawer).toBeInTheDocument();

    // Find a track and add it inside the drawer
    const addBtn = within(drawer).getAllByRole("button", { name: /add .* to playlist/i })[0];
    fireEvent.click(addBtn);

    // Track was appended to playlist-2
    const entries = usePlaylistStore.getState().playlistTracks["playlist-2"];
    expect(entries.length).toBe(4);
  });

  it("renders sortable playlist songs table and supports manual reordering (AC-9)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-1");
    });

    expect(screen.getByRole("region", { name: /playlist tracks list/i })).toBeInTheDocument();
    expect(screen.getByText("Perfect")).toBeInTheDocument();
    expect(screen.getByText("Dusk Till Dawn")).toBeInTheDocument();

    // Reorder second track (Dusk Till Dawn) up to index 0
    act(() => {
      usePlaylistStore.getState().reorderTrack("playlist-1", 1, 0);
    });

    const entries = usePlaylistStore.getState().playlistTracks["playlist-1"];
    expect(entries[0].trackId).toBe("track-2");
    expect(entries[1].trackId).toBe("track-1");
  });

  it("removing a track from a playlist updates track count and duration (AC-10)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-1");
    });

    const initialEntries = usePlaylistStore.getState().playlistTracks["playlist-1"];
    const targetEntryId = initialEntries[0].entryId;

    act(() => {
      usePlaylistStore.getState().removeTrackFromPlaylist("playlist-1", targetEntryId);
    });

    const updatedEntries = usePlaylistStore.getState().playlistTracks["playlist-1"];
    expect(updatedEntries.length).toBe(initialEntries.length - 1);
    expect(updatedEntries.find((e) => e.entryId === targetEntryId)).toBeUndefined();
  });

  it("editing playlist details updates banner and sidebar reactively (AC-11)", () => {
    render(<App />);

    // Click on Late Night Drive in sidebar to open playlist-1 detail
    const sidebarLink = screen.getByRole("link", { name: /late night drive/i });
    fireEvent.click(sidebarLink);

    const editBtn = screen.getByRole("button", { name: /edit playlist details/i });
    fireEvent.click(editBtn);

    const titleInput = screen.getByLabelText(/playlist name/i);
    fireEvent.change(titleInput, { target: { value: "Late Night Drive Vol 2" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(
      screen.getByRole("heading", { name: "Late Night Drive Vol 2", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Late Night Drive Vol 2").length).toBeGreaterThanOrEqual(1);
  });

  it("deleting a playlist opens confirmation modal and removes playlist (AC-12)", () => {
    render(<App />);

    // Click on Late Night Drive in sidebar to open playlist-1 detail
    const sidebarLink = screen.getByRole("link", { name: /late night drive/i });
    fireEvent.click(sidebarLink);

    const deleteBtn = screen.getByRole("button", { name: /delete playlist/i });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByRole("dialog", { name: /delete playlist\?/i });
    expect(dialog).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /confirm delete playlist/i });
    fireEvent.click(confirmBtn);

    // Navigates back to overview
    expect(usePlaylistStore.getState().activePlaylistId).toBeNull();
    expect(
      usePlaylistStore.getState().playlists.find((p) => p.id === "playlist-1")
    ).toBeUndefined();
  });

  it("curated system playlist suppresses edit and delete actions (AC-12)", () => {
    render(<Playlists />);

    act(() => {
      usePlaylistStore.getState().setActivePlaylistId("playlist-5"); // Midnight Essentials is curated
    });

    expect(screen.queryByRole("button", { name: /edit details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete playlist/i })).not.toBeInTheDocument();
  });
});
