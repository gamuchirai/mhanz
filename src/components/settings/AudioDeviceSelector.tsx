import {
  useAvailableAudioDevices,
  useSettingsStore,
  useUserSettings,
} from "../../store/useSettingsStore";

export function AudioDeviceSelector() {
  const devices = useAvailableAudioDevices();
  const settings = useUserSettings();
  const setOutputDevice = useSettingsStore((state) => state.setOutputDevice);

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
        Audio Output Device
      </label>

      <div
        role="radiogroup"
        aria-label="Select audio output device"
        style={{ display: "flex", flexDirection: "column", gap: "6px" }}
      >
        {devices.map((device) => {
          const isSelected = settings.outputDeviceId === device.id;
          return (
            <button
              key={device.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setOutputDevice(device.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: isSelected
                      ? "5px solid var(--accent)"
                      : "2px solid rgba(255, 255, 255, 0.2)",
                    background: isSelected ? "#0b0706" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 400 }}>
                    {device.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--m)", marginTop: "1px" }}>
                    {device.sampleRate / 1000} kHz · {device.channels === 2 ? "Stereo" : "Mono"}
                  </div>
                </div>
              </div>

              {device.isDefault && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "var(--m)",
                  }}
                >
                  DEFAULT
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
