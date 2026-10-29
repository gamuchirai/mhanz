/**
 * Centralized favorite synchronization coordinator for Mutinhimira.
 *
 * Provides serialized SQLite persistence per track identifier to prevent race conditions,
 * optimistic updates with automatic rollback on error, and reactive event broadcast
 * across all stores (useLikedSongsStore, usePlayerStore, useLibraryStore, useAlbumStore, usePlaylistStore).
 */

import { isTauri } from "@tauri-apps/api/core";
import { dbToggleTrackFavorite } from "./db";

export type FavoriteChangeCallback = (
  trackId: string,
  isFavorite: boolean,
  likedAt: number | null
) => void;

export class FavoritesSyncCoordinator {
  private listeners: Set<FavoriteChangeCallback> = new Set();
  /**
   * Queue of in flight database operations per track identifier.
   * Serializes rapid consecutive clicks on the same track to prevent race conditions.
   */
  private inFlightByTrack: Map<string, Promise<boolean>> = new Map();

  /**
   * Subscribes a store or component to favorite change notifications.
   * Returns an unsubscribe function.
   */
  subscribe(callback: FavoriteChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Broadcasts a favorite change to all registered store subscribers.
   */
  broadcast(trackId: string, isFavorite: boolean, likedAt: number | null): void {
    for (const listener of this.listeners) {
      try {
        listener(trackId, isFavorite, likedAt);
      } catch (err) {
        console.error("Error in favoritesSync listener callback:", err);
      }
    }
  }

  /**
   * Checks whether a database toggle operation is currently in flight for a track.
   */
  isInFlight(trackId: string): boolean {
    return this.inFlightByTrack.has(trackId);
  }

  /**
   * Coordinates toggling track favorite status:
   * 1. Broadcasts optimistic update immediately to all stores.
   * 2. Serializes SQLite IPC invocation behind any existing in flight operation for trackId.
   * 3. Reconciles state when database write completes, or rolls back if an error occurs.
   */
  async toggleFavorite(
    trackId: string,
    currentIsFavorite: boolean,
    onRollback?: (previousIsFav: boolean, error: unknown) => void
  ): Promise<boolean> {
    const nextIsFav = !currentIsFavorite;
    const nextLikedAt = nextIsFav ? Math.floor(Date.now() / 1000) : null;

    // Broadcast optimistic change to all subscribers
    this.broadcast(trackId, nextIsFav, nextLikedAt);

    // Chain in flight promise to serialize rapid clicks per trackId
    const previousPromise = this.inFlightByTrack.get(trackId) ?? Promise.resolve(currentIsFavorite);

    const currentPromise = previousPromise
      .then(async () => {
        if (!isTauri()) {
          return nextIsFav;
        }
        const persistedResult = await dbToggleTrackFavorite(trackId);
        // If persisted result differs from optimistic expectation, broadcast reconciled state
        if (persistedResult !== nextIsFav) {
          const reconciledLikedAt = persistedResult ? Math.floor(Date.now() / 1000) : null;
          this.broadcast(trackId, persistedResult, reconciledLikedAt);
        }
        return persistedResult;
      })
      .catch((err) => {
        // Rollback to previous state on failure
        const rollbackLikedAt = currentIsFavorite ? Math.floor(Date.now() / 1000) : null;
        this.broadcast(trackId, currentIsFavorite, rollbackLikedAt);
        if (onRollback) {
          onRollback(currentIsFavorite, err);
        }
        throw err;
      })
      .finally(() => {
        if (this.inFlightByTrack.get(trackId) === currentPromise) {
          this.inFlightByTrack.delete(trackId);
        }
      });

    this.inFlightByTrack.set(trackId, currentPromise);

    return currentPromise;
  }
}

export const favoritesSync = new FavoritesSyncCoordinator();
