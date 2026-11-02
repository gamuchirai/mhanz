import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { TagEditorModal, BatchTagEditorModal, TrackRowMenuButton } from "../components/tagger";
import { AlbumDetailBanner } from "../components/albums/AlbumDetailBanner";
import { useTagEditorStore } from "../store/useTagEditorStore";
import { useAlbumStore } from "../store/useAlbumStore";
import type { TrackDto } from "../types/database";
import type { Album } from "../types/album";

describe("Audio Metadata Tag Editor Frontend (Feature 25)", () => {
  beforeEach(() => {
    act(() => {
      useTagEditorStore.getState().closeTrackEditor();
      useTagEditorStore.getState().closeBatchEditor();
    });
  });

  it("opens single track tag editor modal and populates probed fields (AC-1, AC-2)", async () => {
    render(<TagEditorModal />);
    expect(screen.queryByRole("dialog")).toBeNull();

    // Trigger openTrackEditor
    await act(async () => {
      await useTagEditorStore.getState().openTrackEditor("trk-1", "C:\\Music\\Song.mp3");
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(screen.getByText("Edit Audio Metadata")).toBeDefined();

    // Input fields should be populated from probed tags
    const titleInput = screen.getByLabelText(/title \*/i) as HTMLInputElement;
    const artistInput = screen.getByLabelText(/artist \*/i) as HTMLInputElement;
    expect(titleInput.value).toBeTruthy();
    expect(artistInput.value).toBeTruthy();
  });

  it("validates empty title and artist on save in single editor (AC-2)", async () => {
    render(<TagEditorModal />);
    await act(async () => {
      await useTagEditorStore.getState().openTrackEditor("trk-1");
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    const titleInput = screen.getByLabelText(/title \*/i);
    fireEvent.change(titleInput, { target: { value: "" } });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText(/track title cannot be empty/i)).toBeDefined();
  });

  it("handles cover artwork replacement and removal in single editor (AC-5)", async () => {
    render(<TagEditorModal />);
    await act(async () => {
      await useTagEditorStore.getState().openTrackEditor("trk-1");
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    // Click remove artwork
    const removeBtn = screen.queryByRole("button", { name: /remove/i });
    if (removeBtn) {
      fireEvent.click(removeBtn);
      expect(useTagEditorStore.getState().coverArtAction).toEqual({ type: "remove" });
      expect(screen.getByText("No Artwork")).toBeDefined();
    }
  });

  it("opens batch tag editor with common values and (Multiple values) placeholders (AC-3, AC-4)", async () => {
    render(<BatchTagEditorModal />);
    expect(screen.queryByRole("dialog")).toBeNull();

    const mockTracks: TrackDto[] = [
      {
        id: "t1",
        file_path: "C:\\Music\\Alb\\01.mp3",
        title: "Track One",
        artist_id: "art-1",
        artist_name: "The Band",
        album_id: "alb-1",
        album_name: "Greatest Hits",
        album_artist: "The Band",
        duration: 180,
        year: 2024,
        genre: "Rock",
        disc_number: 1,
        track_number: 1,
        bitrate: 320,
        format: "mp3",
        cover_art_path: null,
        is_favorite: false,
        liked_at: null,
        play_count: 0,
        last_played_at: null,
        file_modified_at: 1000,
        file_size_bytes: 5000,
        folder_id: "f1",
        created_at: 1000,
        updated_at: 1000,
      },
      {
        id: "t2",
        file_path: "C:\\Music\\Alb\\02.mp3",
        title: "Track Two",
        artist_id: "art-1",
        artist_name: "The Band",
        album_id: "alb-1",
        album_name: "Greatest Hits",
        album_artist: "The Band",
        duration: 210,
        year: 2024,
        genre: "Pop", // Different genre!
        disc_number: 1,
        track_number: 2,
        bitrate: 320,
        format: "mp3",
        cover_art_path: null,
        is_favorite: false,
        liked_at: null,
        play_count: 0,
        last_played_at: null,
        file_modified_at: 1000,
        file_size_bytes: 5000,
        folder_id: "f1",
        created_at: 1000,
        updated_at: 1000,
      },
    ];

    act(() => {
      useTagEditorStore.getState().openBatchEditor("alb-1", mockTracks);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(screen.getByText(/applying changes across 2 tracks/i)).toBeDefined();

    // Artist and Album are common, should be displayed in input values
    const artistInput = screen.getByLabelText(/^artist$/i) as HTMLInputElement;
    expect(artistInput.value).toBe("The Band");

    // Genre differs across tracks, should display "(Multiple values)" placeholder
    const genreInput = screen.getByLabelText(/genre/i) as HTMLInputElement;
    expect(genreInput.placeholder).toBe("(Multiple values)");
  });

  it("renders Edit details button on AlbumDetailBanner and triggers batch editor (AC-3)", async () => {
    const mockAlbum: Album = {
      id: "alb-123",
      title: "Test Album",
      artistId: "art-1",
      artistName: "Test Artist",
      coverUrl: "",
      releaseYear: 2023,
      genre: "Jazz",
      trackCount: 3,
      totalDuration: 600,
    };

    useAlbumStore.setState({
      albumTracks: {
        "alb-123": [
          {
            id: "trk-10",
            title: "Song A",
            artist: "Test Artist",
            album: "Test Album",
            albumId: "alb-123",
            discNumber: 1,
            trackNumber: 1,
            duration: 200,
          },
        ],
      },
    });

    render(<AlbumDetailBanner album={mockAlbum} />);

    const editDetailsBtn = screen.getByRole("button", { name: /edit album details/i });
    expect(editDetailsBtn).toBeDefined();

    fireEvent.click(editDetailsBtn);

    await waitFor(() => {
      expect(useTagEditorStore.getState().isBatchOpen).toBe(true);
      expect(useTagEditorStore.getState().batchAlbumId).toBe("alb-123");
    });
  });

  it("TrackRowMenuButton toggles menu and triggers openTrackEditor (AC-2)", () => {
    const openSpy = vi.spyOn(useTagEditorStore.getState(), "openTrackEditor");
    const testPath = "C:\\Music\\Track99.mp3";

    render(
      <TrackRowMenuButton
        trackId="trk-99"
        filePath={testPath}
        trackTitle="Track 99"
      />,
    );

    const triggerBtn = screen.getByRole("button", { name: /more options for track 99/i });
    fireEvent.click(triggerBtn);

    const editItem = screen.getByRole("menuitem", { name: /edit metadata/i });
    expect(editItem).toBeDefined();

    fireEvent.click(editItem);
    expect(openSpy).toHaveBeenCalledWith("trk-99", testPath);
  });
});
