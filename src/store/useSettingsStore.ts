import { create } from "zustand";
import type { AudioDevice, UserSettings, VisualizerStyle } from "../types/overlays";
import { defaultUserSettings, mockAudioDevices } from "../data/mockAudioDevices";

const SETTINGS_STORAGE_KEY = "mumhanzi:settings:v1";

/**
 * Validates and sanitizes raw data from local storage against the UserSettings schema.
 */
function sanitizeLoadedSettings(raw: unknown): UserSettings {
  if (!raw || typeof raw !== "object") {
    return { ...defaultUserSettings, updatedAt: Date.now() };
  }

  const obj = raw as Partial<UserSettings>;

  const outputDeviceId =
    typeof obj.outputDeviceId === "string" && obj.outputDeviceId.length > 0
      ? obj.outputDeviceId
      : defaultUserSettings.outputDeviceId;

  const volumeNormalization =
    typeof obj.volumeNormalization === "boolean"
      ? obj.volumeNormalization
      : defaultUserSettings.volumeNormalization;

  const crossfadeSeconds =
    typeof obj.crossfadeSeconds === "number" && !isNaN(obj.crossfadeSeconds)
      ? Math.max(0, Math.min(12, Math.round(obj.crossfadeSeconds)))
      : defaultUserSettings.crossfadeSeconds;

  const validStyles: VisualizerStyle[] = ["bars", "wave", "glow", "off"];
  const visualizerStyle =
    obj.visualizerStyle && validStyles.includes(obj.visualizerStyle)
      ? obj.visualizerStyle
      : defaultUserSettings.visualizerStyle;

  const notificationsEnabled =
    typeof obj.notificationsEnabled === "boolean"
      ? obj.notificationsEnabled
      : defaultUserSettings.notificationsEnabled;

  const validFontSizes = ["small", "medium", "large"] as const;
  const lyricsFontSize =
    obj.lyricsFontSize && validFontSizes.includes(obj.lyricsFontSize)
      ? obj.lyricsFontSize
      : defaultUserSettings.lyricsFontSize;

  return {
    id: "active-settings",
    outputDeviceId,
    volumeNormalization,
    crossfadeSeconds,
    visualizerStyle,
    notificationsEnabled,
    lyricsFontSize,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
  };
}

/**
 * Reads settings from local storage safely with fallback.
 */
function loadPersistedSettings(): UserSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...defaultUserSettings };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...defaultUserSettings };
    const parsed = JSON.parse(raw);
    return sanitizeLoadedSettings(parsed);
  } catch {
    return { ...defaultUserSettings };
  }
}

/**
 * Writes settings to local storage safely.
 */
function persistSettings(settings: UserSettings): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Graceful fallback if storage quota exceeded or disabled
  }
}

interface SettingsState {
  settings: UserSettings;
  availableDevices: AudioDevice[];
  setOutputDevice: (deviceId: string) => void;
  setVolumeNormalization: (enabled: boolean) => void;
  setCrossfade: (seconds: number) => void;
  setVisualizerStyle: (style: VisualizerStyle) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLyricsFontSize: (size: "small" | "medium" | "large") => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: loadPersistedSettings(),
  availableDevices: mockAudioDevices,

  setOutputDevice: (deviceId: string) => {
    const deviceExists = get().availableDevices.some((d) => d.id === deviceId);
    const validId = deviceExists ? deviceId : defaultUserSettings.outputDeviceId;
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        outputDeviceId: validId,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setVolumeNormalization: (enabled: boolean) => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        volumeNormalization: enabled,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setCrossfade: (seconds: number) => {
    const clamped = Math.max(0, Math.min(12, Math.round(seconds)));
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        crossfadeSeconds: clamped,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setVisualizerStyle: (style: VisualizerStyle) => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        visualizerStyle: style,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setNotificationsEnabled: (enabled: boolean) => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        notificationsEnabled: enabled,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setLyricsFontSize: (size: "small" | "medium" | "large") => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        lyricsFontSize: size,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  resetToDefaults: () => {
    const next: UserSettings = {
      ...defaultUserSettings,
      updatedAt: Date.now(),
    };
    persistSettings(next);
    set({ settings: next });
  },
}));

// Typed selector hooks
export const useUserSettings = () => useSettingsStore((state) => state.settings);
export const useAvailableAudioDevices = () => useSettingsStore((state) => state.availableDevices);
export const useActiveVisualizerStyle = () =>
  useSettingsStore((state) => state.settings.visualizerStyle);
