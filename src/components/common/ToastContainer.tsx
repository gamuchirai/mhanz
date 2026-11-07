import { useToastStore } from "../../store/useToastStore";

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-surface-elevated/95 backdrop-blur-md border border-white/10 text-text-primary shadow-xl text-sm"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-text-muted hover:text-text-primary transition-colors text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

