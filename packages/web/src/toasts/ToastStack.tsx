import { useSyncExternalStore } from 'react';
import { getToasts, subscribeToasts } from './toastStore';

const ICONS = { success: '✓', error: '✕', info: 'i' };

export default function ToastStack() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
