import { useEffect, useRef, useCallback } from "react";
import type { VisualizerStyle } from "../../types/overlays";
import type { AmbientColorPalette } from "../../types/discovery";
import type { SpectrumFrame, VisualizerStreamState } from "../../types/audio";

interface FullscreenVisualizerProps {
  style: VisualizerStyle;
  isPlaying: boolean;
  ambientColors?: AmbientColorPalette;
  /** Live spectrum frame from the native engine; null while starting or unavailable. */
  spectrumFrame: SpectrumFrame | null;
  /** Current stream health. */
  streamState: VisualizerStreamState;
  /** Called when the user asks to retry after an error. */
  onRetry: () => void;
  /** Called when the user wants to return to the Artwork view. */
  onReturnToArtwork: () => void;
}

/** Decay coefficient applied each animation frame when no new sample arrives (~60 FPS targeting). */
const DECAY = 0.88;

export function FullscreenVisualizer({
  style,
  isPlaying,
  ambientColors,
  spectrumFrame,
  streamState,
  onRetry,
  onReturnToArtwork,
}: FullscreenVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable smooth band buffer that decays toward zero between frames.
  const smoothBandsRef = useRef<Float32Array>(new Float32Array(32));
  // Last accepted sequence number to reject stale frames.
  const lastSequenceRef = useRef<number>(-1);
  // Phase counter for the Off and static-frame fallback animations.
  const phaseRef = useRef<number>(0);

  // Apply a new frame to the smooth buffer if sequence is strictly increasing.
  const applyFrame = useCallback((frame: SpectrumFrame) => {
    if (frame.sequence <= lastSequenceRef.current) return;
    lastSequenceRef.current = frame.sequence;
    const buf = smoothBandsRef.current;
    for (let i = 0; i < 32; i++) {
      const v = frame.bands[i] ?? 0;
      buf[i] = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
  }, []);

  useEffect(() => {
    if (spectrumFrame) {
      applyFrame(spectrumFrame);
    }
  }, [spectrumFrame, applyFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Fixed buffer resolution capped at 720p (1280 × 720)
    const TARGET_WIDTH = 1280;
    const TARGET_HEIGHT = 720;
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;

    const primaryColor = ambientColors?.primary ?? "rgba(240, 169, 130, 0.85)";
    const secondaryColor = ambientColors?.secondary ?? "rgba(162, 79, 90, 0.75)";
    const accentColor = ambientColors?.accent ?? "#f0a982";

    const render = () => {
      ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      if (style === "off") {
        return;
      }

      const bands = smoothBandsRef.current;

      // Decay toward zero when paused or no new frame arrived this tick.
      if (!isPlaying) {
        for (let i = 0; i < 32; i++) {
          bands[i] *= DECAY;
          if (bands[i] < 0.001) bands[i] = 0;
        }
      }

      // Animate phase for the Off / starting fallback, also used for wave background motion.
      phaseRef.current += isPlaying ? 0.04 : 0;

      const centerY = TARGET_HEIGHT / 2;

      if (style === "bars") {
        const barCount = 32;
        const totalBarWidth = TARGET_WIDTH * 0.8;
        const barWidth = totalBarWidth / (barCount * 1.5);
        const startX = (TARGET_WIDTH - totalBarWidth) / 2;

        for (let i = 0; i < barCount; i++) {
          const x = startX + i * (barWidth * 1.5);
          // Map band directly to bar height (AC-1).
          const energy = bands[i] ?? 0;
          const barHeight = Math.max(4, energy * 320);

          const gradient = ctx.createLinearGradient(
            0,
            centerY - barHeight / 2,
            0,
            centerY + barHeight / 2
          );
          gradient.addColorStop(0, accentColor);
          gradient.addColorStop(0.5, primaryColor);
          gradient.addColorStop(1, secondaryColor);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 4);
          ctx.fill();
        }
      } else if (style === "wave") {
        // Derive low, mid, high averages from 32 bands (AC-1).
        let lowSum = 0;
        let midSum = 0;
        let highSum = 0;
        for (let i = 0; i < 11; i++) lowSum += bands[i] ?? 0;
        for (let i = 11; i < 22; i++) midSum += bands[i] ?? 0;
        for (let i = 22; i < 32; i++) highSum += bands[i] ?? 0;
        const low = lowSum / 11;
        const mid = midSum / 11;
        const high = highSum / 10;

        const phase = phaseRef.current;

        const waves = [
          { freq: 0.008, speed: 1.0, amp: 90 + low * 120, alpha: 0.85, color: accentColor },
          { freq: 0.012, speed: -0.8, amp: 65 + mid * 90, alpha: 0.65, color: primaryColor },
          { freq: 0.005, speed: 1.3, amp: 45 + high * 60, alpha: 0.45, color: secondaryColor },
        ];

        waves.forEach((w) => {
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = w.color;
          ctx.globalAlpha = w.alpha;

          for (let x = 0; x <= TARGET_WIDTH; x += 6) {
            const yOffset =
              Math.sin(x * w.freq + phase * w.speed) * w.amp +
              Math.sin(x * 0.02 + phase * 1.8) * (w.amp * 0.25);
            const y = centerY + yOffset;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
      } else if (style === "glow") {
        // Concentric breathing rings modulated by average energy.
        const avgEnergy =
          bands.reduce((sum, v) => sum + v, 0) / 32;
        const maxR = 240;
        const rings = 4;
        const baseRadius = 60;
        const phase = phaseRef.current;

        for (let r = 0; r < rings; r++) {
          const ringPhase = phase + r * 1.2;
          const expansion =
            isPlaying
              ? (Math.sin(ringPhase) * 0.5 + 0.5) * (maxR - baseRadius) * (0.4 + avgEnergy * 0.6)
              : 0;
          const currentRadius = baseRadius + expansion;

          ctx.beginPath();
          ctx.arc(TARGET_WIDTH / 2, centerY, currentRadius, 0, Math.PI * 2);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = r % 2 === 0 ? accentColor : primaryColor;
          ctx.globalAlpha = Math.max(0.1, 1 - currentRadius / maxR);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [style, isPlaying, ambientColors]);

  // Off style: disabled with accessible explanation (AC-4).
  if (style === "off") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
          height: "100%",
          gap: "8px",
          color: "var(--m)",
          textAlign: "center",
        }}
      >
        <span
          aria-label="Visualizer is disabled. Enable waveform or bars in Settings."
          style={{ fontSize: "16px", color: "var(--t)", fontWeight: 500 }}
        >
          Visualizer is turned off
        </span>
        <span style={{ fontSize: "13px" }}>
          Enable waveform or bars in Settings to activate the real time canvas.
        </span>
        <button
          onClick={onReturnToArtwork}
          style={{
            marginTop: "12px",
            padding: "8px 20px",
            borderRadius: "24px",
            background: "rgba(240, 169, 130, 0.12)",
            border: "1px solid rgba(240, 169, 130, 0.3)",
            color: "var(--accent)",
            fontWeight: 500,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Return to Artwork
        </button>
      </div>
    );
  }

  // Unavailable / error state (AC-5).
  if (streamState === "unavailable") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
          height: "100%",
          gap: "12px",
          color: "var(--m)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(240, 169, 130, 0.08)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span style={{ fontSize: "16px", color: "var(--t)", fontWeight: 500 }}>
          Live visualizer unavailable
        </span>
        <span style={{ fontSize: "13px", maxWidth: "320px" }}>
          Audio analysis could not start or stopped producing data.
        </span>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            onClick={onRetry}
            style={{
              padding: "8px 20px",
              borderRadius: "24px",
              background: "var(--accent)",
              border: 0,
              color: "#1c0f09",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
          <button
            onClick={onReturnToArtwork}
            style={{
              padding: "8px 20px",
              borderRadius: "24px",
              background: "rgba(240, 169, 130, 0.12)",
              border: "1px solid rgba(240, 169, 130, 0.3)",
              color: "var(--accent)",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Return to Artwork
          </button>
        </div>
      </div>
    );
  }

  // Starting spinner overlay shown until first frame or timeout (AC-5).
  const showStarting = streamState === "starting";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        width: "100%",
        height: "100%",
        position: "relative",
        zIndex: 10,
        animation: "fadeIn 0.3s ease",
      }}
    >
      {showStarting && (
        <div
          role="status"
          aria-label="Starting audio analysis"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(11, 7, 6, 0.6)",
            zIndex: 20,
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "var(--m)",
              opacity: 0.7,
            }}
          >
            Starting analysis…
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-label="Audio visualizer stage"
        role="img"
        style={{
          width: "100%",
          maxWidth: "1100px",
          height: "auto",
          maxHeight: "65vh",
          objectFit: "contain",
          filter: "drop-shadow(0 0 20px rgba(240, 169, 130, 0.25))",
        }}
      />
    </div>
  );
}
