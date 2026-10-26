import { type MouseEvent } from "react";
import { useCurrentTime, usePlayerStore } from "../../store/usePlayerStore";
import { formatDuration } from "../../utils/format";

interface ScrubberProps {
  className?: string;
}

/**
 * Isolated playback progress scrubber bar.
 * Subscribes only to `currentTime` and `duration`, isolating high-frequency (100ms)
 * playback progress ticks from parent and sibling components.
 */
export function Scrubber({ className = "" }: ScrubberProps) {
  const currentTime = useCurrentTime();
  const duration = usePlayerStore((state) => state.currentTrack?.durationSeconds ?? 0);
  const seekTo = usePlayerStore((state) => state.seekTo);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(Math.floor(ratio * duration));
  };

  return (
    <div
      className={`flex items-center gap-2.5 text-xs text-[#a89b91] min-w-0 select-none ${className}`}
    >
      <span className="w-10 text-right tabular-nums shrink-0 font-medium text-[11px] text-[#a89b91]">
        {formatDuration(currentTime)}
      </span>

      <div
        role="progressbar"
        tabIndex={0}
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        onClick={handleSeek}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            seekTo(Math.max(0, currentTime - 5));
          } else if (e.key === "ArrowRight") {
            seekTo(Math.min(duration, currentTime + 5));
          }
        }}
        className="w-full max-w-[260px] min-w-[60px] h-3 flex items-center cursor-pointer group"
      >
        <div className="w-full h-1 rounded-full bg-[#3a2f2a] relative overflow-hidden group-hover:h-1.5 transition-all">
          <div
            className="h-full rounded-full bg-[#f0a982] transition-[width] duration-150 linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="w-10 text-left tabular-nums shrink-0 font-medium text-[11px] text-[#a89b91]">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
