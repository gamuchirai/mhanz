import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useSettingsStore } from "../store/useSettingsStore";
import { AudioDeviceSelector } from "../components/settings/AudioDeviceSelector";
import { defaultUserSettings, mockAudioDevices } from "../data/mockAudioDevices";
import * as dbService from "../services/db";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
  invoke: vi.fn(),
}));

describe("Settings Store SQLite Persistence and UI Integration (Finding P2-F2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    useSettingsStore.setState({
      settings: { ...defaultUserSettings, updatedAt: Date.now() },
      availableDevices: mockAudioDevices,
      isHydrated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates user settings from SQLite when isTauri is true", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    const storedSettings = {
      id: "active-settings",
      outputDeviceId: "dev-headphones",
      volumeNormalization: false,
      crossfadeSeconds: 9,
      visualizerStyle: "wave",
      notificationsEnabled: false,
      lyricsFontSize: "large",
      fullscreenDefaultView: "lyrics",
      fullscreenAutoHideChrome: false,
      updatedAt: 123456789,
    };

    const dbGetSpy = vi
      .spyOn(dbService, "dbGetSetting")
      .mockResolvedValueOnce(JSON.stringify(storedSettings));

    await act(async () => {
      await useSettingsStore.getState().initializeSettings();
    });

    expect(dbGetSpy).toHaveBeenCalledWith("app_settings");
    const state = useSettingsStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.settings.outputDeviceId).toBe("dev-headphones");
    expect(state.settings.volumeNormalization).toBe(false);
    expect(state.settings.crossfadeSeconds).toBe(9);
    expect(state.settings.visualizerStyle).toBe("wave");
    expect(state.settings.lyricsFontSize).toBe("large");

    // Also ensures localStorage was populated as secondary cache
    const cached = window.localStorage.getItem("Mutinhimira:settings:v1");
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!).crossfadeSeconds).toBe(9);
  });

  it("writes initial default settings to SQLite if no record exists", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    vi.spyOn(dbService, "dbGetSetting").mockResolvedValueOnce(null);
    const dbSetSpy = vi.spyOn(dbService, "dbSetSetting").mockResolvedValue(true);

    await act(async () => {
      await useSettingsStore.getState().initializeSettings();
    });

    expect(dbSetSpy).toHaveBeenCalledWith(
      "app_settings",
      expect.stringContaining('"outputDeviceId":"dev-default"')
    );
    expect(dbSetSpy).toHaveBeenCalledWith("volume_normalization", "true");
    expect(dbSetSpy).toHaveBeenCalledWith("crossfade_seconds", "4");
    expect(dbSetSpy).toHaveBeenCalledWith("visualizer_style", "bars");
    expect(useSettingsStore.getState().isHydrated).toBe(true);
  });

  it("falls back gracefully to defaults on corrupt SQLite JSON data", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    vi.spyOn(dbService, "dbGetSetting").mockResolvedValueOnce("invalid-json{not_parsed");

    await act(async () => {
      await useSettingsStore.getState().initializeSettings();
    });

    const state = useSettingsStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.settings.crossfadeSeconds).toBe(4);
    expect(state.settings.outputDeviceId).toBe("dev-default");
  });

  it("persists settings changes to SQLite via dbSetSetting when in Tauri mode", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    const dbSetSpy = vi.spyOn(dbService, "dbSetSetting").mockResolvedValue(true);

    act(() => {
      useSettingsStore.getState().setCrossfade(10);
    });

    expect(dbSetSpy).toHaveBeenCalledWith(
      "app_settings",
      expect.stringContaining('"crossfadeSeconds":10')
    );
    expect(dbSetSpy).toHaveBeenCalledWith("crossfade_seconds", "10");

    act(() => {
      useSettingsStore.getState().setVolumeNormalization(false);
    });

    expect(dbSetSpy).toHaveBeenCalledWith(
      "app_settings",
      expect.stringContaining('"volumeNormalization":false')
    );
    expect(dbSetSpy).toHaveBeenCalledWith("volume_normalization", "false");

    act(() => {
      useSettingsStore.getState().setVisualizerStyle("glow");
    });

    expect(dbSetSpy).toHaveBeenCalledWith(
      "app_settings",
      expect.stringContaining('"visualizerStyle":"glow"')
    );
    expect(dbSetSpy).toHaveBeenCalledWith("visualizer_style", "glow");
  });

  it("AudioDeviceSelector displays Coming Soon indicator and informational label", () => {
    render(<AudioDeviceSelector />);

    expect(screen.getByText("Audio Output Device")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(
      screen.getByText(/System default audio output is active/i)
    ).toBeInTheDocument();

    const headphoneOption = screen.getByText("High Resolution Headphones (Realtek)");
    fireEvent.click(headphoneOption);
    expect(useSettingsStore.getState().settings.outputDeviceId).toBe("dev-headphones");
  });
});

