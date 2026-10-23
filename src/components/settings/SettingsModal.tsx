import { useOverlayStore } from "../../store/useOverlayStore";
import { useSettingsStore, useUserSettings } from "../../store/useSettingsStore";
import { AudioDeviceSelector } from "./AudioDeviceSelector";
import { CrossfadeSlider } from "./CrossfadeSlider";
import { VisualizerPicker } from "./VisualizerPicker";

export function SettingsModal() {
  const closeOverlay = useOverlayStore((state) => state.closeOverlay);
  const settings = useUserSettings();
  const setVolumeNormalization = useSettingsStore((state) => state.setVolumeNormalization);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  return (
    <div
      role="presentation"
      onClick={closeOverlay}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audio preferences settings"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "85vh",
          background: "#18110f",
          border: "1px solid var(--l)",
          borderRadius: "16px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(240, 169, 130, 0.12)",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg className="i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--t)" }}>
              Audio Preferences
            </h3>
          </div>

          <button
            aria-label="Close settings"
            onClick={closeOverlay}
            style={{
              background: "none",
              border: 0,
              padding: "6px",
              color: "var(--m)",
              cursor: "pointer",
              borderRadius: "6px",
              display: "grid",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
          >
            <svg className="i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Audio Output Device Selection */}
          <AudioDeviceSelector />

          {/* Volume Normalisation Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}>
                Volume Normalisation
              </div>
              <div style={{ fontSize: "11px", color: "var(--m)", marginTop: "2px" }}>
                Maintains a consistent volume level across varied album masters
              </div>
            </div>
            <button
              role="switch"
              aria-checked={settings.volumeNormalization}
              aria-label="Toggle volume normalisation"
              onClick={() => setVolumeNormalization(!settings.volumeNormalization)}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: settings.volumeNormalization
                  ? "var(--accent)"
                  : "rgba(255, 255, 255, 0.15)",
                border: 0,
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: settings.volumeNormalization ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: settings.volumeNormalization ? "#1c0f09" : "#ffffff",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Crossfade Slider */}
          <CrossfadeSlider />

          {/* Visualizer Picker */}
          <VisualizerPicker />

          {/* Desktop Notifications Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)" }}>
                Track Change Notifications
              </div>
              <div style={{ fontSize: "11px", color: "var(--m)", marginTop: "2px" }}>
                Displays desktop toast notification on track changes
              </div>
            </div>
            <button
              role="switch"
              aria-checked={settings.notificationsEnabled}
              aria-label="Toggle track change notifications"
              onClick={() => setNotificationsEnabled(!settings.notificationsEnabled)}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: settings.notificationsEnabled
                  ? "var(--accent)"
                  : "rgba(255, 255, 255, 0.15)",
                border: 0,
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: settings.notificationsEnabled ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: settings.notificationsEnabled ? "#1c0f09" : "#ffffff",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <button
            onClick={resetToDefaults}
            style={{
              background: "none",
              border: 0,
              padding: "6px 10px",
              color: "var(--m)",
              fontSize: "12px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
          >
            Reset to Defaults
          </button>

          <button
            onClick={closeOverlay}
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "var(--accent)",
              color: "#1c0f09",
              border: 0,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
