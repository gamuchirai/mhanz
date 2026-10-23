import { useState, type DragEvent } from "react";
import { usePlayerStore, useUpcomingQueue } from "../../store/usePlayerStore";
import { QueueTrackRow } from "./QueueTrackRow";
import { EmptyQueueState } from "./EmptyQueueState";

export function QueueTrackList() {
  const upcomingQueue = useUpcomingQueue();
  const reorderUpcomingQueue = usePlayerStore((state) => state.reorderUpcomingQueue);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (upcomingQueue.length === 0) {
    return <EmptyQueueState />;
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== dropIndex) {
      reorderUpcomingQueue(draggingIndex, dropIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      role="list"
      aria-label="Upcoming tracks queue"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        overflowY: "auto",
        maxHeight: "calc(100vh - 310px)",
        paddingRight: "4px",
      }}
    >
      {upcomingQueue.map((item, index) => (
        <QueueTrackRow
          key={item.id}
          item={item}
          index={index}
          isDragging={draggingIndex === index}
          isDragOver={dragOverIndex === index}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
