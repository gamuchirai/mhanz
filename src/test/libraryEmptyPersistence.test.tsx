import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import { Library } from "../pages/Library";
import { useLibraryStore } from "../store/useLibraryStore";
import { initialMusicFolders, initialLibraryTracks } from "../data/libraryFixtures";
import type { FolderDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Empty Library and Folder Removal Persistence (Finding P4-F5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

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
        isInitialized: false,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears demo fixtures and displays empty state when opening an empty desktop library", async () => {
    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "db_get_folders") {
        return [];
      }
      if (cmd === "db_get_tracks") {
        return { items: [], total: 0, offset: 0, limit: 500 };
      }
      return null;
    });

    render(<Library />);

    await act(async () => {
      await useLibraryStore.getState().refreshFromDatabase();
    });

    const storeState = useLibraryStore.getState();
    expect(storeState.folders).toHaveLength(0);
    expect(storeState.tracks).toHaveLength(0);

    expect(screen.getByRole("region", { name: /empty library state/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /build your local music collection/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Afrobeats Grooves")).not.toBeInTheDocument();
    expect(screen.queryByText("Midnight Chill")).not.toBeInTheDocument();
  });

  it("removes the last folder and clears tracks when removing folder in desktop mode", async () => {
    const activeFolder: FolderDto = {
      id: "folder-1",
      path: "C:/Music/MyFolder",
      added_at: 1000,
      last_scanned_at: null,
      is_active: true,
    };

    let foldersInDb = [activeFolder];

    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "db_get_folders") {
        return foldersInDb;
      }
      if (cmd === "db_get_tracks") {
        if (foldersInDb.length === 0) {
          return { items: [], total: 0, offset: 0, limit: 500 };
        }
        return {
          items: [
            {
              id: "track-1",
              file_path: "C:/Music/MyFolder/song1.mp3",
              title: "My Song",
              artist_name: "Artist",
              album_name: "Album",
              duration: 180,
              format: "mp3",
              folder_id: "folder-1",
              is_favorite: 0,
              play_count: 0,
              file_modified_at: 1000,
              file_size_bytes: 5000000,
              created_at: 1000,
              updated_at: 1000,
            },
          ],
          total: 1,
          offset: 0,
          limit: 500,
        };
      }
      if (cmd === "db_remove_folder") {
        const id = (args as { id: string })?.id;
        foldersInDb = foldersInDb.filter((f) => f.id !== id);
        return true;
      }
      return null;
    });

    // Initial hydration with 1 folder
    await act(async () => {
      await useLibraryStore.getState().refreshFromDatabase();
    });

    expect(useLibraryStore.getState().folders).toHaveLength(1);
    expect(useLibraryStore.getState().tracks).toHaveLength(1);

    // Remove the only folder
    act(() => {
      useLibraryStore.getState().openRemoveFolderDialog(useLibraryStore.getState().folders[0]);
    });

    await act(async () => {
      await useLibraryStore.getState().confirmRemoveFolder(true);
    });

    const storeState = useLibraryStore.getState();
    expect(storeState.folders).toHaveLength(0);
    expect(storeState.tracks).toHaveLength(0);
  });
});

