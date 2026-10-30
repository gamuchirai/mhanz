import type { MouseEvent } from "react";
import type { Playlist } from "../../types/playlist";

interface NavigationSidebarProps {
  activeNav: string;
  onNavigate: (navId: string) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onNewPlaylist: () => void;
  activeOverlay: string | null;
  onToggleSettings: () => void;
}

export function NavigationSidebar({
  activeNav,
  onNavigate,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onNewPlaylist,
  activeOverlay,
  onToggleSettings,
}: NavigationSidebarProps) {
  const navItems = [
    { id: "Home", icon: "#home" },
    { id: "Search", icon: "#search" },
    { id: "Your Library", icon: "#lib" },
    { id: "Liked Songs", icon: "#heart" },
    { id: "Playlists", icon: "#list" },
    { id: "Albums", icon: "#disc" },
    { id: "Artists", icon: "#user" },
  ];

  return (
    <aside
      role="navigation"
      aria-label="Main sidebar"
      className="col-start-1 row-span-2 w-[232px] max-lg:w-[68px] h-full bg-[#0b0706] border-r border-white/5 py-7 px-4 max-lg:px-2 max-lg:py-5 flex flex-col gap-1 select-none overflow-y-auto overflow-x-hidden transition-all duration-200"
    >
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center mb-7 px-2 transition-all">
        {/* Expanded Lockup: Full wordmark SVG visible on wide viewports (>=1024px) */}
        <img
          src="/logos/primary-dark.svg"
          alt="Mutinhimira"
          data-testid="brand-logo-expanded"
          className="h-8 w-auto aspect-[2206/499] max-lg:hidden object-contain select-none"
          draggable={false}
        />
        {/* Collapsed Symbol: Standalone emblem visible on compact rail (<1024px) */}
        <img
          src="/logos/standalone-dark.svg"
          alt="Mutinhimira symbol"
          data-testid="brand-logo-collapsed"
          className="w-7 h-7 hidden max-lg:block object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Main Navigation links */}
      <nav className="flex flex-col gap-1 text-[#a89b91]">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <a
              key={item.id}
              href="#"
              title={item.id}
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              className={`flex items-center gap-3.5 max-lg:gap-0 max-lg:justify-center px-3.5 py-2.5 max-lg:px-2 rounded-xl transition-all duration-150 cursor-pointer ${isActive
                ? "bg-gradient-to-r from-[rgba(240,169,130,0.22)] to-[rgba(240,169,130,0.06)] text-[#f4ebe4] shadow-sm font-medium"
                : "text-[#a89b91] hover:text-[#f4ebe4] hover:bg-white/[0.04]"
                }`}
            >
              <svg
                className="i w-[18px] h-[18px] max-lg:w-5 max-lg:h-5 shrink-0"
                aria-hidden="true"
              >
                <use href={item.icon} />
              </svg>
              <span className="max-lg:hidden text-[13.5px] truncate">{item.id}</span>
            </a>
          );
        })}
      </nav>

      {/* Playlists section header */}
      <div className="flex items-center justify-between mx-3.5 max-lg:mx-auto mt-7 mb-2 text-[#a89b91] text-[11px] tracking-[0.14em]">
        <span className="max-lg:hidden font-semibold">YOUR PLAYLISTS</span>
        <button
          aria-label="New playlist"
          title="Create new playlist"
          onClick={onNewPlaylist}
          className="bg-transparent border-0 p-1 text-[#a89b91] hover:text-[#f4ebe4] cursor-pointer grid place-items-center rounded-md hover:bg-white/5 transition-colors"
        >
          <svg className="i w-4 h-4" aria-hidden="true">
            <use href="#plus" />
          </svg>
        </button>
      </div>

      {/* Playlists list */}
      <div className="flex flex-col gap-1 text-[#f4ebe4] overflow-y-auto max-h-[260px] max-lg:max-h-[200px]">
        {playlists.map((playlist) => {
          const isSelected = activeNav === "Playlists" && activePlaylistId === playlist.id;
          return (
            <a
              key={playlist.id}
              href="#"
              title={playlist.title}
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                onSelectPlaylist(playlist.id);
              }}
              className={`flex items-center gap-3 max-lg:gap-0 max-lg:justify-center px-3 max-lg:px-1.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${isSelected
                ? "bg-[rgba(240,169,130,0.12)] text-[#f0a982]"
                : "text-[#f4ebe4] hover:bg-white/[0.04]"
                }`}
            >
              <span
                className="w-8 h-8 max-lg:w-7 max-lg:h-7 rounded-md shrink-0 relative overflow-hidden flex items-center justify-center text-xs shadow-inner"
                style={{ background: playlist.coverGradient }}
              >
                {playlist.coverUrl && (
                  <img
                    src={playlist.coverUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </span>
              <span className="max-lg:hidden whitespace-nowrap overflow-hidden text-ellipsis text-[13px]">
                {playlist.title}
              </span>
            </a>
          );
        })}
      </div>

      {/* User profile & Settings */}
      <div className="mt-auto flex items-center justify-between max-lg:flex-col max-lg:gap-3 px-3 max-lg:px-1 py-2.5 border-t border-white/5">
        <a
          href="#"
          title="madebyadah"
          onClick={(e: MouseEvent) => e.preventDefault()}
          className="flex items-center gap-3 max-lg:gap-0 min-w-0 hover:opacity-90 transition-opacity"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6b5548] to-[#241a16] shrink-0 border border-white/10" />
          <span className="max-lg:hidden overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#f4ebe4]">
            madebyadah
          </span>
        </a>

        <button
          aria-label="Open audio preferences settings"
          title="Settings"
          onClick={onToggleSettings}
          className={`border-0 p-1.5 cursor-pointer rounded-lg grid place-items-center transition-colors duration-150 ${activeOverlay === "settings"
            ? "text-[#f0a982] bg-white/10"
            : "text-[#a89b91] hover:text-[#f4ebe4] hover:bg-white/5"
            }`}
        >
          <svg className="i w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
