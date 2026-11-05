import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import type {
  AudioDevice,
  FullscreenViewMode,
  UserSettings,
  VisualizerStyle,
} from "../types/overlays";
import { defaultUserSettings, mockAudioDevices } from "../data/mockAudioDevices";
import { dbGetSetting, dbSetSetting } from "../services/db";

const SETTINGS_STORAGE_KEY = "Mutinhimira:settings:v1";
const SQLITE_SETTINGS_KEY = "app_settings";

/**
 * Validates and sanitizes raw data against the UserSettings schema.
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

  const validViewModes: FullscreenViewMode[] = ["artwork", "lyrics", "visualizer"];
  const fullscreenDefaultView =
    obj.fullscreenDefaultView && validViewModes.includes(obj.fullscreenDefaultView)
      ? obj.fullscreenDefaultView
      : defaultUserSettings.fullscreenDefaultView;

  const fullscreenAutoHideChrome =
    typeof obj.fullscreenAutoHideChrome === "boolean"
      ? obj.fullscreenAutoHideChrome
      : defaultUserSettings.fullscreenAutoHideChrome;

  return {
    id: "active-settings",
    outputDeviceId,
    volumeNormalization,
    crossfadeSeconds,
    visualizerStyle,
    notificationsEnabled,
    lyricsFontSize,
    fullscreenDefaultView,
    fullscreenAutoHideChrome,
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
 * Writes settings to local storage safely and synchronizes with SQLite in desktop environments.
 */
function persistSettings(settings: UserSettings): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Graceful fallback if storage quota exceeded or disabled
    }
  }

  if (isTauri()) {
    const serialized = JSON.stringify(settings);
    dbSetSetting(SQLITE_SETTINGS_KEY, serialized).catch((err) => {
      console.error("Failed to persist settings to SQLite:", err);
    });
    dbSetSetting("volume_normalization", String(settings.volumeNormalization)).catch(() => {});
    dbSetSetting("crossfade_seconds", String(settings.crossfadeSeconds)).catch(() => {});
    dbSetSetting("visualizer_style", settings.visualizerStyle).catch(() => {});
  }
}

interface SettingsState {
  settings: UserSettings;
  availableDevices: AudioDevice[];
  isHydrated: boolean;
  initializeSettings: () => Promise<void>;
  setOutputDevice: (deviceId: string) => void;
  setVolumeNormalization: (enabled: boolean) => void;
  setCrossfade: (seconds: number) => void;
  setVisualizerStyle: (style: VisualizerStyle) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLyricsFontSize: (size: "small" | "medium" | "large") => void;
  setFullscreenDefaultView: (mode: FullscreenViewMode) => void;
  setFullscreenAutoHideChrome: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: loadPersistedSettings(),
  availableDevices: mockAudioDevices,
  isHydrated: false,

  initializeSettings: async () => {
    if (!isTauri()) {
      set({ isHydrated: true });
      return;
    }

    try {
      const raw = await dbGetSetting(SQLITE_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeLoadedSettings(parsed);
        if (typeof window !== "undefined" && window.localStorage) {
          try {
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
          } catch {
            // Graceful fallback
          }
        }
        set({ settings: sanitized, isHydrated: true });
      } else {
        const current = get().settings;
        await dbSetSetting(SQLITE_SETTINGS_KEY, JSON.stringify(current));
        await dbSetSetting("volume_normalization", String(current.volumeNormalization));
        await dbSetSetting("crossfade_seconds", String(current.crossfadeSeconds));
        await dbSetSetting("visualizer_style", current.visualizerStyle);
        set({ isHydrated: true });
      }
    } catch (err) {
      console.error("Failed to initialize settings from SQLite:", err);
      set({ isHydrated: true });
    }
  },

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

  setFullscreenDefaultView: (mode: FullscreenViewMode) => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        fullscreenDefaultView: mode,
        updatedAt: Date.now(),
      };
      persistSettings(next);
      return { settings: next };
    });
  },

  setFullscreenAutoHideChrome: (enabled: boolean) => {
    set((state) => {
      const next: UserSettings = {
        ...state.settings,
        fullscreenAutoHideChrome: enabled,
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
export const useFullscreenDefaultView = () =>
  useSettingsStore((state) => state.settings.fullscreenDefaultView);
export const useFullscreenAutoHideChrome = () =>
  useSettingsStore((state) => state.settings.fullscreenAutoHideChrome);
export const useIsSettingsHydrated = () => useSettingsStore((state) => state.isHydrated);
