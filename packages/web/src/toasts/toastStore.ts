export type ToastType = 'default' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export function showToast(message: string, type: ToastType = 'default', durationMs = 3000) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, durationMs);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
