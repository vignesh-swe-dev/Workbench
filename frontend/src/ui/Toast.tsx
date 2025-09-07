import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} strokeWidth={1.5} />,
  error:   <AlertCircle size={15} strokeWidth={1.5} />,
  info:    <Info size={15} strokeWidth={1.5} />,
  warning: <AlertTriangle size={15} strokeWidth={1.5} />,
};

const colorMap: Record<ToastType, { bar: string; icon: string }> = {
  success: { bar: 'bg-[var(--success)]',  icon: 'text-[var(--success)]' },
  error:   { bar: 'bg-[var(--danger)]',   icon: 'text-[var(--danger)]' },
  info:    { bar: 'bg-[var(--info)]',     icon: 'text-[var(--info)]' },
  warning: { bar: 'bg-[var(--warning)]',  icon: 'text-[var(--warning)]' },
};

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const duration = item.duration ?? 4500;
  const { bar, icon } = colorMap[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="relative w-80 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-md)] overflow-hidden"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-10">
        <span className={`shrink-0 mt-0.5 ${icon}`}>{icons[item.type]}</span>
        <p className="text-[13px] text-[var(--text)] leading-snug flex-1">{item.message}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${bar} toast-progress`}
        style={{ animationDuration: `${duration}ms` }}
        onAnimationEnd={onRemove}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
    setTimeout(() => removeToast(id), duration + 300);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem item={t} onRemove={() => removeToast(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Legacy adapter for existing useApp toasts
export { ToastProvider as Toast };
