import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import * as dbService from "../services/db";
import { Search } from "../pages/Search";
import { useSearchStore } from "../store/useSearchStore";
import type { SearchResultsDto } from "../types/database";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
  convertFileSrc: (filePath: string) => `asset://localhost${filePath}`,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

describe("Native Search SQLite Persistence and Error Fallback (Finding P4-F3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    act(() => {
      useSearchStore.setState({
        query: "",
        activeCategory: "all",
        recentSearches: ["Chillwave"],
        isSearching: false,
        error: null,
        results: {
          query: "",
          tracks: [],
          albums: [],
          artists: [],
          playlists: [],
          genres: [],
          totalMatches: 0,
        },
      });
    });
  });

  it("does not show demo fixture results and sets error when SQLite search fails in desktop mode", async () => {
    vi.spyOn(dbService, "dbSearchLibrary").mockRejectedValueOnce(
      new Error("SQLite search error: database disk image is malformed")
    );

    render(<Search />);

    await act(async () => {
      useSearchStore.getState().setQuery("Midnight", true);
    });

    const state = useSearchStore.getState();

    // Must NOT contain demo fixture results
    expect(state.results.tracks).toHaveLength(0);
    expect(state.results.albums).toHaveLength(0);
    expect(state.results.artists).toHaveLength(0);
    expect(state.results.totalMatches).toBe(0);

    // Must record error
    expect(state.error).toBe("SQLite search error: database disk image is malformed");
    expect(state.isSearching).toBe(false);

    // Failed query must not be added to recent searches
    expect(state.recentSearches).not.toContain("Midnight");

    // UI must show search failure state rather than demo results
    expect(screen.getByText("Search failed")).toBeInTheDocument();
    expect(screen.getByText(/database disk image is malformed/i)).toBeInTheDocument();
    expect(screen.queryByText("Top Results")).not.toBeInTheDocument();
  });

  it("does not fall back to demo fixtures and sets error when selectGenre SQLite search fails in desktop mode", async () => {
    vi.spyOn(dbService, "dbSearchLibrary").mockRejectedValueOnce(
      new Error("Database connection dropped during genre search")
    );

    render(<Search />);

    await act(async () => {
      useSearchStore.getState().selectGenre({
        id: "g-indie-pop",
        name: "Indie Pop",
        slug: "indie-pop",
        colorGradient: "linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)",
        accentColor: "#FF6B6B",
        icon: "#spark",
        trackCount: 4,
      });
    });

    const state = useSearchStore.getState();

    // Must NOT contain demo fixture results
    expect(state.results.tracks).toHaveLength(0);
    expect(state.results.albums).toHaveLength(0);
    expect(state.results.artists).toHaveLength(0);
    expect(state.results.genres).toHaveLength(0);
    expect(state.results.totalMatches).toBe(0);

    // Must record error
    expect(state.error).toBe("Database connection dropped during genre search");
    expect(state.isSearching).toBe(false);

    // UI must show search failure state rather than demo results
    expect(screen.getByText("Search failed")).toBeInTheDocument();
    expect(screen.queryByText("Top Results")).not.toBeInTheDocument();
  });

  it("populates search results from SQLite and updates recent searches when dbSearchLibrary succeeds in desktop mode", async () => {
    const mockDto: SearchResultsDto = {
      query: "Chirambamuriwo",
      tracks: [
        {
          id: "trk-1",
          file_path: "/music/chiramba.mp3",
          title: "Chirambamuriwo",
          artist_id: "art-1",
          artist_name: "Oliver Mtukudzi",
          album_id: "alb-1",
          album_name: "Tuku Music",
          album_artist: "Oliver Mtukudzi",
          duration: 320,
          year: 1999,
          genre: "Afro-Jazz",
          disc_number: 1,
          track_number: 1,
          bitrate: 320,
          format: "mp3",
          cover_art_path: null,
          is_favorite: false,
          liked_at: null,
          play_count: 5,
          last_played_at: null,
          file_modified_at: 1700000000,
          file_size_bytes: 1048576,
          folder_id: null,
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      ],
      albums: [],
      artists: [],
      playlists: [],
      genres: [],
      total_matches: 1,
      execution_time_ms: 12,
    };

    vi.spyOn(dbService, "dbSearchLibrary").mockResolvedValueOnce(mockDto);

    render(<Search />);

    await act(async () => {
      useSearchStore.getState().setQuery("Chirambamuriwo", true);
    });

    const state = useSearchStore.getState();
    expect(state.results.tracks).toHaveLength(1);
    expect(state.results.tracks[0].title).toBe("Chirambamuriwo");
    expect(state.error).toBeNull();
    expect(state.recentSearches[0]).toBe("Chirambamuriwo");
  });

  it("falls back to local fixtures in browser environment when isTauri is false", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);

    render(<Search />);

    await act(async () => {
      useSearchStore.getState().setQuery("Vale", true);
    });

    const state = useSearchStore.getState();
    expect(state.results.tracks.length).toBeGreaterThan(0);
    expect(state.results.tracks.some((t) => t.artist === "Aiden Vale")).toBe(true);
    expect(state.error).toBeNull();
  });
});