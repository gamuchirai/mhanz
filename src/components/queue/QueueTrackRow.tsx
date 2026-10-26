import { useState, type DragEvent, type MouseEvent } from "react";
import type { QueueItem } from "../../types/overlays";
import { formatDuration } from "../../utils/format";
import { usePlayerStore } from "../../store/usePlayerStore";

interface QueueTrackRowProps {
  item: QueueItem;
  index: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void;
}

export function QueueTrackRow({
  item,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: QueueTrackRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const playQueueItem = usePlayerStore((state) => state.playQueueItem);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);

  const track = item.track;

  const handleRowClick = () => {
    playQueueItem(item.id);
  };

  const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    removeFromQueue(item.id);
  };

  return (
    <div
      role="listitem"
      data-testid={`queue-row-${item.id}`}
      draggable={true}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "8px",
        background: isDragging
          ? "rgba(240, 169, 130, 0.15)"
          : isDragOver
            ? "rgba(240, 169, 130, 0.08)"
            : isHovered
              ? "rgba(255, 255, 255, 0.04)"
              : "transparent",
        borderTop: isDragOver ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        opacity: isDragging ? 0.4 : 1,
        transition: "background 0.15s ease, opacity 0.15s ease",
        userSelect: "none",
      }}
    >
      {/* Drag handle */}
      <div
        aria-label="Drag to reorder"
        style={{
          color: isHovered ? "var(--t)" : "var(--m)",
          display: "flex",
          alignItems: "center",
          cursor: "grab",
          padding: "2px 0",
        }}
      >
        <svg
          className="i"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          style={{ opacity: isHovered ? 1 : 0.6 }}
          aria-hidden="true"
        >
          <circle cx="9" cy="6" r="1.5" fill="currentColor" />
          <circle cx="15" cy="6" r="1.5" fill="currentColor" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" />
          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
          <circle cx="9" cy="18" r="1.5" fill="currentColor" />
          <circle cx="15" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* Track artwork */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "6px",
          background: "linear-gradient(135deg, #2b1f1a, #160e0b)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>

      {/* Track Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--t)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--m)",
            marginTop: "1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.artist}
        </div>
      </div>

      {/* Duration or Remove button on hover */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            fontSize: "12px",
            color: "var(--m)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatDuration(track.durationSeconds)}
        </span>

        <button
          aria-label={`Remove ${track.title} from queue`}
          onClick={handleRemoveClick}
          style={{
            background: "none",
            border: 0,
            padding: "4px",
            color: "var(--m)",
            cursor: "pointer",
            borderRadius: "4px",
            display: "grid",
            opacity: isHovered ? 1 : 0.4,
            transition: "opacity 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--m)")}
        >
          <svg className="i" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
