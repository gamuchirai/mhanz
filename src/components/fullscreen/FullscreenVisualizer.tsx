import { useEffect, useRef } from "react";
import type { VisualizerStyle } from "../../types/overlays";
import type { AmbientColorPalette } from "../../types/discovery";

interface FullscreenVisualizerProps {
  style: VisualizerStyle;
  isPlaying: boolean;
  ambientColors?: AmbientColorPalette;
}

export function FullscreenVisualizer({
  style,
  isPlaying,
  ambientColors,
}: FullscreenVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    // Fixed buffer resolution capped at 720p (1280 x 720)
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

      if (isPlaying) {
        phase += 0.04;
      }

      const centerY = TARGET_HEIGHT / 2;

      if (style === "bars") {
        const barCount = 48;
        const totalBarWidth = TARGET_WIDTH * 0.8;
        const barWidth = totalBarWidth / (barCount * 1.5);
        const startX = (TARGET_WIDTH - totalBarWidth) / 2;

        for (let i = 0; i < barCount; i++) {
          const x = startX + i * (barWidth * 1.5);
          // Generate organic reactive waveform based on harmonic frequencies
          const harmonic =
            Math.sin(phase + i * 0.25) * 0.5 + Math.cos(phase * 0.7 + i * 0.15) * 0.5;
          const energy = isPlaying ? 0.35 + 0.65 * Math.abs(harmonic) : 0.1;
          const barHeight = energy * 260;

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
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, Math.max(4, barHeight), 4);
          ctx.fill();
        }
      } else if (style === "wave") {
        const waves = [
          { freq: 0.008, speed: 1.0, amp: 90, alpha: 0.85, color: accentColor },
          { freq: 0.012, speed: -0.8, amp: 65, alpha: 0.65, color: primaryColor },
          { freq: 0.005, speed: 1.3, amp: 45, alpha: 0.45, color: secondaryColor },
        ];

        waves.forEach((w) => {
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = w.color;
          ctx.globalAlpha = w.alpha;

          for (let x = 0; x <= TARGET_WIDTH; x += 6) {
            const yOffset = isPlaying
              ? Math.sin(x * w.freq + phase * w.speed) * w.amp +
                Math.sin(x * 0.02 + phase * 1.8) * (w.amp * 0.25)
              : Math.sin(x * w.freq) * (w.amp * 0.15);
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
        // Concentric breathing rings
        const maxR = 240;
        const rings = 4;
        const baseRadius = 60;

        for (let r = 0; r < rings; r++) {
          const ringPhase = phase + r * 1.2;
          const expansion = isPlaying ? (Math.sin(ringPhase) * 0.5 + 0.5) * (maxR - baseRadius) : 0;
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
      {style === "off" ? (
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            color: "var(--m)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "16px", color: "var(--t)", fontWeight: 500 }}>
            Visualizer is turned off
          </span>
          <span style={{ fontSize: "13px" }}>
            Enable waveform or bars in Settings to activate the real time canvas.
          </span>
        </div>
      ) : null}
    </div>
  );
}
