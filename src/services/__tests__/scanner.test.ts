import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke, isTauri, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  formatCoverArtUrl,
  onScanCompleted,
  onScanProgress,
  scannerCancelScan,
  scannerGetScanStatus,
  scannerScanFolder,
} from "../scanner";
import {
  mapFolderDtoToMusicFolder,
  mapTrackDtoToLibraryTrack,
  useLibraryStore,
} from "../../store/useLibraryStore";
import type { FolderDto, TrackDto } from "../../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("Scanner Service (src/services/scanner.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tauri IPC Invocation Mode", () => {
    beforeEach(() => {
      vi.mocked(isTauri).mockReturnValue(true);
    });

    it("scannerScanFolder invokes scanner_scan_folder with folderId", async () => {
      const mockResult = {
        folderId: "folder-123",
        status: "started" as const,
        startedAt: 1700000000,
      };
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await scannerScanFolder("folder-123");
      expect(invoke).toHaveBeenCalledWith("scanner_scan_folder", { folderId: "folder-123" });
      expect(result).toEqual(mockResult);
    });

    it("scannerCancelScan invokes scanner_cancel_scan", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(true);

      const result = await scannerCancelScan("folder-123");
      expect(invoke).toHaveBeenCalledWith("scanner_cancel_scan", { folderId: "folder-123" });
      expect(result).toBe(true);
    });

    it("scannerGetScanStatus queries scanner_get_scan_status", async () => {
      const mockStatus = {
        isScanning: true,
        activeFolderId: "folder-123",
        phase: "parsing" as const,
        scannedFiles: 45,
        totalFiles: 100,
        currentFile: "/music/song.mp3",
        startedAt: 1700000000,
      };
      vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

      const status = await scannerGetScanStatus();
      expect(invoke).toHaveBeenCalledWith("scanner_get_scan_status");
      expect(status).toEqual(mockStatus);
    });

    it("subscribes to scan progress and completion events via Tauri listen", async () => {
      const unlistenProgressMock = vi.fn();
      const unlistenCompletedMock = vi.fn();

      vi.mocked(listen).mockImplementation(async (event: string) => {
        if (event === "library://scan-progress") {
          return unlistenProgressMock;
        }
        return unlistenCompletedMock;
      });

      const progressCb = vi.fn();
      const completedCb = vi.fn();

      const unlisten1 = await onScanProgress(progressCb);
      const unlisten2 = await onScanCompleted(completedCb);

      expect(listen).toHaveBeenCalledWith("library://scan-progress", expect.any(Function));
      expect(listen).toHaveBeenCalledWith("library://scan-completed", expect.any(Function));
      expect(unlisten1).toBe(unlistenProgressMock);
      expect(unlisten2).toBe(unlistenCompletedMock);
    });

    it("formatCoverArtUrl converts local paths via convertFileSrc", () => {
      const localPath = "C:/Users/Cache/covers/abcdef123456.jpg";
      const url = formatCoverArtUrl(localPath);
      expect(convertFileSrc).toHaveBeenCalledWith(localPath);
      expect(url).toContain("asset://localhost");

      // Remote and empty paths
      expect(formatCoverArtUrl("https://example.com/art.jpg")).toBe("https://example.com/art.jpg");
      expect(formatCoverArtUrl("")).toBe("");
      expect(formatCoverArtUrl(null)).toBe("");
    });
  });

  describe("Browser / Mock Fallback Mode", () => {
    beforeEach(() => {
      vi.mocked(isTauri).mockReturnValue(false);
    });

    it("simulates background scan start, progress, and completion in browser", async () => {
      const progressCb = vi.fn();
      const completedCb = vi.fn();

      await onScanProgress(progressCb);
      await onScanCompleted(completedCb);

      const startRes = await scannerScanFolder("mock-folder");
      expect(startRes.folderId).toBe("mock-folder");
      expect(startRes.status).toBe("started");

      // A second concurrent scan should reject with SCANNER_BUSY
      await expect(scannerScanFolder("mock-folder-2")).rejects.toThrow("SCANNER_BUSY");

      // Cancel scan cancels running mock
      const cancelRes = await scannerCancelScan();
      expect(cancelRes).toBe(true);
    });
  });

  describe("DTO Presentation Mappings", () => {
    it("mapTrackDtoToLibraryTrack maps backend TrackDto to frontend LibraryTrack", () => {
      const dto: TrackDto = {
        id: "track-1",
        file_path: "C:/Music/song.mp3",
        title: "Test Song",
        artist_id: "art-1",
        artist_name: "Test Artist",
        album_id: "alb-1",
        album_name: "Test Album",
        album_artist: null,
        duration: 215.7,
        year: 2024,
        genre: "Pop",
        disc_number: 1,
        track_number: 3,
        bitrate: 320,
        format: "mp3",
        cover_art_path: "C:/Cache/art.jpg",
        is_favorite: true,
        play_count: 12,
        last_played_at: 1700000000,
        file_modified_at: 1700000000,
        file_size_bytes: 8400000,
        folder_id: "fold-1",
        created_at: 1700000000,
        updated_at: 1700000000,
      };

      const track = mapTrackDtoToLibraryTrack(dto);
      expect(track.id).toBe("track-1");
      expect(track.title).toBe("Test Song");
      expect(track.artist).toBe("Test Artist");
      expect(track.album).toBe("Test Album");
      expect(track.durationSeconds).toBe(216);
      expect(track.isLiked).toBe(true);
      expect(track.playsCount).toBe(12);
      expect(track.filePath).toBe("C:/Music/song.mp3");
      expect(track.folderId).toBe("fold-1");
      expect(track.genre).toBe("Pop");
      expect(track.bitrate).toBe(320);
      expect(track.fileSizeBytes).toBe(8400000);
    });

    it("mapFolderDtoToMusicFolder maps backend FolderDto to frontend MusicFolder", () => {
      const dto: FolderDto = {
        id: "f-1",
        path: "D:/Music/Rock",
        added_at: 1700000000,
        last_scanned_at: 1700000000,
        is_active: true,
      };

      const folder = mapFolderDtoToMusicFolder(dto, 25, 120000000);
      expect(folder.id).toBe("f-1");
      expect(folder.folderPath).toBe("D:/Music/Rock");
      expect(folder.displayName).toBe("Rock");
      expect(folder.trackCount).toBe(25);
      expect(folder.totalSizeBytes).toBe(120000000);
      expect(folder.isScanning).toBe(false);
    });
  });

  describe("Store Scanner Actions Integration", () => {
    it("rescanFolder and cancelScan update folder scanning status", async () => {
      vi.mocked(isTauri).mockReturnValue(true);
      vi.mocked(invoke).mockResolvedValue(true);

      const store = useLibraryStore.getState();
      const testFolder = {
        id: "test-f1",
        folderPath: "/music/test",
        displayName: "Test",
        trackCount: 5,
        totalSizeBytes: 10000,
        lastScanned: "Never",
      };

      useLibraryStore.setState({
        folders: [testFolder],
      });

      await store.rescanFolder("test-f1");
      expect(useLibraryStore.getState().folders[0].isScanning).toBe(true);

      await store.cancelScan("test-f1");
      expect(useLibraryStore.getState().folders[0].isScanning).toBe(false);
    });
  });
});
