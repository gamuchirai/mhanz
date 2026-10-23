import type { VisualizerStyle } from "../../types/overlays";
import { useSettingsStore, useUserSettings } from "../../store/useSettingsStore";

interface StyleOption {
  id: VisualizerStyle;
  label: string;
  description: string;
}

const styleOptions: StyleOption[] = [
  {
    id: "bars",
    label: "Dynamic Bars",
    description: "Dancing equalizer frequency bands",
  },
  {
    id: "wave",
    label: "Smooth Wave",
    description: "Flowing harmonic audio waveform",
  },
  {
    id: "glow",
    label: "Ambient Glow",
    description: "Pulsing atmospheric lighting",
  },
  {
    id: "off",
    label: "Disabled",
    description: "Zero visual animations",
  },
];

export function VisualizerPicker() {
  const settings = useUserSettings();
  const setVisualizerStyle = useSettingsStore((state) => state.setVisualizerStyle);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: ".06em",
          color: "var(--m)",
          textTransform: "uppercase",
        }}
      >
        Visualizer Style
      </label>

      <div
        role="radiogroup"
        aria-label="Select audio visualizer style"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {styleOptions.map((opt) => {
          const isSelected = settings.visualizerStyle === opt.id;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setVisualizerStyle(opt.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: "10px",
                background: isSelected ? "rgba(240, 169, 130, 0.12)" : "rgba(255, 255, 255, 0.03)",
                border: isSelected
                  ? "1px solid var(--accent)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                color: isSelected ? "var(--t)" : "var(--m)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.color = "var(--t)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.color = "var(--m)";
                }
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "var(--accent)" : "var(--t)",
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--m)",
                  marginTop: "2px",
                  lineHeight: 1.3,
                }}
              >
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
