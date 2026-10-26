import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { CuratedCard, PlayHistoryItem, Track } from "../types/discovery";
import type { QueueItem } from "../types/overlays";
import {
  curatedPlaylists,
  initialRecentPlays,
  popularTracksList,
  sampleTracks,
  showcaseItem,
} from "../data/homeFixtures";
import {
  audioPause,
  audioPlayTrack,
  audioResume,
  audioSeek,
  audioSetMuted,
  audioSetVolume,
  audioStop,
  listenAudioPosition,
  listenAudioStateChanged,
  listenAudioTrackEnded,
} from "../services/audio";
import { favoritesSync } from "../services/favoritesSync";

let queueIdCounter = 0;
function createUniqueQueueId(prefix = "queue"): string {
  queueIdCounter += 1;
  return `${prefix}-${Date.now()}-${queueIdCounter}-${Math.random().toString(36).substring(2, 6)}`;
}

function convertTracksToQueueItems(tracks: Track[]): QueueItem[] {
  return tracks.map((t, idx) => ({
    id: createUniqueQueueId(`init-${idx}`),
    trackId: t.id,
    track: t,
    addedAt: Date.now() + idx,
    isManuallyQueued: false,
  }));
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueItems: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  likedTrackIds: Record<string, boolean>;
  recentPlays: PlayHistoryItem[];
  curatedCollections: CuratedCard[];
  popularTracks: Track[];

  playTrack: (track: Track, customQueue?: Track[]) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: (trackId: string) => void;
  playCollection: (tracks: Track[], startIndex?: number) => void;
  clearRecentPlays: () => void;
  loadSampleHistory: () => void;
  tickTimer: () => void;

  // Queue manipulation extensions
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (queueId: string) => void;
  reorderQueue: (sourceIndex: number, destIndex: number) => void;
  reorderUpcomingQueue: (sourceUpcomingIndex: number, destUpcomingIndex: number) => void;
  clearUpcomingQueue: () => void;
  playQueueItem: (queueId: string) => void;
  seekToLyricLine: (timeSeconds: number) => void;

  // Playback context
  playbackContext: {
    type: "playlist" | "album" | "artist" | "liked" | "library" | "unknown";
    id?: string;
    title?: string;
  } | null;
  setPlaybackContext: (
    context: {
      type: "playlist" | "album" | "artist" | "liked" | "library" | "unknown";
      id?: string;
      title?: string;
    } | null
  ) => void;
  clearContextIfMatches: (type: string, id: string) => void;
}

let timerHandle: ReturnType<typeof setInterval> | null = null;

const startPlaybackTimer = (get: () => PlayerState) => {
  if (timerHandle) return;
  timerHandle = setInterval(() => {
    const state = get();
    if (state.isPlaying && state.currentTrack) {
      state.tickTimer();
    }
  }, 1000);
};

const stopPlaybackTimer = () => {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
};

const initialLikes: Record<string, boolean> = {};
sampleTracks.forEach((t) => {
  if (t.isLiked) {
    initialLikes[t.id] = true;
  }
});

const initialQueueTracks = popularTracksList;
const initialQueueItems = convertTracksToQueueItems(initialQueueTracks);

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  currentTrack: showcaseItem.track ?? sampleTracks[0],
  queue: initialQueueTracks,
  queueItems: initialQueueItems,
  currentIndex: 1, // 'Perfect' is index 1 in popularTracksList
  isPlaying: false,
  currentTime: 107,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: "off",
  likedTrackIds: initialLikes,
  recentPlays: initialRecentPlays,
  curatedCollections: curatedPlaylists,
  popularTracks: popularTracksList,
  playbackContext: null,

  setPlaybackContext: (context) => {
    set({ playbackContext: context });
  },

  clearContextIfMatches: (type: string, id: string) => {
    const current = get().playbackContext;
    if (current && current.type === type && current.id === id) {
      set({ playbackContext: null });
      get().clearUpcomingQueue();
    }
  },

  playTrack: (track: Track, customQueue?: Track[]) => {
    const queue = customQueue && customQueue.length > 0 ? customQueue : get().queue;
    let index = queue.findIndex((item) => item.id === track.id);
    let updatedQueue = queue;

    if (index === -1) {
      updatedQueue = [track, ...queue];
      index = 0;
    }

    const newHistoryItem: PlayHistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackId: track.id,
      track,
      playedAtTimestamp: Date.now(),
      contextTitle: track.album || "Now Playing",
    };

    const newQueueItems = convertTracksToQueueItems(updatedQueue);

    set((state) => ({
      currentTrack: track,
      queue: updatedQueue,
      queueItems: newQueueItems,
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      recentPlays: [newHistoryItem, ...state.recentPlays.filter((p) => p.trackId !== track.id)],
    }));

    startPlaybackTimer(get);

    const filePath = track.filePath || `mock://${track.id}.mp3`;
    audioPlayTrack(track.id, filePath, 0, track.durationSeconds).catch(() => {});
  },

  togglePlayPause: () => {
    const { isPlaying, currentTrack, queue, currentTime } = get();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0]);
      return;
    }
    const nextPlaying = !isPlaying;
    set({ isPlaying: nextPlaying });

    if (nextPlaying) {
      startPlaybackTimer(get);
      if (currentTrack) {
        audioResume().catch(() => {
          const filePath = currentTrack.filePath || `mock://${currentTrack.id}.mp3`;
          audioPlayTrack(
            currentTrack.id,
            filePath,
            currentTime,
            currentTrack.durationSeconds
          ).catch(() => {});
        });
      }
    } else {
      stopPlaybackTimer();
      audioPause().catch(() => {});
    }
  },

  nextTrack: () => {
    const { queue, currentIndex, repeatMode, isShuffle } = get();
    if (queue.length === 0) return;

    if (repeatMode === "one") {
      set({ currentTime: 0, isPlaying: true });
      audioSeek(0).catch(() => {});
      return;
    }

    let nextIndex = currentIndex + 1;
    if (isShuffle && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex);
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        nextIndex = 0;
      } else {
        set({ isPlaying: false, currentTime: 0 });
        stopPlaybackTimer();
        audioStop().catch(() => {});
        return;
      }
    }

    const nextTrackItem = queue[nextIndex];
    set({
      currentIndex: nextIndex,
      currentTrack: nextTrackItem,
      currentTime: 0,
      isPlaying: true,
    });
    startPlaybackTimer(get);

    const filePath = nextTrackItem.filePath || `mock://${nextTrackItem.id}.mp3`;
    audioPlayTrack(nextTrackItem.id, filePath, 0, nextTrackItem.durationSeconds).catch(() => {});
  },

  previousTrack: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    if (currentTime > 3) {
      set({ currentTime: 0 });
      audioSeek(0).catch(() => {});
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    const prevTrackItem = queue[prevIndex];
    set({
      currentIndex: prevIndex,
      currentTrack: prevTrackItem,
      currentTime: 0,
      isPlaying: true,
    });
    startPlaybackTimer(get);

    const filePath = prevTrackItem.filePath || `mock://${prevTrackItem.id}.mp3`;
    audioPlayTrack(prevTrackItem.id, filePath, 0, prevTrackItem.durationSeconds).catch(() => {});
  },

  seekTo: (seconds: number) => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    const clamped = Math.max(0, Math.min(seconds, currentTrack.durationSeconds));
    set({ currentTime: clamped });
    audioSeek(clamped).catch(() => {});
  },

  setVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(vol, 1));
    set({ volume: clamped, isMuted: clamped === 0 });
    audioSetVolume(clamped).catch(() => {});
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    audioSetMuted(nextMuted).catch(() => {});
  },

  toggleShuffle: () => {
    set((state) => ({ isShuffle: !state.isShuffle }));
  },

  toggleRepeat: () => {
    set((state) => {
      const transitions: Record<PlayerState["repeatMode"], PlayerState["repeatMode"]> = {
        off: "all",
        all: "one",
        one: "off",
      };
      return { repeatMode: transitions[state.repeatMode] };
    });
  },

  toggleLike: (trackId: string) => {
    const isCurrentlyLiked = Boolean(get().likedTrackIds[trackId]);
    favoritesSync.toggleFavorite(trackId, isCurrentlyLiked).catch(() => {});
  },

  playCollection: (tracks: Track[], startIndex = 0) => {
    if (tracks.length === 0) return;
    const selected = tracks[startIndex] ?? tracks[0];
    get().playTrack(selected, tracks);
  },

  clearRecentPlays: () => {
    set({ recentPlays: [] });
  },

  loadSampleHistory: () => {
    set({ recentPlays: initialRecentPlays });
  },

  tickTimer: () => {
    const { currentTime, currentTrack } = get();
    if (!currentTrack) return;

    if (currentTime + 1 >= currentTrack.durationSeconds) {
      get().nextTrack();
    } else {
      set({ currentTime: currentTime + 1 });
    }
  },

  addToQueue: (track: Track) => {
    const newItem: QueueItem = {
      id: createUniqueQueueId("manual"),
      trackId: track.id,
      track,
      addedAt: Date.now(),
      isManuallyQueued: true,
    };
    set((state) => ({
      queue: [...state.queue, track],
      queueItems: [...state.queueItems, newItem],
    }));
  },

  playNext: (track: Track) => {
    const newItem: QueueItem = {
      id: createUniqueQueueId("next"),
      trackId: track.id,
      track,
      addedAt: Date.now(),
      isManuallyQueued: true,
    };
    set((state) => {
      const insertIndex = Math.min(state.queue.length, state.currentIndex + 1);
      const nextQueue = [...state.queue];
      nextQueue.splice(insertIndex, 0, track);
      const nextQueueItems = [...state.queueItems];
      nextQueueItems.splice(insertIndex, 0, newItem);
      return {
        queue: nextQueue,
        queueItems: nextQueueItems,
      };
    });
  },

  removeFromQueue: (queueId: string) => {
    set((state) => {
      const index = state.queueItems.findIndex((item) => item.id === queueId);
      if (index === -1) return state;

      if (index === state.currentIndex && state.queueItems.length === 1) {
        return state;
      }

      const nextQueue = state.queue.filter((_, i) => i !== index);
      const nextQueueItems = state.queueItems.filter((_, i) => i !== index);

      let nextIndex = state.currentIndex;
      let nextCurrentTrack = state.currentTrack;

      if (index < state.currentIndex) {
        nextIndex = Math.max(0, state.currentIndex - 1);
      } else if (index === state.currentIndex) {
        if (nextIndex >= nextQueue.length) {
          nextIndex = Math.max(0, nextQueue.length - 1);
        }
        nextCurrentTrack = nextQueue[nextIndex] ?? null;
      }

      return {
        queue: nextQueue,
        queueItems: nextQueueItems,
        currentIndex: nextIndex,
        currentTrack: nextCurrentTrack,
      };
    });
  },

  reorderQueue: (sourceIndex: number, destIndex: number) => {
    set((state) => {
      if (
        sourceIndex < 0 ||
        sourceIndex >= state.queueItems.length ||
        destIndex < 0 ||
        destIndex >= state.queueItems.length ||
        sourceIndex === destIndex
      ) {
        return state;
      }

      const nextQueue = [...state.queue];
      const [movedTrack] = nextQueue.splice(sourceIndex, 1);
      nextQueue.splice(destIndex, 0, movedTrack);

      const nextQueueItems = [...state.queueItems];
      const [movedItem] = nextQueueItems.splice(sourceIndex, 1);
      nextQueueItems.splice(destIndex, 0, movedItem);

      let nextIndex = state.currentIndex;
      if (sourceIndex === state.currentIndex) {
        nextIndex = destIndex;
      } else if (sourceIndex < state.currentIndex && destIndex >= state.currentIndex) {
        nextIndex -= 1;
      } else if (sourceIndex > state.currentIndex && destIndex <= state.currentIndex) {
        nextIndex += 1;
      }

      return {
        queue: nextQueue,
        queueItems: nextQueueItems,
        currentIndex: nextIndex,
      };
    });
  },

  reorderUpcomingQueue: (sourceUpcomingIndex: number, destUpcomingIndex: number) => {
    const { currentIndex } = get();
    const sourceIndex = currentIndex + 1 + sourceUpcomingIndex;
    const destIndex = currentIndex + 1 + destUpcomingIndex;
    get().reorderQueue(sourceIndex, destIndex);
  },

  clearUpcomingQueue: () => {
    set((state) => {
      if (!state.currentTrack || state.queueItems.length === 0) return state;
      const currentItem = state.queueItems[state.currentIndex] ?? {
        id: createUniqueQueueId("current"),
        trackId: state.currentTrack.id,
        track: state.currentTrack,
        addedAt: Date.now(),
        isManuallyQueued: false,
      };
      return {
        queue: [state.currentTrack],
        queueItems: [currentItem],
        currentIndex: 0,
      };
    });
  },

  playQueueItem: (queueId: string) => {
    const { queueItems } = get();
    const index = queueItems.findIndex((item) => item.id === queueId);
    if (index === -1) return;
    const targetItem = queueItems[index];

    const newHistoryItem: PlayHistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackId: targetItem.track.id,
      track: targetItem.track,
      playedAtTimestamp: Date.now(),
      contextTitle: targetItem.track.album || "Queue Jump",
    };

    set((state) => ({
      currentTrack: targetItem.track,
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      recentPlays: [
        newHistoryItem,
        ...state.recentPlays.filter((p) => p.trackId !== targetItem.track.id),
      ],
    }));

    startPlaybackTimer(get);

    const filePath = targetItem.track.filePath || `mock://${targetItem.track.id}.mp3`;
    audioPlayTrack(targetItem.track.id, filePath, 0, targetItem.track.durationSeconds).catch(
      () => {}
    );
  },

  seekToLyricLine: (timeSeconds: number) => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    const clamped = Math.max(0, Math.min(timeSeconds, currentTrack.durationSeconds));
    set({ currentTime: clamped });
    audioSeek(clamped).catch(() => {});
  },
}));

let audioUnlisteners: Array<() => void> = [];

/**
 * Initializes listeners bridging native audio engine events to usePlayerStore.
 */
export function initPlayerAudioSync(): () => void {
  cleanupPlayerAudioSync();

  const p1 = listenAudioPosition((pos) => {
    const state = usePlayerStore.getState();
    if (state.currentTrack && state.currentTrack.id === pos.track_id) {
      usePlayerStore.setState({ currentTime: pos.position_seconds });
    }
  });

  const p2 = listenAudioTrackEnded((event) => {
    if (event.completed) {
      usePlayerStore.getState().nextTrack();
    }
  });

  const p3 = listenAudioStateChanged((audioState) => {
    const state = usePlayerStore.getState();
    if (audioState.status === "playing" && !state.isPlaying) {
      usePlayerStore.setState({ isPlaying: true });
    } else if (
      (audioState.status === "paused" || audioState.status === "stopped") &&
      state.isPlaying
    ) {
      usePlayerStore.setState({ isPlaying: false });
    }
  });

  Promise.all([p1, p2, p3]).then((unlisteners) => {
    audioUnlisteners = unlisteners;
  });

  return cleanupPlayerAudioSync;
}

/**
 * Cleans up registered audio event unlisteners.
 */
export function cleanupPlayerAudioSync(): void {
  audioUnlisteners.forEach((unlisten) => {
    try {
      unlisten();
    } catch {
      // safe
    }
  });
  audioUnlisteners = [];
}

// Auto-initialize audio listeners in browser/desktop environment
if (typeof window !== "undefined") {
  initPlayerAudioSync();
}

// Synchronize state whenever a favorite event occurs across any screen or store
favoritesSync.subscribe((trackId, isLiked) => {
  usePlayerStore.setState((state) => {
    const updatedLikes = { ...state.likedTrackIds, [trackId]: isLiked };
    const updateTrack = (t: Track): Track => (t.id === trackId ? { ...t, isLiked } : t);

    return {
      likedTrackIds: updatedLikes,
      currentTrack:
        state.currentTrack?.id === trackId
          ? { ...state.currentTrack, isLiked }
          : state.currentTrack,
      queue: state.queue.map(updateTrack),
      queueItems: state.queueItems.map((qi) => ({
        ...qi,
        track: updateTrack(qi.track),
      })),
      popularTracks: state.popularTracks.map(updateTrack),
    };
  });
});

// Typed selector hooks for performance optimization
export const useCurrentTrack = () => usePlayerStore((state) => state.currentTrack);
export const useIsPlaying = () => usePlayerStore((state) => state.isPlaying);
export const useCurrentTime = () => usePlayerStore((state) => state.currentTime);
export const useDuration = () =>
  usePlayerStore((state) => state.currentTrack?.durationSeconds ?? 0);
export const usePlaybackQueue = () => usePlayerStore((state) => state.queue);
export const useQueueItems = () => usePlayerStore((state) => state.queueItems);
export const useUpcomingQueue = () =>
  usePlayerStore(
    useShallow((state) => {
      if (state.queueItems.length === 0) return [];
      return state.queueItems.slice(state.currentIndex + 1);
    })
  );
export const useRecentPlays = () => usePlayerStore((state) => state.recentPlays);
export const usePopularTracks = () => usePlayerStore((state) => state.popularTracks);
export const useCuratedCollections = () => usePlayerStore((state) => state.curatedCollections);
export const useLikedTracks = () => usePlayerStore((state) => state.likedTrackIds);
export const useIsLiked = (trackId: string) =>
  usePlayerStore((state) => Boolean(state.likedTrackIds[trackId]));
