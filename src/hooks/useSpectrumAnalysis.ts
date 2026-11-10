import { useEffect, useRef, useState, useCallback } from "react";
import { Channel, isTauri } from "@tauri-apps/api/core";
import { startSpectrumAnalysis, stopSpectrumAnalysis } from "../services/audio";
import type { SpectrumFrame, VisualizerStreamState } from "../types/audio";
import type { FullscreenViewMode, VisualizerStyle } from "../types/overlays";

interface UseSpectrumAnalysisOptions {
  viewMode: FullscreenViewMode;
  visualizerStyle: VisualizerStyle;
  currentTrackId?: string | null;
  isPlaying: boolean;
}

interface UseSpectrumAnalysisReturn {
  frame: SpectrumFrame | null;
  streamState: VisualizerStreamState;
  retry: () => void;
}

export function useSpectrumAnalysis({
  viewMode,
  visualizerStyle,
  currentTrackId,
  isPlaying,
}: UseSpectrumAnalysisOptions): UseSpectrumAnalysisReturn {
  const [frame, setFrame] = useState<SpectrumFrame | null>(null);
  const [streamState, setStreamState] = useState<VisualizerStreamState>("starting");
  const [retryNonce, setRetryNonce] = useState(0);

  const isActive = viewMode === "visualizer" && visualizerStyle !== "off";

  const frameTimestampsRef = useRef<number[]>([]);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTransitioningRef = useRef(false);
  const lastTrackIdRef = useRef<string | null | undefined>(currentTrackId);
  const lastSequenceRef = useRef<number>(-1);
  const startedAtRef = useRef<number>(0);
  const lastFrameAtRef = useRef<number>(0);
  const hasReceivedAnyFrameRef = useRef<boolean>(false);
  const lowRateStartRef = useRef<number | null>(null);

  // Watch for track transition to pause watchdog
  useEffect(() => {
    if (currentTrackId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = currentTrackId;
      isTransitioningRef.current = true;
      lowRateStartRef.current = null;
      // Pause watchdog for 1s on track boundary transition
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTrackId]);

  const retry = useCallback(() => {
    setStreamState("starting");
    setFrame(null);
    frameTimestampsRef.current = [];
    lastSequenceRef.current = -1;
    startedAtRef.current = performance.now();
    lastFrameAtRef.current = 0;
    hasReceivedAnyFrameRef.current = false;
    lowRateStartRef.current = null;
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isActive) {
      // Inactive: stop analysis and clear frame state
      stopSpectrumAnalysis().catch(() => {});
      setStreamState("starting");
      setFrame(null);
      frameTimestampsRef.current = [];
      hasReceivedAnyFrameRef.current = false;
      lowRateStartRef.current = null;
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      return;
    }

    setStreamState("starting");
    frameTimestampsRef.current = [];
    startedAtRef.current = performance.now();
    lastFrameAtRef.current = 0;
    hasReceivedAnyFrameRef.current = false;
    lowRateStartRef.current = null;
    let isCancelled = false;

    const channel = isTauri()
      ? new Channel<SpectrumFrame>()
      : ({ onmessage: null } as unknown as Channel<SpectrumFrame>);
    channel.onmessage = (incomingFrame: SpectrumFrame) => {
      if (isCancelled) return;

      // Invariant: track ID match and sequence must be strictly increasing
      if (currentTrackId && incomingFrame.track_id !== currentTrackId && incomingFrame.track_id !== "none") {
        return;
      }
      if (incomingFrame.sequence <= lastSequenceRef.current) {
        return;
      }
      lastSequenceRef.current = incomingFrame.sequence;

      const now = performance.now();
      lastFrameAtRef.current = now;
      hasReceivedAnyFrameRef.current = true;
      frameTimestampsRef.current.push(now);

      // Keep only timestamps within last 1.5 seconds
      frameTimestampsRef.current = frameTimestampsRef.current.filter((t) => now - t <= 1500);

      setFrame(incomingFrame);
      setStreamState((prev) => (prev === "starting" ? "active" : prev));
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
      }
    };

    startSpectrumAnalysis(channel).catch((_err) => {
      if (!isCancelled) {
        setStreamState("unavailable");
      }
    });

    // Watchdog check every 500ms
    watchdogTimerRef.current = setInterval(() => {
      if (isCancelled) return;

      // Skip watchdog if paused or transitioning between tracks
      if (!isPlaying || isTransitioningRef.current) {
        lowRateStartRef.current = null;
        return;
      }

      const now = performance.now();

      // Grace period: if no frame has ever arrived yet, wait up to 3s before declaring unavailable
      if (!hasReceivedAnyFrameRef.current) {
        if (now - startedAtRef.current > 3000) {
          setStreamState("unavailable");
        }
        return;
      }

      // If active stream stops producing frames for > 1.5s while playing
      if (now - lastFrameAtRef.current > 1500) {
        setStreamState("unavailable");
        return;
      }

      // Check frame rate over a rolling 1-second window after the initial warmup (1.5s)
      if (now - startedAtRef.current >= 1500) {
        const recentFrames = frameTimestampsRef.current.filter((t) => now - t <= 1000);
        if (recentFrames.length < 15) {
          // Track when the rate first dropped below 15 fps
          if (lowRateStartRef.current === null) {
            lowRateStartRef.current = now;
          } else if (now - lowRateStartRef.current >= 1000) {
            // Rate has stayed below 15 fps for a sustained one second (spec AC-1, AC-5)
            setStreamState("unavailable");
          }
        } else {
          lowRateStartRef.current = null;
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      stopSpectrumAnalysis().catch(() => {});
    };
  }, [isActive, retryNonce, isPlaying, currentTrackId]);

  return {
    frame,
    streamState,
    retry,
  };
}

