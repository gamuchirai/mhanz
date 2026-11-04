import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { TagEditorModal, BatchTagEditorModal, TrackRowMenuButton } from "../components/tagger";
import { AlbumDetailBanner } from "../components/albums/AlbumDetailBanner";
import { useTagEditorStore } from "../store/useTagEditorStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useArtistStore } from "../store/useArtistStore";
import { ArtistPopularTrackRow } from "../components/artists/ArtistPopularTrackRow";
import { AlbumTrackRow } from "../components/albums/AlbumTrackRow";
import { TrackTable } from "../components/home/TrackTable";
import { taggerSync } from "../services/taggerSync";
import type { TrackDto } from "../types/database";
import type { Album } from "../types/album";
import type { ProbedAudioTagsDto } from "../types/tagger";
import * as taggerService from "../services/tagger";

describe("Audio Metadata Tag Editor Frontend (Feature 25)", () => {
  beforeEach(() => {
    act(() => {
      useTagEditorStore.getState().closeTrackEditor();
      useTagEditorStore.getState().closeBatchEditor();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("ignores an older probe response after another track becomes active (AC-1)", async () => {
    let resolveOldProbe: (tags: ProbedAudioTagsDto) => void = () => {};
    let resolveCurrentProbe: (tags: ProbedAudioTagsDto) => void = () => {};
    const oldProbe = new Promise<ProbedAudioTagsDto>((resolve) => {
      resolveOldProbe = resolve;
    });
    const currentProbe = new Promise<ProbedAudioTagsDto>((resolve) => {
      resolveCurrentProbe = resolve;
    });
    const probeSpy = vi
      .spyOn(taggerService, "tagEditorProbeFile")
      .mockImplementation((trackId) => (trackId === "trk-old" ? oldProbe : currentProbe));

    const oldOpen = useTagEditorStore.getState().openTrackEditor("trk-old");
    const currentOpen = useTagEditorStore.getState().openTrackEditor("trk-current");

    resolveOldProbe({
      trackId: "trk-old",
      filePath: "C:\\Music\\old.mp3",
      title: "Old Track",
      artist: "Old Artist",
      album: "Old Album",
      albumArtist: null,
      genre: null,
      year: null,
      trackNumber: null,
      discNumber: 1,
      duration: 180,
      bitrate: null,
      format: "mp3",
      hasEmbeddedCover: false,
      coverArtPath: null,
    });
    await oldOpen;

    expect(useTagEditorStore.getState().trackId).toBe("trk-current");
    expect(useTagEditorStore.getState().tags).toBeNull();
    expect(useTagEditorStore.getState().isLoading).toBe(true);

    resolveCurrentProbe({
      trackId: "trk-current",
      filePath: "C:\\Music\\current.mp3",
      title: "Current Track",
      artist: "Current Artist",
      album: "Current Album",
      albumArtist: null,
      genre: null,
      year: null,
      trackNumber: null,
      discNumber: 1,
      duration: 200,
      bitrate: null,
      format: "mp3",
      hasEmbeddedCover: false,
      coverArtPath: null,
    });
    await currentOpen;

    expect(useTagEditorStore.getState().tags?.trackId).toBe("trk-current");
    expect(useTagEditorStore.getState().isLoading).toBe(false);
    probeSpy.mockRestore();
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

    render(<TrackRowMenuButton trackId="trk-99" filePath={testPath} trackTitle="Track 99" />);

    const triggerBtn = screen.getByRole("button", { name: /more options for track 99/i });
    fireEvent.click(triggerBtn);

    const editItem = screen.getByRole("menuitem", { name: /edit metadata/i });
    expect(editItem).toBeDefined();

    fireEvent.click(editItem);
    expect(openSpy).toHaveBeenCalledWith("trk-99", testPath);
  });
  it("synchronizes audio tag edits across library and player stores (AC-11)", async () => {
    const mockTrackDto: TrackDto = {
      id: "trk-sync-1",
      file_path: "C:\\Music\\SyncTrack.mp3",
      title: "Synchronized Track Title",
      artist_id: "art-sync-1",
      artist_name: "Synchronized Artist",
      album_id: "alb-sync-1",
      album_name: "Synchronized Album",
      album_artist: "Synchronized Artist",
      duration: 240,
      year: 2025,
      genre: "Ambient",
      disc_number: 1,
      track_number: 1,
      bitrate: 320,
      format: "mp3",
      cover_art_path: "covers/synced.jpg",
      is_favorite: true,
      liked_at: 1000,
      play_count: 5,
      last_played_at: null,
      file_modified_at: 2000,
      file_size_bytes: 5000000,
      folder_id: "f-1",
      created_at: 1000,
      updated_at: 2000,
    };

    act(() => {
      useLibraryStore.setState({
        tracks: [
          {
            id: "trk-sync-1",
            title: "Old Track Title",
            artist: "Old Artist",
            album: "Old Album",
            durationSeconds: 240,
            artworkUrl: "",
            playsCount: 5,
            isLiked: true,
            filePath: "C:\\Music\\SyncTrack.mp3",
            folderId: "f-1",
            dateAdded: "2025-01-01",
          },
        ],
      });

      usePlayerStore.setState({
        currentTrack: {
          id: "trk-sync-1",
          title: "Old Track Title",
          artist: "Old Artist",
          album: "Old Album",
          durationSeconds: 240,
          artworkUrl: "",
          playsCount: 5,
          isLiked: true,
        },
        queue: [],
        queueItems: [],
      });
    });

    act(() => {
      taggerSync.broadcast({ trackIds: ["trk-sync-1"], albumIds: ["alb-sync-1"] }, [mockTrackDto]);
    });

    const libTrack = useLibraryStore.getState().tracks.find((t) => t.id === "trk-sync-1");
    expect(libTrack?.title).toBe("Synchronized Track Title");
    expect(libTrack?.artist).toBe("Synchronized Artist");

    const playerTrack = usePlayerStore.getState().currentTrack;
    expect(playerTrack?.title).toBe("Synchronized Track Title");
    expect(playerTrack?.artist).toBe("Synchronized Artist");
  });
  it("ArtistPopularTrackRow displays Edit Song Info instead of Copy Song Info and triggers single track editor", async () => {
    const openSpy = vi.spyOn(useTagEditorStore.getState(), "openTrackEditor");
    const mockTrack = {
      id: "amina-pop-1",
      artistId: "artist-amina-v",
      artistName: "Amina V",
      title: "Solitary Horizon",
      albumId: "album-1",
      albumTitle: "Timeless Vibrations",
      coverUrl: "https://example.com/cover.jpg",
      playCount: 12000,
      duration: 214,
      isLiked: true,
      audioUrl: "/audio/sample-1.mp3",
    };

    render(
      <div>
        <TagEditorModal />
        <ArtistPopularTrackRow track={mockTrack} rank={1} onPlay={() => {}} />
      </div>
    );

    const moreBtn = screen.getByRole("button", { name: /more options for solitary horizon/i });
    fireEvent.click(moreBtn);

    // Assert "Copy Song Info" is NOT present
    expect(screen.queryByText(/copy song info/i)).toBeNull();

    // Assert "Edit Song Info" is present
    const editItem = screen.getByRole("menuitem", { name: /edit song info/i });
    expect(editItem).toBeDefined();

    await act(async () => {
      fireEvent.click(editItem);
    });

    expect(openSpy).toHaveBeenCalledWith("amina-pop-1", "/audio/sample-1.mp3");
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(screen.getByText("Edit Audio Metadata")).toBeDefined();
  });

  it("AlbumTrackRow displays 3 dots menu with Edit Song Info and triggers single track editor", async () => {
    const openSpy = vi.spyOn(useTagEditorStore.getState(), "openTrackEditor");
    const mockAlbumTrack = {
      id: "alb-trk-1",
      title: "Desert Mirage",
      artist: "Dune Walker",
      album: "Sands of Time",
      albumId: "album-desert",
      discNumber: 1,
      trackNumber: 1,
      duration: 180,
      audioUrl: "/audio/desert.mp3",
    };

    render(
      <AlbumTrackRow track={mockAlbumTrack} albumArtistName="Dune Walker" onPlay={() => {}} />
    );

    const moreBtn = screen.getByRole("button", { name: /more options for desert mirage/i });
    fireEvent.click(moreBtn);

    const editItem = screen.getByRole("menuitem", { name: /edit song info/i });
    expect(editItem).toBeDefined();

    fireEvent.click(editItem);
    expect(openSpy).toHaveBeenCalledWith("alb-trk-1", "/audio/desert.mp3");
  });

  it("TrackTable displays 3 dots menu with Edit Song Info and triggers single track editor", async () => {
    const openSpy = vi.spyOn(useTagEditorStore.getState(), "openTrackEditor");
    const mockTrack = {
      id: "home-trk-1",
      title: "Sunset Boulevard",
      artist: "Neon Skyline",
      album: "City Lights",
      durationSeconds: 210,
      artworkUrl: "/covers/city.jpg",
      playsCount: 4200,
      isLiked: false,
      filePath: "C:\\Music\\Sunset.mp3",
    };

    render(<TrackTable tracks={[mockTrack]} />);

    const moreBtn = screen.getByRole("button", { name: /more options for sunset boulevard/i });
    fireEvent.click(moreBtn);

    const editItem = screen.getByRole("menuitem", { name: /edit song info/i });
    expect(editItem).toBeDefined();

    fireEvent.click(editItem);
    expect(openSpy).toHaveBeenCalledWith("home-trk-1", "C:\\Music\\Sunset.mp3");
  });

  it("synchronizes audio tag edits to useArtistStore and usePlayerStore popular tracks", () => {
    const mockTrackDto: TrackDto = {
      id: "trk-pop-edit-1",
      file_path: "C:\\Music\\PopEdit.mp3",
      title: "Updated Popular Track Title",
      artist_id: "art-1",
      artist_name: "Updated Popular Artist",
      album_id: "alb-1",
      album_name: "Updated Album",
      album_artist: "Updated Popular Artist",
      duration: 200,
      year: 2026,
      genre: "Synthwave",
      disc_number: 1,
      track_number: 1,
      bitrate: 320,
      format: "mp3",
      cover_art_path: "covers/pop.jpg",
      is_favorite: true,
      liked_at: 1000,
      play_count: 50,
      last_played_at: null,
      file_modified_at: 2000,
      file_size_bytes: 4000000,
      folder_id: "f-1",
      created_at: 1000,
      updated_at: 2000,
    };

    act(() => {
      useArtistStore.setState({
        artistPopularTracks: {
          "art-1": [
            {
              id: "trk-pop-edit-1",
              artistId: "art-1",
              artistName: "Old Artist",
              title: "Old Popular Track",
              albumId: "alb-1",
              albumTitle: "Old Album",
              coverUrl: "",
              playCount: 50,
              duration: 200,
            },
          ],
        },
      });

      usePlayerStore.setState({
        popularTracks: [
          {
            id: "trk-pop-edit-1",
            title: "Old Popular Track",
            artist: "Old Artist",
            album: "Old Album",
            durationSeconds: 200,
            artworkUrl: "",
            playsCount: 50,
            isLiked: false,
          },
        ],
      });
    });

    act(() => {
      taggerSync.broadcast({ trackIds: ["trk-pop-edit-1"], albumIds: ["alb-1"] }, [mockTrackDto]);
    });

    const artistTrack = useArtistStore.getState().artistPopularTracks["art-1"]?.[0];
    expect(artistTrack?.title).toBe("Updated Popular Track Title");
    expect(artistTrack?.artistName).toBe("Updated Popular Artist");

    const playerPopular = usePlayerStore.getState().popularTracks[0];
    expect(playerPopular?.title).toBe("Updated Popular Track Title");
    expect(playerPopular?.artist).toBe("Updated Popular Artist");
  });
});