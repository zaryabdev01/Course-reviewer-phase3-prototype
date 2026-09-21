import { create } from "zustand";

/**
 * Lightweight global toast store. Every "New allocation created", "Lease
 * paused", "Broadcast sent" style action in this prototype confirms
 * through here instead of a silent no-op — closing the gap between "the
 * button exists" and "the button does something you can see."
 */
interface ToastItem {
  id: string;
  message: string;
  tone: "success" | "info";
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem["tone"]) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
