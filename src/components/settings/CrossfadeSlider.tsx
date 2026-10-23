import { useSettingsStore, useUserSettings } from "../../store/useSettingsStore";

export function CrossfadeSlider() {
  const settings = useUserSettings();
  const setCrossfade = useSettingsStore((state) => state.setCrossfade);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label
          htmlFor="crossfade-input"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: ".06em",
            color: "var(--m)",
            textTransform: "uppercase",
          }}
        >
          Track Crossfade
        </label>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: settings.crossfadeSeconds > 0 ? "var(--accent)" : "var(--m)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {settings.crossfadeSeconds === 0 ? "Off (0s)" : `${settings.crossfadeSeconds}s`}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: "12px", color: "var(--m)", lineHeight: 1.4 }}>
        Smoothly fades out the ending track while fading in the next track.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--m)" }}>0s</span>
        <input
          id="crossfade-input"
          type="range"
          min={0}
          max={12}
          step={1}
          value={settings.crossfadeSeconds}
          onChange={(e) => setCrossfade(parseInt(e.target.value, 10))}
          aria-label="Crossfade duration in seconds"
          aria-valuemin={0}
          aria-valuemax={12}
          aria-valuenow={settings.crossfadeSeconds}
          style={{
            flex: 1,
            accentColor: "var(--accent)",
            cursor: "pointer",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--m)" }}>12s</span>
      </div>
    </div>
  );
}
