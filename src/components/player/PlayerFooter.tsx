import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useOverlayStore } from "../../store/useOverlayStore";
import { MarqueeText } from "../home/MarqueeText";
import { Scrubber } from "./Scrubber";

interface PlayerFooterProps {
  className?: string;
}

export function PlayerFooter({ className = "" }: PlayerFooterProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);

  const activeOverlay = useOverlayStore((state) => state.activeOverlay);
  const toggleOverlay = useOverlayStore((state) => state.toggleOverlay);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const toggleLike = usePlayerStore((state) => state.toggleLike);

  const [imageError, setImageError] = useState(false);
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!volumePopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(e.target as Node)) {
        setVolumePopoverOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVolumePopoverOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [volumePopoverOpen]);

  const isLiked = currentTrack ? Boolean(likedTrackIds[currentTrack.id]) : false;
  const defaultBg = "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)";

  return (
    <footer
      role="contentinfo"
      aria-label="Now playing bar"
      className={`col-start-2 row-start-2 mx-6 mb-4 max-lg:mx-3 max-lg:mb-2 px-6 max-lg:px-4 py-2 rounded-2xl border border-white/10 bg-[#18110f] grid grid-cols-[1fr_auto_1.4fr] max-[900px]:grid-cols-[auto_1fr_auto] items-center gap-6 max-lg:gap-3 select-none transition-all duration-150 z-20 ${className}`}
    >
      {/* Current Track Info */}
      <div className="flex items-center gap-3.5 max-lg:gap-2.5 min-w-0">
        <button
          onClick={() => currentTrack && toggleOverlay("fullscreen")}
          aria-label={
            currentTrack
              ? `Open fullscreen view from album cover for ${currentTrack.title}`
              : "Open fullscreen view"
          }
          title="Open fullscreen view"
          className={`w-[52px] h-[52px] max-lg:w-11 max-lg:h-11 rounded-lg shrink-0 overflow-hidden relative border-0 p-0 block transition-transform duration-150 hover:scale-105 active:scale-95 ${currentTrack ? "cursor-pointer" : "cursor-default"
            }`}
          style={{ background: defaultBg }}
        >
          {!imageError && currentTrack?.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <button
            onClick={() => currentTrack && toggleOverlay("fullscreen")}
            aria-label={
              currentTrack
                ? `Open fullscreen view from song title for ${currentTrack.title}`
                : "Open fullscreen view"
            }
            title="Open fullscreen view"
            className={`bg-transparent border-0 p-0 text-left block w-full truncate ${currentTrack ? "cursor-pointer" : "cursor-default"
              }`}
          >
            <MarqueeText
              text={currentTrack?.title ?? "No track selected"}
              className="text-sm font-medium text-[#f4ebe4]"
            />
          </button>
          <div className="text-xs text-[#a89b91] mt-0.5 truncate">
            {currentTrack?.artist ?? "Mutinhimira"}
          </div>
        </div>

        {currentTrack ? (
          <button
            aria-label={isLiked ? `Unlike ${currentTrack.title}` : `Like ${currentTrack.title}`}
            onClick={() => toggleLike(currentTrack.id)}
            className="bg-transparent border-0 p-2 text-[#a89b91] hover:text-[#f4ebe4] grid place-items-center cursor-pointer transition-colors"
          >
            <svg
              className="i w-4 h-4"
              aria-hidden="true"
              style={{
                fill: isLiked ? "#f0a982" : "none",
                color: isLiked ? "#f0a982" : "inherit",
              }}
            >
              <use href="#heart" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Main Playback Controls */}
      <div className="flex items-center justify-center gap-5 max-lg:gap-3 text-[#a89b91]">
        <button
          aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
          onClick={toggleShuffle}
          className={`bg-transparent border-0 p-2 grid place-items-center cursor-pointer max-[900px]:hidden transition-colors ${isShuffle ? "text-[#f0a982]" : "text-[#a89b91] hover:text-[#f4ebe4]"
            }`}
        >
          <svg className="i w-[18px] h-[18px]" aria-hidden="true">
            <use href="#shuffle" />
          </svg>
        </button>

        <button
          aria-label="Previous track"
          onClick={previousTrack}
          className="bg-transparent border-0 p-2 text-[#f4ebe4] hover:text-[#f0a982] grid place-items-center cursor-pointer transition-colors active:scale-95"
        >
          <svg className="i w-[18px] h-[18px]" aria-hidden="true">
            <use href="#prev" />
          </svg>
        </button>

        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlayPause}
          className="w-[52px] h-[52px] max-lg:w-11 max-lg:h-11 rounded-full border-0 bg-[#f1d3bf] hover:bg-[#f5dec0] text-[#1c0f09] grid place-items-center p-0 cursor-pointer transition-all duration-150 active:scale-95 shadow-md"
        >
          <svg className="i w-[22px] h-[22px] max-lg:w-5 max-lg:h-5" aria-hidden="true">
            <use href={isPlaying ? "#pause" : "#play"} />
          </svg>
        </button>

        <button
          aria-label="Next track"
          onClick={nextTrack}
          className="bg-transparent border-0 p-2 text-[#f4ebe4] hover:text-[#f0a982] grid place-items-center cursor-pointer transition-colors active:scale-95"
        >
          <svg className="i w-[18px] h-[18px]" aria-hidden="true">
            <use href="#next" />
          </svg>
        </button>

        <button
          aria-label={`Repeat mode: ${repeatMode}`}
          onClick={toggleRepeat}
          className={`bg-transparent border-0 p-2 grid place-items-center cursor-pointer relative max-[900px]:hidden transition-colors ${repeatMode !== "off" ? "text-[#f0a982]" : "text-[#a89b91] hover:text-[#f4ebe4]"
            }`}
        >
          <svg className="i w-[18px] h-[18px]" aria-hidden="true">
            <use href="#repeat" />
          </svg>
          {repeatMode === "one" ? (
            <span className="absolute top-1 right-1 text-[9px] font-bold text-[#f0a982]">1</span>
          ) : null}
        </button>
      </div>

      {/* Progress Timeline, Volume & Secondary Actions */}
      <div className="flex items-center justify-end gap-3 max-lg:gap-2 text-[#a89b91] text-xs">
        {/* Isolated Timeline Scrubber: updates atomically without re-rendering PlayerFooter */}
        <Scrubber className="w-full max-w-[260px] max-[1150px]:max-w-[180px] max-[900px]:hidden" />

        {/* Desktop inline volume controls (>= 900px) */}
        <div className="hidden min-[900px]:flex items-center gap-1.5 ml-2">
          <button
            aria-label={isMuted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className={`bg-transparent border-0 p-1 cursor-pointer grid place-items-center transition-colors ${isMuted ? "text-[#f0a982]" : "text-[#a89b91] hover:text-[#f4ebe4]"
              }`}
          >
            <svg className="i w-[18px] h-[18px]" aria-hidden="true">
              <use href="#vol" />
            </svg>
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume slider"
            className="w-[70px] accent-[#f0a982] cursor-pointer"
          />
        </div>

        {/* Compact volume popover (< 900px) */}
        <div className="relative min-[900px]:hidden flex items-center">
          <button
            aria-label={isMuted ? "Unmute" : "Mute"}
            aria-expanded={volumePopoverOpen}
            onClick={() => setVolumePopoverOpen(!volumePopoverOpen)}
            className={`bg-transparent border-0 p-1.5 rounded-lg cursor-pointer grid place-items-center transition-colors ${isMuted || volumePopoverOpen
                ? "text-[#f0a982] bg-white/10"
                : "text-[#a89b91] hover:text-[#f4ebe4]"
              }`}
          >
            <svg className="i w-[18px] h-[18px]" aria-hidden="true">
              <use href="#vol" />
            </svg>
          </button>

          {volumePopoverOpen && (
            <div
              role="dialog"
              ref={volumePopoverRef}
              aria-label="Volume adjustment"
              className="absolute bottom-12 right-0 bg-[#1f1513] border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                aria-label={isMuted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="bg-transparent border-0 p-1 cursor-pointer text-[#a89b91] hover:text-[#f4ebe4]"
              >
                <svg className="i w-4 h-4" aria-hidden="true">
                  <use href="#vol" />
                </svg>
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume slider"
                className="w-24 accent-[#f0a982] cursor-pointer"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Lyrics toggle button */}
        <button
          aria-label="Toggle lyrics overlay"
          onClick={() => toggleOverlay("lyrics")}
          className={`bg-transparent border-0 p-2 rounded-lg cursor-pointer grid place-items-center max-[900px]:hidden transition-colors ${activeOverlay === "lyrics"
              ? "text-[#f0a982] bg-white/10"
              : "text-[#a89b91] hover:text-[#f4ebe4] hover:bg-white/5"
            }`}
          title="Lyrics"
        >
          <svg className="i w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        </button>

        {/* Queue toggle button */}
        <button
          aria-label="Toggle playback queue drawer"
          onClick={() => toggleOverlay("queue")}
          className={`bg-transparent border-0 p-2 rounded-lg cursor-pointer grid place-items-center max-[900px]:hidden transition-colors ${activeOverlay === "queue"
              ? "text-[#f0a982] bg-white/10"
              : "text-[#a89b91] hover:text-[#f4ebe4] hover:bg-white/5"
            }`}
          title="Queue"
        >
          <svg className="i w-[18px] h-[18px]" aria-hidden="true">
            <use href="#list" />
          </svg>
        </button>

        {/* Fullscreen expand button */}
        <button
          aria-label="Open fullscreen view"
          onClick={() => currentTrack && toggleOverlay("fullscreen")}
          className={`bg-transparent border-0 p-2 rounded-lg grid place-items-center transition-colors ${currentTrack ? "cursor-pointer" : "cursor-default"
            } ${activeOverlay === "fullscreen"
              ? "text-[#f0a982] bg-white/10"
              : "text-[#a89b91] hover:text-[#f4ebe4] hover:bg-white/5"
            }`}
          title="Fullscreen (expand view)"
        >
          <svg className="i w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>
    </footer>
  );
}
