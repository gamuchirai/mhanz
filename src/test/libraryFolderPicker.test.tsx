import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { Library } from "../pages/Library";
import { useLibraryStore } from "../store/useLibraryStore";
import { initialMusicFolders, initialLibraryTracks } from "../data/libraryFixtures";
import * as tauriCore from "@tauri-apps/api/core";
import * as dialogPlugin from "@tauri-apps/plugin-dialog";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("Library Native Folder Picker Integration (Finding F-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "db_add_folder") {
        const path = (args as { path: string })?.path || "D:/Music/HiFi Vault";
        return {
          id: "folder-mock-id",
          path,
          added_at: Math.floor(Date.now() / 1000),
          last_scanned_at: null,
          is_active: true,
        };
      }
      if (cmd === "db_get_folders") {
        return [];
      }
      if (cmd === "db_get_tracks") {
        return { items: [], total: 0, offset: 0, limit: 500 };
      }
      if (cmd === "scanner_scan_folder") {
        return { folderId: "folder-mock-id", status: "started", startedAt: Date.now() };
      }
      return null;
    });

    act(() => {
      useLibraryStore.setState({
        folders: [...initialMusicFolders],
        tracks: [...initialLibraryTracks],
        isFolderPanelExpanded: true,
        selectedFolderId: null,
        filterQuery: "",
        sortState: {
          column: "title",
          direction: "asc",
        },
        isAddFolderModalOpen: false,
        folderPendingRemoval: null,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens native directory dialog and imports selected folder in Tauri desktop mode", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(dialogPlugin.open).mockResolvedValue("D:/Music/HiFi Vault");

    render(<Library />);

    // Open Add Folder modal
    const addFolderButton = screen.getByRole("button", { name: /add music folder/i });
    fireEvent.click(addFolderButton);

    const dialog = screen.getByRole("dialog", { name: /add music folder/i });
    expect(dialog).toBeInTheDocument();

    // Click Browse Folder on This PC
    const nativePickerButton = screen.getByTestId("native-folder-picker-button");
    await act(async () => {
      fireEvent.click(nativePickerButton);
    });

    expect(dialogPlugin.open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: "Select Music Folder",
    });

    // Modal closes upon successful selection
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles cancel cleanly when native folder dialog returns null", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(dialogPlugin.open).mockResolvedValue(null);

    render(<Library />);

    const addFolderButton = screen.getByRole("button", { name: /add music folder/i });
    fireEvent.click(addFolderButton);

    const nativePickerButton = screen.getByTestId("native-folder-picker-button");
    await act(async () => {
      fireEvent.click(nativePickerButton);
    });

    expect(dialogPlugin.open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: "Select Music Folder",
    });

    // Modal stays open when user cancelled picker
    expect(screen.getByRole("dialog", { name: /add music folder/i })).toBeInTheDocument();
  });

  it("browses folder path directly into custom input and extracts directory display name", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(dialogPlugin.open).mockResolvedValue("C:/Audio/Soundtracks");

    render(<Library />);

    const addFolderButton = screen.getByRole("button", { name: /add music folder/i });
    fireEvent.click(addFolderButton);

    const browsePathButton = screen.getByRole("button", { name: /browse path from dialog/i });
    await act(async () => {
      fireEvent.click(browsePathButton);
    });

    expect(dialogPlugin.open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: "Select Music Folder",
    });

    const pathInput = screen.getByLabelText(/custom folder path/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/custom folder display name/i) as HTMLInputElement;

    expect(pathInput.value).toBe("C:/Audio/Soundtracks");
    expect(nameInput.value).toBe("Soundtracks");
  });

  it("displays informative notice when clicking native picker in non-Tauri browser preview", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);

    render(<Library />);

    const addFolderButton = screen.getByRole("button", { name: /add music folder/i });
    fireEvent.click(addFolderButton);

    const nativePickerButton = screen.getByTestId("native-folder-picker-button");
    await act(async () => {
      fireEvent.click(nativePickerButton);
    });

    expect(dialogPlugin.open).not.toHaveBeenCalled();

    expect(
      screen.getByText(/native desktop folder picker runs inside the desktop application/i)
    ).toBeInTheDocument();
  });
});
