import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { FullscreenVisualizer } from "../components/fullscreen/FullscreenVisualizer";
import { useSpectrumAnalysis } from "../hooks/useSpectrumAnalysis";
import {
  startSpectrumAnalysis,
  stopSpectrumAnalysis,
  setAudioMockMode,
  resetAudioMock,
} from "../services/audio";
import type { SpectrumFrame } from "../types/audio";

describe("FullscreenVisualizer component", () => {
  it("renders off state with accessible message and return button", () => {
    const onReturn = vi.fn();
    render(
      <FullscreenVisualizer
        style="off"
        isPlaying={false}
        spectrumFrame={null}
        streamState="starting"
        onRetry={vi.fn()}
        onReturnToArtwork={onReturn}
      />
    );

    expect(screen.getByText("Visualizer is turned off")).toBeDefined();
    expect(
      screen.getByLabelText("Visualizer is disabled. Enable waveform or bars in Settings.")
    ).toBeDefined();

    const returnBtn = screen.getByText("Return to Artwork");
    fireEvent.click(returnBtn);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("renders unavailable state with retry and return buttons", () => {
    const onRetry = vi.fn();
    const onReturn = vi.fn();

    render(
      <FullscreenVisualizer
        style="bars"
        isPlaying={true}
        spectrumFrame={null}
        streamState="unavailable"
        onRetry={onRetry}
        onReturnToArtwork={onReturn}
      />
    );

    expect(screen.getByText("Live visualizer unavailable")).toBeDefined();
    const retryBtn = screen.getByText("Retry");
    const returnBtn = screen.getByText("Return to Artwork");

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(returnBtn);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("renders canvas and starting message when starting", () => {
    render(
      <FullscreenVisualizer
        style="bars"
        isPlaying={true}
        spectrumFrame={null}
        streamState="starting"
        onRetry={vi.fn()}
        onReturnToArtwork={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Audio visualizer stage")).toBeDefined();
    expect(screen.getByText("Starting analysis…")).toBeDefined();
  });

  it("renders active canvas when frames arrive", () => {
    const frame: SpectrumFrame = {
      track_id: "trk-1",
      timestamp_ms: 100,
      sequence: 1,
      bands: new Array(32).fill(0.5),
    };

    render(
      <FullscreenVisualizer
        style="bars"
        isPlaying={true}
        spectrumFrame={frame}
        streamState="active"
        onRetry={vi.fn()}
        onReturnToArtwork={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Audio visualizer stage")).toBeDefined();
    expect(screen.queryByText("Starting analysis…")).toBeNull();
  });

  it("renders wave visualizer style with canvas stage (AC-1)", () => {
    const frame: SpectrumFrame = {
      track_id: "trk-1",
      timestamp_ms: 200,
      sequence: 2,
      bands: new Array(32).fill(0.7),
    };

    render(
      <FullscreenVisualizer
        style="wave"
        isPlaying={true}
        spectrumFrame={frame}
        streamState="active"
        onRetry={vi.fn()}
        onReturnToArtwork={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Audio visualizer stage")).toBeDefined();
    expect(screen.queryByText("Starting analysis…")).toBeNull();
  });
});

describe("Audio service spectrum analysis", () => {
  beforeEach(() => {
    setAudioMockMode(true);
    resetAudioMock();
  });

  afterEach(() => {
    resetAudioMock();
  });

  it("streams mock frames at expected sequence intervals", async () => {
    const receivedFrames: SpectrumFrame[] = [];
    const mockChannel = {
      onmessage: (frame: SpectrumFrame) => {
        receivedFrames.push(frame);
      },
    };

    await startSpectrumAnalysis(mockChannel as any);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(receivedFrames.length).toBeGreaterThanOrEqual(1);
    expect(receivedFrames[0].bands.length).toBe(32);
    expect(receivedFrames[0].sequence).toBeGreaterThanOrEqual(1);

    await stopSpectrumAnalysis();
  });

  it("manages streamState lifecycle in useSpectrumAnalysis hook", async () => {
    const { result, unmount } = renderHook(() =>
      useSpectrumAnalysis({
        viewMode: "visualizer",
        visualizerStyle: "bars",
        currentTrackId: "mock-track",
        isPlaying: true,
      })
    );

    expect(result.current.streamState).toBe("starting");

    // Wait for mock frames to arrive
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(result.current.streamState).toBe("active");
    expect(result.current.frame).not.toBeNull();

    unmount();
  });

  it("rejects incoming frames with mismatched track IDs (AC-3)", async () => {
    const { result, unmount } = renderHook(() =>
      useSpectrumAnalysis({
        viewMode: "visualizer",
        visualizerStyle: "bars",
        currentTrackId: "different-track-id",
        isPlaying: true,
      })
    );

    // Wait for mock frames (which carry track_id "mock-track")
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    // Mismatched frames must not be accepted
    expect(result.current.frame).toBeNull();
    expect(result.current.streamState).toBe("starting");

    unmount();
  });

  it("pauses watchdog checks when playback is paused (AC-3, AC-5)", async () => {
    const { result, unmount } = renderHook(() =>
      useSpectrumAnalysis({
        viewMode: "visualizer",
        visualizerStyle: "bars",
        currentTrackId: "mock-track",
        isPlaying: false,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    // Does not erroneously become unavailable when paused
    expect(result.current.streamState).not.toBe("unavailable");

    unmount();
  });

  it("resets stream and frame state on retry invocation (AC-5)", async () => {
    const { result, unmount } = renderHook(() =>
      useSpectrumAnalysis({
        viewMode: "visualizer",
        visualizerStyle: "bars",
        currentTrackId: "mock-track",
        isPlaying: true,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(result.current.streamState).toBe("active");

    // Trigger retry
    act(() => {
      result.current.retry();
    });

    expect(result.current.streamState).toBe("starting");
    expect(result.current.frame).toBeNull();

    unmount();
  });

  it("stops spectrum analysis when viewMode switches away from visualizer (AC-2)", async () => {
    const { result, rerender, unmount } = renderHook(
      ({ viewMode }) =>
        useSpectrumAnalysis({
          viewMode: viewMode as any,
          visualizerStyle: "bars",
          currentTrackId: "mock-track",
          isPlaying: true,
        }),
      { initialProps: { viewMode: "visualizer" } }
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(result.current.streamState).toBe("active");

    // Switch view mode to artwork
    rerender({ viewMode: "artwork" });

    expect(result.current.streamState).toBe("starting");
    expect(result.current.frame).toBeNull();

    unmount();
  });
});

