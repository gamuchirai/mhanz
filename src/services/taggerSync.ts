/**
 * Reactive coordinator for library track and album metadata changes.
 * Broadcasts updates across stores (useLibraryStore, useAlbumStore, usePlayerStore, useSearchStore)
 * when audio tags are edited or when native Tauri events arrive.
 */

import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LibraryTracksUpdatedEvent } from "../types/tagger";
import type { TrackDto } from "../types/database";

export type TracksUpdatedCallback = (
  event: LibraryTracksUpdatedEvent,
  updatedTracks?: TrackDto[],
) => void;

export class TaggerSyncCoordinator {
  private listeners: Set<TracksUpdatedCallback> = new Set();
  private unlistenTauri: UnlistenFn | null = null;

  constructor() {
    if (isTauri()) {
      listen<LibraryTracksUpdatedEvent>("library:tracks-updated", (event) => {
        this.broadcast(event.payload);
      })
        .then((unlisten) => {
          this.unlistenTauri = unlisten;
        })
        .catch((err) => {
          console.warn("Failed to listen for library:tracks-updated event:", err);
        });
    }
  }

  /**
   * Subscribes a store or component to tag and metadata updates.
   */
  subscribe(callback: TracksUpdatedCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Broadcasts track and album updates to all registered listeners.
   */
  broadcast(event: LibraryTracksUpdatedEvent, updatedTracks?: TrackDto[]): void {
    for (const listener of this.listeners) {
      try {
        listener(event, updatedTracks);
      } catch (err) {
        console.error("Error in taggerSync listener:", err);
      }
    }
  }

  /**
   * Cleans up native event listeners and subscribers.
   */
  cleanup(): void {
    if (this.unlistenTauri) {
      this.unlistenTauri();
      this.unlistenTauri = null;
    }
    this.listeners.clear();
  }
}

export const taggerSync = new TaggerSyncCoordinator();

