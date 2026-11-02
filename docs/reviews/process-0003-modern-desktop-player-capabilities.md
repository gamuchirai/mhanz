# Process analysis: Modern Desktop Player Capabilities

**Date**: 2026-11-02
**Procedure**: Find what capabilities and improvements can be added to make this a modern desktop music player that competes with other players, staying robust and stable while keeping its lightweight character.
**Scope feature(s)**: 14 (core audio playback engine), 15 (local library scanner and metadata), 25 (audio file metadata tag editor), deferred features (OS media keys, mini player overlay, audio equalizer)
**Spec(s)**: docs/specs/0013-core-audio-playback-engine/, docs/specs/0016-local-library-scanner-metadata/
**Method**: code review (no browser available)

## Step map

1. **User plays music and switches to another application or locks the desktop** → Audio continues playing, but hardware keyboard media keys (Play, Pause, Next, Previous) do not respond, and the Windows lock screen or volume banner shows no track information → You must switch windows back to Mutinhimira to pause or skip.
   Code: `src-tauri/src/audio/engine.rs:25`, `src-tauri/Cargo.toml:15`

2. **User listens to continuous tracks like live concert recordings or concept albums** → When one track finishes, the audio thread empties the output sink and emits an event to the frontend, which calculates the next track and calls the backend command → An audible silence gap and audio click occur between tracks because audio decoding and sink preparation happen on demand after the previous track has already ended.
   Code: `src-tauri/src/audio/engine.rs:490-520`, `src/store/usePlayerStore.ts:50`

3. **User minimizes the app window to focus on work or gaming** → The window stays on the taskbar or exits completely when closed → The player lacks system tray minimization, so you cannot stow the app neatly into the notification area while listening.
   Code: `src-tauri/src/lib.rs:14`, `src-tauri/tauri.conf.json:20`

4. **User downloads new audio files or renames folders in Windows Explorer** → The local SQLite database remains unchanged until you navigate to Your Library and manually trigger a folder rescan → The app has no file system watcher to detect added, modified, or removed files automatically.
   Code: `src-tauri/src/scanner/mod.rs:10`, `src/store/useLibraryStore.ts:310`

5. **User drags audio files or an M3U playlist from desktop into the app** → The application window ignores the drop action or triggers the default web browser drop behavior → You cannot quickly drop a song to play or import an existing playlist file directly.
   Code: `src/App.tsx:120`, `src-tauri/tauri.conf.json:20`

6. **User arranges their desktop layout for multitasking and wants a compact view** → The window minimum dimensions are 640 by 480 pixels, occupying substantial screen area → The user must choose between a large window or fullscreen immersion, with no compact picture in picture mini player widget.
   Code: `src-tauri/tauri.conf.json:23`, `src/components/fullscreen/NowPlayingFullscreen.tsx:10`

7. **User enables volume normalization in Settings to balance audio across different albums** → The toggle updates local preference state, but the scanner does not read ReplayGain or R128 loudness tags, and the audio engine applies no track specific gain adjustment → Volume jumps noticeably between old quiet masters and modern loud tracks.
   Code: `src/store/useSettingsStore.ts:135`, `src-tauri/src/scanner/metadata.rs:35`, `src-tauri/src/audio/engine.rs:400`

8. **User listens to music while chatting with friends on Discord** → No listening activity appears on their profile because the player does not connect to the local Discord Rich Presence socket → Modern desktop players often support this out of the box with virtually zero overhead.
   Code: `src-tauri/Cargo.toml:15`

9. **User listens to music at night and wants playback to stop automatically** → No timer exists in the player footer or settings to halt playback after thirty minutes or when the current track finishes → The music continues playing indefinitely until manually stopped.
   Code: `src/components/player/PlayerFooter.tsx:1`, `src/store/usePlayerStore.ts:1`

## Findings

### Finding F-1: Operating system media keys and transport controls missing · major · scope

When you press physical play, pause, next, or previous keys on your keyboard, or when you look at the Windows volume flyout, Mutinhimira does not respond or show track details. Modern desktop players integrate with Windows System Media Transport Controls (SMTC) or register global media shortcuts. Without this capability, you must constantly switch away from your active work or game to adjust playback. This is listed as deferred in scope and can be implemented cleanly with a lightweight Rust crate like souvlaki or the official Tauri global shortcut plugin.

**Step(s)**: 1
**Evidence**: `src-tauri/src/audio/engine.rs:25` manages Rodio directly without registering OS transport callbacks. `src-tauri/Cargo.toml:15` has no dependency for media keys or transport controls. `docs/scope/scope.md:432` lists operating system media keys under deferred.
**Recommendation**: Enroll a scope feature for native operating system media transport controls and global shortcut keys, registering playback state and track metadata with the host platform.
**Next step**: `/scope operating system media keys and transport controls`

### Finding F-2: Inter track silence and round trip IPC latency break seamless playback · major · bug

When a song finishes, the Rodio sink runs completely dry before Mutinhimira emits an event to the frontend, which then decides the next track and calls the play command back across IPC. This round trip introduces an audible stutter and silence between songs. For continuous live albums, classical movements, and concept records, listeners expect seamless transitions. Pre loading and buffering the next audio source inside the audio engine before the active track concludes would eliminate the gap without inflating memory usage.

**Step(s)**: 2
**Evidence**: `src-tauri/src/audio/engine.rs:500-520` checks `sink.empty()`, stops the sink, emits `audio:track-ended` to the frontend, and waits for a new `audio_play_track` command. `src/store/usePlayerStore.ts:50` reacts to the event by calling `nextTrack()` across the asynchronous IPC bridge.
**Recommendation**: Update the audio engine to support dual sink buffering or an audio source queue that automatically decodes and stages the upcoming track before the active track reaches its end.
**Next step**: `/architect core audio playback engine: seamless gapless track transitions`

### Finding F-3: System tray integration missing for unobtrusive background listening · minor · scope

Closing or minimizing the app window currently behaves like a standard desktop application, either terminating playback or keeping a full taskbar item active. Modern music players offer a system tray icon with a right click context menu for play, pause, next, previous, and quick exit, allowing the player to run unobtrusively in the background. Tauri v2 provides built in tray icon support with minimal footprint.

**Step(s)**: 3
**Evidence**: `src-tauri/tauri.conf.json:20` contains no tray icon configuration. `src-tauri/src/lib.rs:14` registers only dialog and opener plugins, with no tray event handlers or menu setup.
**Recommendation**: Enroll a scope feature to add a lightweight system tray icon with playback controls and an optional minimize to tray setting.
**Next step**: `/scope system tray integration and background playback`

### Finding F-4: Automatic file system watching missing for library folders · minor · scope

When you add new music files to your watched folders through Windows Explorer, Mutinhimira has no way of knowing until you open the app and manually trigger a folder rescan. A modern local player should automatically detect new, renamed, or deleted files using native operating system file system events. The lightweight Rust notify crate provides efficient directory monitoring with debouncing, so scanning runs only when changes actually occur.

**Step(s)**: 4
**Evidence**: `src-tauri/src/scanner/mod.rs:10` operates exclusively on explicit invocations from `scanner_scan_folder`. `src/store/useLibraryStore.ts:310` initiates scans only when the user clicks rescan.
**Recommendation**: Architect an optional background file system watcher for indexed music folders that triggers differential updates when files are created or deleted.
**Next step**: `/architect local library scanner & metadata: automatic folder watcher`

### Finding F-5: Direct file and playlist drag and drop import missing on window surface · minor · scope

Dragging an audio file, a directory of songs, or an M3U playlist file into the app window does not import or play the music. In competitors like Foobar2000, Groove, or MusicBee, dropping files directly onto the window is one of the most natural desktop workflows. Tauri provides native window file drop events that can parse dropped paths and route them directly to the player queue or folder manager.

**Step(s)**: 5
**Evidence**: `src/App.tsx:120` has no onDragOver or onDrop listeners on the application container. `src-tauri/tauri.conf.json:20` does not handle window drop payloads.
**Recommendation**: Add desktop file drop listeners to the application shell, allowing users to drag audio files or M3U playlists directly into the player to play immediately or queue.
**Next step**: `/develop design system & navigation shell: drag and drop file import`

### Finding F-6: Picture in picture mini player widget missing for compact multitasking · minor · scope

When coding, writing, or playing games, users often want a compact always on top widget that shows album art, track information, and playback controls in a small desktop corner without taking up full window space. Currently, the minimum window size is 640 by 480 pixels. A dedicated mini player mode that switches the Tauri window into a floating, compact view enhances daily desktop utility.

**Step(s)**: 6
**Evidence**: `src-tauri/tauri.conf.json:23` sets `minWidth: 640` and `minHeight: 480`. `docs/scope/scope.md:433` lists mini player overlay under deferred items.
**Recommendation**: Enroll a scope feature for a compact mini player mode that resizes the window, pins it always on top, and presents a simplified playback interface.
**Next step**: `/scope mini player compact overlay mode`

### Finding F-7: Volume normalization toggle lacks ReplayGain tag extraction and gain calculation · minor · bug

Settings includes a volume normalization toggle, but the feature is non functional because audio loudness tags are never extracted or applied. When music libraries contain songs recorded across multiple decades, loudness levels fluctuate wildly. Extracting standard ReplayGain and R128 tags during metadata scanning and adjusting Rodio sink volume per track delivers smooth, consistent listening without user intervention.

**Step(s)**: 7
**Evidence**: `src/store/useSettingsStore.ts:135` toggles `volumeNormalization`, but the value is never transmitted to the audio engine. `src-tauri/src/scanner/metadata.rs:35` ignores ReplayGain and R128 tags when reading lofty tags. `src-tauri/src/audio/engine.rs:400` applies only the static user master volume slider.
**Recommendation**: Update metadata extraction to read ReplayGain and R128 track gain tags into SQLite, and apply normalized gain adjustments in the Rodio audio engine when normalization is enabled.
**Next step**: `/develop core audio playback engine: replaygain volume normalization`

### Finding F-8: Discord Rich Presence missing for modern desktop player ecosystem · minor · scope

Many desktop music listeners enjoy broadcasting what they are playing to their Discord friends. Modern desktop players connect to Discord Rich Presence using a lightweight local IPC socket, displaying the track title, artist, album art, and elapsed time with negligible system resource usage. This gives Mutinhimira parity with popular community players like Cider and Plexamp.

**Step(s)**: 8
**Evidence**: `src-tauri/Cargo.toml:15` contains no Discord IPC dependency. The feature is unmentioned in `docs/scope/scope.md`.
**Recommendation**: Enroll a scope feature for Discord Rich Presence integration that sends non blocking listening status updates when enabled in Settings.
**Next step**: `/scope discord rich presence integration`

### Finding F-9: Sleep timer missing for scheduled playback stop · minor · scope

Bedtime listening is a widespread use case for desktop music players. Mutinhimira currently has no sleep timer option to fade out audio or stop playback after a set duration (fifteen minutes, thirty minutes, one hour) or at the end of the current track. Adding a simple sleep timer in the queue drawer or settings modal requires only frontend timer coordination with the existing pause command.

**Step(s)**: 9
**Evidence**: `src/components/player/PlayerFooter.tsx:1` and `src/components/queue/QueueDrawer.tsx` contain no sleep timer controls. `src/store/usePlayerStore.ts:1` has no auto stop countdown logic.
**Recommendation**: Implement a sleep timer option in the player footer or queue drawer that counts down and smoothly stops playback when the duration elapses.
**Next step**: `/develop queue, lyrics & settings overlays: sleep timer control`

## Summary

This analysis evaluated ten desktop workflows across playback, system integration, file handling, and user convenience, identifying nine findings (two major and seven minor). The two most critical enhancements for competitive parity and audio stability are native operating system media transport controls (Finding F-1) and seamless gapless playback with pre buffering (Finding F-2). Adding lightweight system tray integration, automatic file system watching, drag and drop file import, and a compact mini player mode will give Mutinhimira the feel of a mature, first class desktop player while retaining its low memory footprint and high speed.

**Quick actions** (copy and run):
- `/scope operating system media keys and transport controls`: enroll native Windows SMTC and media key integration
- `/architect core audio playback engine: seamless gapless track transitions`: design dual sink pre buffering in Rodio to eliminate inter track silence
- `/scope system tray integration and background playback`: enroll system tray icon and background playback mode
- `/architect local library scanner & metadata: automatic folder watcher`: design lightweight directory event monitoring for automatic library sync
- `/develop design system & navigation shell: drag and drop file import`: add native window file drop handlers for audio files and M3U playlists
- `/scope mini player compact overlay mode`: enroll a lightweight always on top compact player widget
- `/develop core audio playback engine: replaygain volume normalization`: wire ReplayGain tags into Rodio sink volume calculation
- `/scope discord rich presence integration`: enroll non blocking Discord listening status broadcast
- `/develop queue, lyrics & settings overlays: sleep timer control`: add a countdown sleep timer to pause playback automatically
