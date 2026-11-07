import { useSettingsStore, useUserSettings } from "../../store/useSettingsStore";

/**
 * Toggle control for enabling or disabling operating system media keys
 * and Windows volume flyout transport controls.
 */
export function SystemMediaControlsToggle() {
  const settings = useUserSettings();
  const setSystemMediaControlsEnabled = useSettingsStore(
    (state) => state.setSystemMediaControlsEnabled
  );

  return (
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
          System Media Controls
        </div>
        <div style={{ fontSize: "11px", color: "var(--m)", marginTop: "2px" }}>
          Enables keyboard media keys and Windows volume flyout playback controls
        </div>
      </div>
      <button
        role="switch"
        aria-checked={settings.systemMediaControlsEnabled}
        aria-label="Toggle system media controls"
        onClick={() =>
          setSystemMediaControlsEnabled(!settings.systemMediaControlsEnabled)
        }
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "12px",
          background: settings.systemMediaControlsEnabled
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
            left: settings.systemMediaControlsEnabled ? "22px" : "2px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: settings.systemMediaControlsEnabled ? "#1c0f09" : "#ffffff",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}
