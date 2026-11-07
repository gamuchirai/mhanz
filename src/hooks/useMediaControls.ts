import { useEffect, useRef } from "react";
import { listenMediaControlsAction } from "../services/mediaControls";
import { usePlayerStore } from "../store/usePlayerStore";

/**
 * Custom React hook coordinating native media control action events
 * with usePlayerStore actions, including action dispatch mapping and throttling.
 */
export function useMediaControls(): void {
  const lastActionTimeRef = useRef<number>(0);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listenMediaControlsAction((event) => {
      const now = Date.now();
      // Throttle rapid consecutive toggles under 150ms to prevent double-tap bounce
      if (event.action === "toggle") {
        if (now - lastActionTimeRef.current < 150) {
          return;
        }
        lastActionTimeRef.current = now;
      }

      const store = usePlayerStore.getState();

      switch (event.action) {
        case "play":
          if (!store.isPlaying) {
            store.togglePlayPause();
          }
          break;
        case "pause":
          if (store.isPlaying) {
            store.togglePlayPause();
          }
          break;
        case "toggle":
          store.togglePlayPause();
          break;
        case "next":
          store.nextTrack();
          break;
        case "previous":
          store.previousTrack();
          break;
        case "stop":
          if (store.isPlaying) {
            store.togglePlayPause();
          }
          store.seekTo(0);
          break;
        case "seek":
          if (typeof event.position_seconds === "number") {
            store.seekTo(event.position_seconds);
          }
          break;
        case "seek_relative":
          if (typeof event.position_seconds === "number") {
            const current = store.currentTime;
            const target = Math.max(0, current + event.position_seconds);
            store.seekTo(target);
          }
          break;
        default:
          break;
      }
    }).then((dispose) => {
      unlisten = dispose;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
}