# Rationale: System media keys and transport controls

## Context

Desktop music players are expected to integrate deeply with the host operating system. When listeners switch between coding, writing, browsing, or gaming, they rely on dedicated multimedia keys on their keyboards (play, pause, next track, and previous track) to manage audio without hunting down the player window. On Windows, the System Media Transport Controls (SMTC) subsystem powers the volume flyout overlay and lock screen widget, showing the current track title, artist name, album title, album artwork, and interactive transport buttons.

Prior to this feature, Mutinhimira operated strictly within its own application window. While the native Rodio audio engine delivered high fidelity sound, pressing keyboard media keys while the window was in the background had no effect. The Windows volume slider did not display song metadata or artwork, and desktop listeners lacked standard lock screen controls.

To deliver an experience inspired by Windows Groove and modern desktop standards, Mutinhimira requires a robust bridge between the operating system media subsystem, the native Rust audio core, and the frontend playback queue store. This integration must operate reliably in the background, handle edge cases such as missing or WebP album artwork gracefully, avoid high frequency IPC flooding, allow users to opt out via settings, and preserve complete testability across browser and headless development environments.

## Options considered

### Option 1: Native souvlaki crate integration in Tauri managed state

Integrate the open source souvlaki crate in Rust. souvlaki wraps Windows System Media Transport Controls (WinRT SMTC) alongside macOS and Linux MPRIS abstractions. It attaches to the main window handle in Tauri managed state during setup, receiving transport button events and posting them through Tauri events to the frontend player store. The frontend exclusively drives metadata and status updates.

**Pros**:
* Provides clean, cross platform abstractions ready for future macOS and Linux expansion while delivering first class Windows SMTC fidelity today.
* Attaching directly to the main window handle in Tauri managed state avoids complex cross thread channel synchronization and thread affinity errors.
* Keeps AudioEngine completely decoupled from external operating system transport logic, respecting Clean Architecture boundaries.
* Synchronizing timeline position only on state transitions and seeks prevents IPC thrashing and reduces system wakeups.

**Cons**:
* Adds a third party Rust dependency to Cargo.toml.
* Requires format checking for album artwork because Windows SMTC natively supports PNG and JPEG rather than WebP.

### Option 2: Direct windows crate WinRT bindings with custom COM implementation

Implement Windows System Media Transport Controls directly using the official windows crate, calling `windows::Media::Control` and `windows::Storage::Streams` APIs natively.

**Pros**:
* Uses official Microsoft Windows crate bindings without third party wrapper layers.
* Provides fine grained control over specific Windows API flags and thumbnail stream memory buffers.

**Cons**:
* Requires substantial custom COM boilerplate, manual window subclassing, and complex lifetime management in Rust.
* Strictly locked to Windows, requiring a complete rewrite when expanding to macOS or Linux desktop platforms.
* Higher maintenance burden and risk of subtle threading issues across Windows versions.

### Option 3: Global keyboard shortcuts plugin without System Media Transport Controls

Use the official Tauri global shortcut plugin to register hotkeys for media keys (PlayPause, MediaTrackNext, MediaTrackPrevious), intercepting keystrokes globally without integrating with the Windows SMTC subsystem.

**Pros**:
* Very simple configuration using standard Tauri plugin hooks.
* Minimal native code additions.

**Cons**:
* Provides zero visual presence in the Windows volume flyout overlay and lock screen.
* Cannot display song titles, artist names, album art, or timeline progress sliders to the operating system.
* Fails to deliver the polished Windows Groove experience envisioned in the project scope.

## Rationale

Option 1 is the recommended approach for Mutinhimira. It satisfies all functional requirements by connecting hardware media keys and the Windows volume flyout overlay while keeping the native code clean, decoupled, and maintainable.

Directly writing WinRT COM boilerplate via Option 2 would add hundreds of lines of complex Windows specific code without user facing benefit, and would make future Linux and macOS support difficult. Option 3 solves only global hotkeys while leaving out the essential metadata flyout, failing the user experience goals of Phase 3.

By selecting souvlaki in Tauri managed state (Option 1), the application gains a proven and lightweight abstraction. Having the frontend player store drive metadata and status updates over IPC guarantees that the frontend queue remains the single source of truth without conflicting with native audio decoding. Restricting timeline updates to playback transitions and manual seeks allows Windows to interpolate playback time smoothly without wasting CPU cycles on rapid IPC events.