<![CDATA[<div align="center">
  <img src="public/logos/dark primary.png" alt="Mutinhimira" width="320" />
  <br/>
  <p><em>A lightweight, modern desktop music player for Windows &mdash; built with Tauri, Rust, and React.</em></p>

  [![CI](https://github.com/gamuchirai/mhanz/actions/workflows/ci.yml/badge.svg)](https://github.com/gamuchirai/mhanz/actions/workflows/ci.yml)
  [![Release](https://img.shields.io/github/v/release/gamuchirai/mhanz?label=download&logo=windows&logoColor=white)](https://github.com/gamuchirai/mhanz/releases/latest)
  [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
</div>

---

<div align="center">
  <img src="docs/assets/demo.gif" alt="Mutinhimira Demo" width="100%" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" />
</div>

---

## ✨ Features

| | |
|---|---|
| 🎵 **Local library scanner** | Recursively scans folders, reads ID3/FLAC/Ogg tags via Lofty, deduplicates cover art with SHA-256 |
| 🔍 **Instant search** | SQLite FTS5 full-text index with BM25 scoring returns results in &lt;50 ms |
| 🎧 **Gapless-ready playback** | Rodio + Symphonia audio engine on a dedicated Rust thread; supports MP3, FLAC, AAC, Ogg, WAV |
| 📊 **Live audio visualizer** | 32-band FFT spectrum via RustFFT, streamed from the native engine over a Tauri Channel |
| 🗂️ **Playlists & favorites** | Full CRUD with drag-to-reorder, persisted in SQLite across restarts |
| 🏷️ **Tag editor** | Edit title, artist, album, genre, year, track/disc number, and cover art — writes directly to the audio file via Lofty |
| 🎤 **Synchronized lyrics** | Parses embedded tags and `.lrc` sidecar files; auto-scrolls to the active line during playback |
| ⌨️ **OS media keys** | Windows SMTC integration via souvlaki — control playback from the taskbar, lock screen, and media keys |
| 🏠 **Smart home screen** | "Recently added", "Most played", "Best of an artist", and "Trending genre" recommendations derived from local listening history |
| 📐 **Responsive shell** | Collapsible sidebar, virtualized track tables (@tanstack/react-virtual), fluid grid layouts down to 640 × 480 px |

---

## 📸 Screenshots

| Home | Now Playing | Library & Visualizer |
|:---:|:---:|:---:|
| <img src="demo/public/screenshots/home.png" width="300" /> | <img src="demo/public/screenshots/now_playing.png" width="300" /> | <img src="demo/public/screenshots/visualiser.png" width="300" /> |

---

## 🏗️ Architecture

```
mutinhimira/
├── src/                    # React 19 + TypeScript frontend (Vite)
│   ├── components/         # Feature-scoped UI components
│   ├── pages/              # Top-level route views
│   ├── store/              # Zustand state slices
│   ├── services/           # Tauri IPC client wrappers
│   ├── hooks/              # Shared React hooks
│   └── types/              # Shared TypeScript types
└── src-tauri/              # Rust backend (Tauri v2)
    ├── src/
    │   ├── audio/          # Rodio engine, FFT visualizer, gapless prep
    │   ├── scanner/        # Walkdir + Rayon parallel scanner, Lofty metadata
    │   ├── tagger/         # In-place tag editor with file lock handling
    │   ├── db/             # rusqlite repositories, migrations, WAL mode
    │   └── commands/       # Tauri IPC command handlers
    └── migrations/         # SQL migration files (V001–V005)
```

**Clean Architecture layers** — domain → application → infrastructure → presentation. Outer layers depend on inner layers; the domain has zero external imports.

**Key design decisions:**
- Audio runs on a dedicated OS thread to prevent UI jank
- SQLite in WAL mode allows concurrent reads during scans
- Cover art is content-addressed (SHA-256) so duplicates are never stored twice
- FFT data streams via a Tauri `Channel` only while the visualizer is on screen, then the worker stops

---

## 🚀 Download & Install

**[⬇ Download the latest Windows installer →](https://github.com/gamuchirai/mhanz/releases/latest)**

Grab `Mutinhimira_x.x.x_x64-setup.exe` (NSIS) or `Mutinhimira_x.x.x_x64_en-US.msi` from the Releases page. No runtime or dependency installation required — everything is bundled.

> **System requirement:** Windows 10 version 1803 or later (WebView2 is included in Windows 11; on older Windows 10 builds it installs automatically).

---

## 🛠️ Build from Source

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Rust | stable (via [rustup](https://rustup.rs)) |
| WebView2 | Bundled with Windows 11; auto-installed on Windows 10 |

### Steps

```bash
# 1. Clone
git clone https://github.com/gamuchirai/mhanz.git
cd mhanz

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (hot-reload UI + native backend)
npm run tauri dev

# 4. Build a production installer
npm run tauri build
# → Outputs: src-tauri/target/release/bundle/
```

---

## 🧪 Tests

```bash
# Frontend unit tests (Vitest)
npm test

# Rust unit tests
cd src-tauri && cargo test
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | [Tauri v2](https://tauri.app) |
| UI framework | React 19, TypeScript 5.7, Vite 8 |
| Styling | Tailwind CSS v4 (Midnight design tokens) |
| State | Zustand 5 |
| Audio engine | [Rodio](https://github.com/RustAudio/rodio) + [Symphonia](https://github.com/pdeljanov/Symphonia) |
| Metadata | [Lofty](https://github.com/Serial-ATA/lofty-rs) |
| FFT | [RustFFT](https://github.com/ejmahler/RustFFT) |
| Database | SQLite via [rusqlite](https://github.com/rusqlite/rusqlite) (bundled, WAL, FTS5) |
| OS integration | [souvlaki](https://github.com/Sinono3/souvlaki) (SMTC / media keys) |
| List virtualization | [@tanstack/react-virtual](https://tanstack.com/virtual) |

---

## 📄 License

MIT © Mutinhimira Contributors
]]>
---

## ✨ Features

| | |
|---|---|
| 🎵 **Local library scanner** | Recursively scans folders, reads ID3/FLAC/Ogg tags via Lofty, deduplicates cover art with SHA-256 |
| 🔍 **Instant search** | SQLite FTS5 full-text index with BM25 scoring returns results in &lt;50 ms |
| 🎧 **Gapless-ready playback** | Rodio + Symphonia audio engine on a dedicated Rust thread; supports MP3, FLAC, AAC, Ogg, WAV |
| 📊 **Live audio visualizer** | 32-band FFT spectrum via RustFFT, streamed from the native engine over a Tauri Channel |
| 🗂️ **Playlists & favorites** | Full CRUD with drag-to-reorder, persisted in SQLite across restarts |
| 🏷️ **Tag editor** | Edit title, artist, album, genre, year, track/disc number, and cover art — writes directly to the audio file via Lofty |
| 🎤 **Synchronized lyrics** | Parses embedded tags and `.lrc` sidecar files; auto-scrolls to the active line during playback |
| ⌨️ **OS media keys** | Windows SMTC integration via souvlaki — control playback from the taskbar, lock screen, and media keys |
| 🏠 **Smart home screen** | "Recently added", "Most played", "Best of an artist", and "Trending genre" recommendations derived from local listening history |
| 📐 **Responsive shell** | Collapsible sidebar, virtualized track tables (@tanstack/react-virtual), fluid grid layouts down to 640 × 480 px |

---

## 📸 Screenshots

| Home | Now Playing | Library & Visualizer |
|:---:|:---:|:---:|
| <img src="demo/public/screenshots/home.png" width="300" /> | <img src="demo/public/screenshots/now_playing.png" width="300" /> | <img src="demo/public/screenshots/visualiser.png" width="300" /> |

---

## 🏗️ Architecture

```
mutinhimira/
├── src/                    # React 19 + TypeScript frontend (Vite)
│   ├── components/         # Feature-scoped UI components
│   ├── pages/              # Top-level route views
│   ├── store/              # Zustand state slices
│   ├── services/           # Tauri IPC client wrappers
│   ├── hooks/              # Shared React hooks
│   └── types/              # Shared TypeScript types
└── src-tauri/              # Rust backend (Tauri v2)
    ├── src/
    │   ├── audio/          # Rodio engine, FFT visualizer, gapless prep
    │   ├── scanner/        # Walkdir + Rayon parallel scanner, Lofty metadata
    │   ├── tagger/         # In-place tag editor with file lock handling
    │   ├── db/             # rusqlite repositories, migrations, WAL mode
    │   └── commands/       # Tauri IPC command handlers
    └── migrations/         # SQL migration files (V001–V005)
```

**Clean Architecture layers** — domain → application → infrastructure → presentation. Outer layers depend on inner layers; the domain has zero external imports.

**Key design decisions:**
- Audio runs on a dedicated OS thread to prevent UI jank
- SQLite in WAL mode allows concurrent reads during scans
- Cover art is content-addressed (SHA-256) so duplicates are never stored twice
- FFT data streams via a Tauri `Channel` only while the visualizer is on screen, then the worker stops

---

## 🚀 Download & Install

**[⬇ Download the latest Windows installer →](https://github.com/gamuchirai/mhanz/releases/latest)**

Grab `Mutinhimira_x.x.x_x64-setup.exe` (NSIS) or `Mutinhimira_x.x.x_x64_en-US.msi` from the Releases page. No runtime or dependency installation required — everything is bundled.

> **System requirement:** Windows 10 version 1803 or later (WebView2 is included in Windows 11; on older Windows 10 builds it installs automatically).

---

## 🛠️ Build from Source

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Rust | stable (via [rustup](https://rustup.rs)) |
| WebView2 | Bundled with Windows 11; auto-installed on Windows 10 |

### Steps

```bash
# 1. Clone
git clone https://github.com/gamuchirai/mhanz.git
cd mhanz

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (hot-reload UI + native backend)
npm run tauri dev

# 4. Build a production installer
npm run tauri build
# → Outputs: src-tauri/target/release/bundle/
```

---

## 🧪 Tests

```bash
# Frontend unit tests (Vitest)
npm test

# Rust unit tests
cd src-tauri && cargo test
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | [Tauri v2](https://tauri.app) |
| UI framework | React 19, TypeScript 5.7, Vite 8 |
| Styling | Tailwind CSS v4 (Midnight design tokens) |
| State | Zustand 5 |
| Audio engine | [Rodio](https://github.com/RustAudio/rodio) + [Symphonia](https://github.com/pdeljanov/Symphonia) |
| Metadata | [Lofty](https://github.com/Serial-ATA/lofty-rs) |
| FFT | [RustFFT](https://github.com/ejmahler/RustFFT) |
| Database | SQLite via [rusqlite](https://github.com/rusqlite/rusqlite) (bundled, WAL, FTS5) |
| OS integration | [souvlaki](https://github.com/Sinono3/souvlaki) (SMTC / media keys) |
| List virtualization | [@tanstack/react-virtual](https://tanstack.com/virtual) |

---

## 📄 License

MIT © Mutinhimira Contributors
]]>
