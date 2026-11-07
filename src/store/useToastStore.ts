import { create } from "zustand";

export interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "error" | "warning";
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, durationMs?: number, type?: "info" | "error" | "warning") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, durationMs = 5000, type = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, durationMs, type }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, durationMs);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

