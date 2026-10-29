import { memo } from "react";

interface AlbumVinylPlaceholderProps {
  title?: string;
  size?: number | string;
  className?: string;
  showGrooves?: boolean;
}

export const AlbumVinylPlaceholder = memo(function AlbumVinylPlaceholder({
  title = "Mutinhimira",
  size = "100%",
  showGrooves = true,
}: AlbumVinylPlaceholderProps) {
  const initial = title.trim().charAt(0).toUpperCase() || "M";

  return (
    <div
      role="img"
      aria-label={`Vinyl cover placeholder for ${title}`}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        aspectRatio: "1 / 1",
        borderRadius: "10px",
        background:
          "radial-gradient(circle at 35% 30%, #3a2720 0%, #1a120e 45%, #0e0907 85%, #050302 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Vinyl Grooves Simulation */}
      {showGrooves && (
        <>
          <div
            style={{
              position: "absolute",
              width: "82%",
              height: "82%",
              borderRadius: "50%",
              border: "1px dashed rgba(240, 169, 130, 0.12)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "66%",
              height: "66%",
              borderRadius: "50%",
              border: "1px solid rgba(240, 169, 130, 0.08)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "50%",
              height: "50%",
              borderRadius: "50%",
              border: "1px dashed rgba(240, 169, 130, 0.09)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Center Label Hub */}
      <div
        style={{
          width: "36%",
          height: "36%",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #d47a52, #8b4528)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 4px rgba(255, 255, 255, 0.3)",
          position: "relative",
        }}
      >
        {/* Center Spindle Hole */}
        <div
          style={{
            position: "absolute",
            width: "18%",
            height: "18%",
            borderRadius: "50%",
            background: "#0b0706",
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.9)",
          }}
        />

        <span
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: "18px",
            fontFamily: "'Outfit', system-ui, sans-serif",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {initial}
        </span>
      </div>
    </div>
  );
});
