import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { Library } from "../pages/Library";
import { useLibraryStore } from "../store/useLibraryStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { initialMusicFolders, initialLibraryTracks } from "../data/libraryFixtures";

describe("Your Library and Folder Browser Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    act(() => {
      useLibraryStore.setState({
        folders: [...initialMusicFolders],
        tracks: [...initialLibraryTracks],
        isFolderPanelExpanded: false,
        selectedFolderId: null,
        filterQuery: "",
        sortState: {
          column: "title",
          direction: "asc",
        },
        isAddFolderModalOpen: false,
        folderPendingRemoval: null,
      });

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

  it("renders library summary header with track count, duration, folders, and actions (AC-1)", () => {
    render(<Library />);

    expect(screen.getByRole("heading", { name: /your library/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/9 tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/2 folders indexed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play all songs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shuffle all songs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand folders panel/i })).toBeInTheDocument();
  });

  it("navigating to Your Library in sidebar opens Library in App shell (AC-1)", () => {
    render(<App />);

    const libraryNavButton = screen.getByRole("link", { name: /your library/i });
    expect(libraryNavButton).toBeInTheDocument();

    fireEvent.click(libraryNavButton);

    expect(screen.getByRole("heading", { name: /your library/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /indexed songs table/i })).toBeInTheDocument();
  });

  it("toggles collapsible folder management panel presenting monitored folder cards (AC-2)", () => {
    render(<Library />);

    // Initially collapsed
    expect(screen.queryByRole("region", { name: /monitored music folders/i })).not.toBeInTheDocument();

    const toggleButton = screen.getByRole("button", { name: /expand folders panel/i });
    fireEvent.click(toggleButton);

    // Now expanded
    const folderPanel = screen.getByRole("region", { name: /monitored music folders/i });
    expect(folderPanel).toBeInTheDocument();
    expect(screen.getByText("Afrobeats Grooves")).toBeInTheDocument();
    expect(screen.getByText("Midnight Chill")).toBeInTheDocument();

    // Toggle to collapse
    fireEvent.click(screen.getByRole("button", { name: /collapse folders panel/i }));
    expect(screen.queryByRole("region", { name: /monitored music folders/i })).not.toBeInTheDocument();
  });

  it("opens add folder modal and imports preset demo collection into library (AC-3)", () => {
    render(<Library />);

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /expand folders panel/i }));

    // Open Add Folder modal
    const addFolderButton = screen.getByRole("button", { name: /add music folder/i });
    fireEvent.click(addFolderButton);

    expect(screen.getByRole("dialog", { name: /add music folder/i })).toBeInTheDocument();
    expect(screen.getByText("Rock Classics")).toBeInTheDocument();

    // Click Add on Rock Classics preset
    const addPresetButton = screen.getByRole("button", { name: /add preset folder rock classics/i });
    fireEvent.click(addPresetButton);

    // Modal closes and folder is added
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Rock Classics")).toBeInTheDocument();
    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    expect(screen.getByText(/12 tracks/i)).toBeInTheDocument(); // 9 + 3 = 12 tracks
  });

  it("simulates folder rescan with spinning loader and updates timestamp (AC-4)", () => {
    render(<Library />);

    fireEvent.click(screen.getByRole("button", { name: /expand folders panel/i }));

    const rescanButton = screen.getByRole("button", { name: /rescan folder afrobeats grooves/i });
    fireEvent.click(rescanButton);

    // Shows scanning state
    expect(screen.getByText("Scanning...")).toBeInTheDocument();

    // Advance 1s timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Finished scanning, updated timestamp
    expect(screen.queryByText("Scanning...")).not.toBeInTheDocument();
    expect(screen.getAllByText("Just now").length).toBeGreaterThan(0);
  });

  it("removes folder with track purging confirmation (AC-5)", () => {
    render(<Library />);

    fireEvent.click(screen.getByRole("button", { name: /expand folders panel/i }));

    const removeButton = screen.getByRole("button", { name: /remove folder afrobeats grooves/i });
    fireEvent.click(removeButton);

    // Confirmation dialog open
    expect(screen.getByRole("dialog", { name: /remove monitored folder/i })).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: /confirm folder removal/i });
    fireEvent.click(confirmButton);

    // Folder removed and tracks purged
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Afrobeats Grooves")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Last")).not.toBeInTheDocument();
    expect(screen.getByText(/5 tracks/i)).toBeInTheDocument(); // 9 - 4 = 5
  });

  it("filters songs table when a folder card is clicked, and clears filter (AC-6)", () => {
    render(<Library />);

    fireEvent.click(screen.getByRole("button", { name: /expand folders panel/i }));

    const afrobeatsCard = screen.getByRole("button", {
      name: /select folder afrobeats grooves/i,
    });
    fireEvent.click(afrobeatsCard);

    // Filter chip is shown
    expect(screen.getByText(/showing filtered folder/i)).toBeInTheDocument();
    expect(screen.getByText("Last Last")).toBeInTheDocument();
    expect(screen.queryByText("Midnight City")).not.toBeInTheDocument(); // Midnight Chill track hidden

    // Clear filter
    const clearButton = screen.getByRole("button", { name: /clear filter for folder afrobeats grooves/i });
    fireEvent.click(clearButton);

    expect(screen.getByText("Last Last")).toBeInTheDocument();
    expect(screen.getByText("Midnight City")).toBeInTheDocument();
  });

  it("sorts songs table columns ascending and descending (AC-7)", () => {
    render(<Library />);

    const artistHeader = screen.getByRole("columnheader", { name: /artist/i });
    fireEvent.click(artistHeader);

    // After clicking artist header, first row should be Adele or Aiden Vale
    const rows = screen.getAllByRole("row");
    // Row 0 is the table header row, Row 1 is the first song
    expect(rows[1]).toHaveTextContent(/aiden vale/i);

    // Click again for descending sort
    fireEvent.click(artistHeader);
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1]).toHaveTextContent(/wizkid/i);
  });

  it("filters songs in real time using library search filter input (AC-8)", () => {
    render(<Library />);

    const searchInput = screen.getByLabelText(/filter songs in library/i);
    fireEvent.change(searchInput, { target: { value: "Burna" } });

    expect(screen.getByText("Last Last")).toBeInTheDocument();
    expect(screen.queryByText("Perfect")).not.toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 9 songs/i)).toBeInTheDocument();
  });

  it("queues and begins playback on Play All or Shuffle click (AC-9)", () => {
    render(<Library />);

    const playAllButton = screen.getByRole("button", { name: /play all songs/i });
    fireEvent.click(playAllButton);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.queue.length).toBe(9);
    expect(playerState.currentTrack?.title).toBe("Better With You"); // Alphabetical first track
  });

  it("plays track on row play button click or double click (AC-10)", () => {
    render(<Library />);

    const firstPlayButton = screen.getByRole("button", { name: /play better with you/i });
    fireEvent.click(firstPlayButton);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.title).toBe("Better With You");
  });

  it("renders empty library welcoming state when all folders are removed (AC-11)", () => {
    act(() => {
      useLibraryStore.setState({
        folders: [],
        tracks: [],
      });
    });

    render(<Library />);

    expect(screen.getByRole("region", { name: /empty library state/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /build your local music collection/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add your first music folder/i })).toBeInTheDocument();
  });
});
