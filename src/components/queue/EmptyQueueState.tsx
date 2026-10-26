import { usePlayerStore } from "../../store/usePlayerStore";
import { popularTracksList } from "../../data/homeFixtures";

interface EmptyQueueStateProps {
  onQueueRecommended?: () => void;
}

export function EmptyQueueState({ onQueueRecommended }: EmptyQueueStateProps) {
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const handleQueueRecommended = () => {
    popularTracksList.slice(0, 5).forEach((track) => {
      addToQueue(track);
    });
    if (onQueueRecommended) {
      onQueueRecommended();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--m)",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(240, 169, 130, 0.08)",
          border: "1px solid rgba(240, 169, 130, 0.2)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg className="i" width="24" height="24" aria-hidden="true">
          <use href="#list" />
        </svg>
      </div>
      <div>
        <h4 style={{ color: "var(--t)", fontSize: "15px", margin: "0 0 6px 0", fontWeight: 600 }}>
          Upcoming queue is empty
        </h4>
        <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, maxWidth: "260px" }}>
          Add songs to keep the music playing without interruption.
        </p>
      </div>
      <button
        onClick={handleQueueRecommended}
        style={{
          marginTop: "8px",
          padding: "9px 18px",
          borderRadius: "20px",
          background: "var(--accent)",
          color: "#1c0f09",
          border: 0,
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        Queue Recommended Songs
      </button>
    </div>
  );
}
