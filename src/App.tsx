import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Library } from "./pages/Library";
import { LikedSongs } from "./pages/LikedSongs";
import { Playlists } from "./pages/Playlists";
import { Albums } from "./pages/Albums";
import { Artists } from "./pages/Artists";
import { NavigationSidebar } from "./components/layout/NavigationSidebar";
import { PlayerFooter } from "./components/player/PlayerFooter";
import { QueueDrawer } from "./components/queue/QueueDrawer";
import { LyricsModal } from "./components/lyrics/LyricsModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { NowPlayingFullscreen } from "./components/fullscreen/NowPlayingFullscreen";
import { useActiveOverlay, useOverlayStore } from "./store/useOverlayStore";
import { useActivePlaylistId, usePlaylistStore, usePlaylists } from "./store/usePlaylistStore";
import { useAlbumStore } from "./store/useAlbumStore";
import { useArtistStore } from "./store/useArtistStore";

export function App() {
  const [activeNav, setActiveNav] = useState("Home");
  const playlists = usePlaylists();
  const activePlaylistId = useActivePlaylistId();
  const setActivePlaylistId = usePlaylistStore((state) => state.setActivePlaylistId);
  const setCreateModalOpen = usePlaylistStore((state) => state.setCreateModalOpen);
  const setActiveAlbumId = useAlbumStore((state) => state.setActiveAlbumId);

  const activeOverlay = useActiveOverlay();
  const toggleOverlay = useOverlayStore((state) => state.toggleOverlay);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useOverlayStore.getState().closeOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function testBackend() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke<string>("greet", { name: "Music Lover" });
      } catch {
        // Runs cleanly in browser preview mode
      }
    }
    testBackend();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden grid grid-rows-[1fr_96px] max-md:grid-rows-[1fr_84px] grid-cols-[232px_1fr] max-lg:grid-cols-[68px_1fr] bg-[#0b0706] text-[#f4ebe4] font-sans text-sm">
      {/* SVG Icon Symbols definition */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <symbol id="home" viewBox="0 0 24 24">
            <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
          </symbol>
          <symbol id="search" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </symbol>
          <symbol id="lib" viewBox="0 0 24 24">
            <path d="M5 4v16M10 4v16M15 5l4 15" />
          </symbol>
          <symbol id="heart" viewBox="0 0 24 24">
            <path d="M12 20c-6-4-8-7-8-10a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 3-2 6-8 10z" />
          </symbol>
          <symbol id="list" viewBox="0 0 24 24">
            <path d="M4 7h10M4 12h10M4 17h5M18 16V6l3 1" />
            <circle cx="16.5" cy="16.5" r="1.8" />
          </symbol>
          <symbol id="disc" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.5" />
          </symbol>
          <symbol id="user" viewBox="0 0 24 24">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
          </symbol>
          <symbol id="play" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M7 4.5l13 7.500-13 7.500z" />
          </symbol>
          <symbol id="pause" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M6 4h4.500v16H6zM13.500 4H18v16h-4.500z" />
          </symbol>
          <symbol id="prev" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M6 5h2v14H6zM20 5v14L9 12z" />
          </symbol>
          <symbol id="next" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M16 5h2v14h-2zM4 5l11 7L4 19z" />
          </symbol>
          <symbol id="shuffle" viewBox="0 0 24 24">
            <path d="M4 7h3c6 0 4 10 10 10h3M4 17h3c1.5 0 2.500-.7 3.300-1.700M14 8.700C14.800 7.700 15.800 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3" />
          </symbol>
          <symbol id="repeat" viewBox="0 0 24 24">
            <path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />
          </symbol>
          <symbol id="vol" viewBox="0 0 24 24">
            <path d="M4 9.500v5h3.500l4.500 4v-13l-4.500 4zM15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" />
          </symbol>
          <symbol id="bell" viewBox="0 0 24 24">
            <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.500 2h-15zM10 21h4" />
          </symbol>
          <symbol id="spark" viewBox="0 0 24 24">
            <path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z" />
          </symbol>
          <symbol id="star" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              stroke="none"
              d="M12 2c.5 5.500 2.500 8.500 8 10-5.500 1.500-7.500 4.500-8 10-.5-5.500-2.500-8.500-8-10 5.500-1.500 7.500-4.500 8-10z"
            />
          </symbol>
          <symbol id="cl" viewBox="0 0 24 24">
            <path d="M15 5l-7 7 7 7" />
          </symbol>
          <symbol id="cr" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" />
          </symbol>
          <symbol id="cd" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </symbol>
          <symbol id="plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </symbol>
          <symbol id="dots" viewBox="0 0 24 24">
            <circle fill="currentColor" cx="5" cy="12" r="1.4" />
            <circle fill="currentColor" cx="12" cy="12" r="1.4" />
            <circle fill="currentColor" cx="19" cy="12" r="1.4" />
          </symbol>
        </defs>
      </svg>

      {/* Adaptive Navigation Sidebar with automatic 68px icon rail */}
      <NavigationSidebar
        activeNav={activeNav}
        onNavigate={(navId) => {
          if (navId === "Playlists") setActivePlaylistId(null);
          if (navId === "Albums") setActiveAlbumId(null);
          if (navId === "Artists") useArtistStore.getState().setActiveArtistId(null);
          setActiveNav(navId);
        }}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={(id) => {
          setActivePlaylistId(id);
          setActiveNav("Playlists");
        }}
        onNewPlaylist={() => {
          setActiveNav("Playlists");
          setActivePlaylistId(null);
          setCreateModalOpen(true);
        }}
        activeOverlay={activeOverlay}
        onToggleSettings={() => toggleOverlay("settings")}
      />

      {/* Main Content Area */}
      <div className="col-start-2 row-start-1 overflow-y-auto overflow-x-hidden min-w-0">
        {activeNav === "Home" ? (
          <Home onNavigate={setActiveNav} />
        ) : activeNav === "Search" ? (
          <Search onNavigate={setActiveNav} />
        ) : activeNav === "Your Library" ? (
          <Library />
        ) : activeNav === "Liked Songs" ? (
          <LikedSongs onNavigate={setActiveNav} />
        ) : activeNav === "Playlists" ? (
          <Playlists />
        ) : activeNav === "Albums" ? (
          <Albums
            onNavigate={setActiveNav}
            onNavigateArtist={(artistId) => {
              useArtistStore.getState().setActiveArtistId(artistId);
              setActiveNav("Artists");
            }}
          />
        ) : activeNav === "Artists" ? (
          <Artists onNavigate={setActiveNav} />
        ) : (
          <main
            role="main"
            className="flex flex-col items-center justify-center h-full bg-[#110c0a] text-[#a89b91] gap-4 p-8"
          >
            <div className="w-14 h-14 rounded-full bg-[#f0a982]/10 text-[#f0a982] grid place-items-center">
              <svg className="i w-7 h-7" aria-hidden="true">
                <use href="#disc" />
              </svg>
            </div>
            <h2 className="text-xl text-[#f4ebe4] m-0 font-medium">{activeNav}</h2>
            <p className="m-0 text-sm max-w-[340px] text-center">
              This view is queued in the upcoming scope slice.
            </p>
            <button
              onClick={() => setActiveNav("Home")}
              className="px-5 py-2.5 rounded-full bg-[#f0a982] hover:bg-[#f5dec0] text-[#1c0f09] border-0 font-semibold cursor-pointer transition-all active:scale-95 shadow-md"
            >
              Return to Home
            </button>
          </main>
        )}
      </div>

      {/* Persistent Responsive Player Footer */}
      <PlayerFooter />

      {/* Overlays portal and backdrop */}
      {activeOverlay === "queue" && (
        <>
          <div
            role="presentation"
            onClick={() => useOverlayStore.getState().closeOverlay()}
            className="fixed inset-0 z-35 bg-black/45"
          />
          <QueueDrawer />
        </>
      )}
      {activeOverlay === "lyrics" && <LyricsModal />}
      {activeOverlay === "settings" && <SettingsModal />}
      {activeOverlay === "fullscreen" && <NowPlayingFullscreen />}
    </div>
  );
}

export default App;
