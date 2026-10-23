import { create } from "zustand";
import { CuratedCard, PlayHistoryItem, Track } from "../types/discovery";
import {
  curatedPlaylists,
  initialRecentPlays,
  popularTracksList,
  sampleTracks,
  showcaseItem,
} from "../data/homeFixtures";

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
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

  playTrack: (track: Track, queue?: Track[]) => void;
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

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  currentTrack: showcaseItem.track ?? sampleTracks[0],
  queue: popularTracksList,
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

  playTrack: (track: Track, customQueue?: Track[]) => {
    const queue = customQueue && customQueue.length > 0 ? customQueue : get().queue;
    let index = queue.findIndex((item) => item.id === track.id);
    let updatedQueue = queue;

    if (index === -1) {
      updatedQueue = [track, ...queue];
      index = 0;
    }

    const newHistoryItem: PlayHistoryItem = {
      id: `history-${Date.now()}`,
      trackId: track.id,
      track,
      playedAtTimestamp: Date.now(),
      contextTitle: track.album || "Now Playing",
    };

    set((state) => ({
      currentTrack: track,
      queue: updatedQueue,
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      recentPlays: [newHistoryItem, ...state.recentPlays.filter((p) => p.trackId !== track.id)],
    }));

    startPlaybackTimer(get);
  },

  togglePlayPause: () => {
    const { isPlaying, currentTrack, queue } = get();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0]);
      return;
    }
    const nextPlaying = !isPlaying;
    set({ isPlaying: nextPlaying });

    if (nextPlaying) {
      startPlaybackTimer(get);
    } else {
      stopPlaybackTimer();
    }
  },

  nextTrack: () => {
    const { queue, currentIndex, repeatMode, isShuffle } = get();
    if (queue.length === 0) return;

    if (repeatMode === "one") {
      set({ currentTime: 0, isPlaying: true });
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
  },

  previousTrack: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    set({
      currentIndex: prevIndex,
      currentTrack: queue[prevIndex],
      currentTime: 0,
      isPlaying: true,
    });
    startPlaybackTimer(get);
  },

  seekTo: (seconds: number) => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    const clamped = Math.max(0, Math.min(seconds, currentTrack.durationSeconds));
    set({ currentTime: clamped });
  },

  setVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(vol, 1));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
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
    set((state) => {
      const isLiked = !state.likedTrackIds[trackId];
      const updatedLikes = { ...state.likedTrackIds, [trackId]: isLiked };

      const updateTrack = (t: Track): Track =>
        t.id === trackId ? { ...t, isLiked } : t;

      return {
        likedTrackIds: updatedLikes,
        currentTrack: state.currentTrack?.id === trackId ? { ...state.currentTrack, isLiked } : state.currentTrack,
        queue: state.queue.map(updateTrack),
        popularTracks: state.popularTracks.map(updateTrack),
      };
    });
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
}));

// Typed selector hooks for performance optimization
export const useCurrentTrack = () => usePlayerStore((state) => state.currentTrack);
export const useIsPlaying = () => usePlayerStore((state) => state.isPlaying);
export const useCurrentTime = () => usePlayerStore((state) => state.currentTime);
export const usePlaybackQueue = () => usePlayerStore((state) => state.queue);
export const useRecentPlays = () => usePlayerStore((state) => state.recentPlays);
export const usePopularTracks = () => usePlayerStore((state) => state.popularTracks);
export const useCuratedCollections = () => usePlayerStore((state) => state.curatedCollections);
export const useLikedTracks = () => usePlayerStore((state) => state.likedTrackIds);
export const useIsLiked = (trackId: string) =>
  usePlayerStore((state) => Boolean(state.likedTrackIds[trackId]));
