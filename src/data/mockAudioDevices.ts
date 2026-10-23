import type { AudioDevice, UserSettings } from "../types/overlays";

/**
 * List of available mock audio output devices.
 */
export const mockAudioDevices: AudioDevice[] = [
  {
    id: "dev-default",
    name: "System Default Output",
    isDefault: true,
    sampleRate: 48000,
    channels: 2,
  },
  {
    id: "dev-headphones",
    name: "High Resolution Headphones (Realtek)",
    isDefault: false,
    sampleRate: 96000,
    channels: 2,
  },
  {
    id: "dev-speakers",
    name: "Studio Reference Monitors (USB Audio)",
    isDefault: false,
    sampleRate: 192000,
    channels: 2,
  },
  {
    id: "dev-bluetooth",
    name: "Wireless ANC Earbuds (AAC)",
    isDefault: false,
    sampleRate: 44100,
    channels: 2,
  },
];

/**
 * Pristine default user audio preferences.
 */
export const defaultUserSettings: UserSettings = {
  id: "active-settings",
  outputDeviceId: "dev-default",
  volumeNormalization: true,
  crossfadeSeconds: 4,
  visualizerStyle: "bars",
  notificationsEnabled: true,
  lyricsFontSize: "medium",
  updatedAt: Date.now(),
};
