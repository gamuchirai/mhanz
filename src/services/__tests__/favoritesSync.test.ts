import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesSyncCoordinator } from "../favoritesSync";
import * as dbModule from "../db";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
}));

vi.mock("../db", () => ({
  dbToggleTrackFavorite: vi.fn(),
}));

describe("Favorites Synchronization Coordinator (src/services/favoritesSync.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes and receives broadcast events", () => {
    const coordinator = new FavoritesSyncCoordinator();
    const mockListener = vi.fn();

    const unsubscribe = coordinator.subscribe(mockListener);

    coordinator.broadcast("trk-100", true, 1700000000);
    expect(mockListener).toHaveBeenCalledWith("trk-100", true, 1700000000);

    unsubscribe();
    coordinator.broadcast("trk-100", false, null);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it("performs optimistic update and persists via dbToggleTrackFavorite", async () => {
    const coordinator = new FavoritesSyncCoordinator();
    const events: Array<{ trackId: string; isFavorite: boolean }> = [];

    coordinator.subscribe((trackId, isFavorite) => {
      events.push({ trackId, isFavorite });
    });

    vi.mocked(dbModule.dbToggleTrackFavorite).mockResolvedValueOnce(true);

    const result = await coordinator.toggleFavorite("trk-1", false);
    expect(result).toBe(true);
    expect(dbModule.dbToggleTrackFavorite).toHaveBeenCalledWith("trk-1");

    // Optimistic broadcast should have been dispatched immediately
    expect(events).toEqual([{ trackId: "trk-1", isFavorite: true }]);
  });

  it("serializes rapid consecutive toggles for the same track identifier", async () => {
    const coordinator = new FavoritesSyncCoordinator();
    const events: Array<{ trackId: string; isFavorite: boolean }> = [];

    coordinator.subscribe((trackId, isFavorite) => {
      events.push({ trackId, isFavorite });
    });

    // Mock first call resolving true, second resolving false
    let resolveFirst: (val: boolean) => void = () => {};
    const firstPromise = new Promise<boolean>((res) => {
      resolveFirst = res;
    });

    vi.mocked(dbModule.dbToggleTrackFavorite)
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(false);

    // Trigger first toggle (false -> true)
    const toggle1 = coordinator.toggleFavorite("trk-1", false);
    expect(coordinator.isInFlight("trk-1")).toBe(true);

    // Trigger second toggle immediately (true -> false)
    const toggle2 = coordinator.toggleFavorite("trk-1", true);

    // Both optimistic events should be fired
    expect(events).toEqual([
      { trackId: "trk-1", isFavorite: true },
      { trackId: "trk-1", isFavorite: false },
    ]);

    // Resolve first IPC
    resolveFirst(true);
    await toggle1;

    // Await second IPC
    const res2 = await toggle2;
    expect(res2).toBe(false);

    expect(dbModule.dbToggleTrackFavorite).toHaveBeenCalledTimes(2);
    expect(coordinator.isInFlight("trk-1")).toBe(false);
  });

  it("rolls back optimistic state and invokes rollback callback on database write error", async () => {
    const coordinator = new FavoritesSyncCoordinator();
    const events: Array<{ trackId: string; isFavorite: boolean }> = [];
    const rollbackSpy = vi.fn();

    coordinator.subscribe((trackId, isFavorite) => {
      events.push({ trackId, isFavorite });
    });

    vi.mocked(dbModule.dbToggleTrackFavorite).mockRejectedValueOnce(
      new Error("Database disk I/O failure")
    );

    await expect(coordinator.toggleFavorite("trk-1", false, rollbackSpy)).rejects.toThrow(
      "Database disk I/O failure"
    );

    // First optimistic (true), followed by rollback event (false)
    expect(events).toEqual([
      { trackId: "trk-1", isFavorite: true },
      { trackId: "trk-1", isFavorite: false },
    ]);

    expect(rollbackSpy).toHaveBeenCalledWith(false, expect.any(Error));
  });
});
