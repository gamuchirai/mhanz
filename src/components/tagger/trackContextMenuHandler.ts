import type React from "react";
import { useTagEditorStore } from "../../store/useTagEditorStore";

/**
 * Attaches right click context menu listener to track row elements (AC-2).
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

