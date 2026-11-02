import { useEffect, useRef, useState } from "react";
import { useTagEditorStore } from "../../store/useTagEditorStore";

export interface TrackContextMenuProps {
  trackId: string;
  filePath?: string;
  trackTitle?: string;
}

export function TrackRowMenuButton({
  trackId,
  filePath,
  trackTitle,
}: TrackContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openTrackEditor = useTagEditorStore((state) => state.openTrackEditor);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    // Position menu below button, clamped to screen width
    const menuWidth = 160;
    const x = Math.min(rect.left, window.innerWidth - menuWidth - 12);
    const y = rect.bottom + 4;
    setMenuPos({ x, y });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleEditMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    openTrackEditor(trackId, filePath);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-label={trackTitle ? `More options for ${trackTitle}` : "Track actions"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{
          background: "transparent",
          border: 0,
          color: "inherit",
          padding: "4px",
          cursor: "pointer",
          borderRadius: "4px",
          display: "grid",
          placeItems: "center",
          opacity: 0.7,
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.opacity = "0.7";
        }}
      >
        <svg className="i w-4 h-4" aria-hidden="true">
          <use href="#dots" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Track actions menu"
          style={{
            position: "fixed",
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
            zIndex: 70,
            background: "#1e1614",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "4px",
            minWidth: "150px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleEditMetadata}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "transparent",
              border: 0,
              borderRadius: "6px",
              color: "var(--t)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240, 169, 130, 0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg
              className="i w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
            <span>Edit metadata</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Attaches right click context menu listener to track row elements.
 */
export function handleTrackContextMenu(
  e: React.MouseEvent,
  trackId: string,
  filePath?: string,
) {
  e.preventDefault();
  e.stopPropagation();
  useTagEditorStore.getState().openTrackEditor(trackId, filePath);
}

