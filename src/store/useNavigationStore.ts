import { create } from "zustand";
import type {
  NavHistoryEntry,
  NavRouteParams,
  NavViewId,
} from "../types/navigation";

export interface NavigationState {
  current: NavHistoryEntry;
  history: NavHistoryEntry[];
  currentIndex: number;
  navigate: (view: NavViewId, params?: NavRouteParams) => void;
  goBack: () => void;
  goForward: () => void;
  replace: (view: NavViewId, params?: NavRouteParams) => void;
  reset: (view?: NavViewId) => void;
}

const VALID_VIEWS: NavViewId[] = [
  "Home",
  "Search",
  "Your Library",
  "Liked Songs",
  "Playlists",
  "Albums",
  "Artists",
];

/**
 * Validates and sanitizes a view identifier, falling back safely to Home.
 */
export function sanitizeNavView(view: string): NavViewId {
  return VALID_VIEWS.includes(view as NavViewId)
    ? (view as NavViewId)
    : "Home";
}

function generateNavId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `nav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeParams(params?: NavRouteParams): Record<string, unknown> {
  if (!params) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

function shallowEqualParams(
  a?: NavRouteParams,
  b?: NavRouteParams
): boolean {
  const normA = normalizeParams(a);
  const normB = normalizeParams(b);
  const keysA = Object.keys(normA);
  const keysB = Object.keys(normB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => normA[key] === normB[key]);
}

function isDuplicateRoute(
  current: NavHistoryEntry,
  targetView: NavViewId,
  targetParams?: NavRouteParams
): boolean {
  return (
    current.view === targetView &&
    shallowEqualParams(current.params, targetParams)
  );
}

const initialEntry: NavHistoryEntry = {
  id: generateNavId(),
  view: "Home",
  timestamp: Date.now(),
};

/**
 * Centralized navigation store managing view history, route parameters,
 * and traversal actions capped at 50 records.
 */
export const useNavigationStore = create<NavigationState>()((set, get) => ({
  current: initialEntry,
  history: [initialEntry],
  currentIndex: 0,

  navigate: (view, params) => {
    const targetView = sanitizeNavView(view);
    const { current, history, currentIndex } = get();
    if (isDuplicateRoute(current, targetView, params)) {
      return;
    }
    const sliced = history.slice(0, currentIndex + 1);
    const entry: NavHistoryEntry = {
      id: generateNavId(),
      view: targetView,
      params,
      timestamp: Date.now(),
    };
    const capped = [...sliced, entry].slice(-50);
    set({
      history: capped,
      currentIndex: capped.length - 1,
      current: entry,
    });
  },

  goBack: () => {
    const { currentIndex, history } = get();
    if (currentIndex <= 0) return;
    const nextIndex = currentIndex - 1;
    set({
      currentIndex: nextIndex,
      current: history[nextIndex],
    });
  },

  goForward: () => {
    const { currentIndex, history } = get();
    if (currentIndex >= history.length - 1) return;
    const nextIndex = currentIndex + 1;
    set({
      currentIndex: nextIndex,
      current: history[nextIndex],
    });
  },

  replace: (view, params) => {
    const targetView = sanitizeNavView(view);
    const { currentIndex, history } = get();
    const entry: NavHistoryEntry = {
      id: generateNavId(),
      view: targetView,
      params,
      timestamp: Date.now(),
    };
    const nextHistory = [...history];
    nextHistory[currentIndex] = entry;
    set({
      history: nextHistory,
      current: entry,
    });
  },

  reset: (view = "Home") => {
    const targetView = sanitizeNavView(view);
    const entry: NavHistoryEntry = {
      id: generateNavId(),
      view: targetView,
      timestamp: Date.now(),
    };
    set({
      history: [entry],
      current: entry,
      currentIndex: 0,
    });
  },
}));

// Reactive selectors derived from state
export const useActiveView = () => useNavigationStore((s) => s.current.view);
export const useRouteParams = () => useNavigationStore((s) => s.current.params);
export const useCanGoBack = () => useNavigationStore((s) => s.currentIndex > 0);
export const useCanGoForward = () =>
  useNavigationStore((s) => s.currentIndex < s.history.length - 1);
