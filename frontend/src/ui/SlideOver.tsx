import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

const widthMap = { sm: 'w-full max-w-sm', md: 'w-full max-w-xl', lg: 'w-full max-w-2xl' };

export function SlideOver({ open, onClose, title, description, children, width = 'md', footer }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={[
              'relative h-full bg-[var(--surface)] border-l border-[var(--border)]',
              'shadow-[var(--shadow-lg)] flex flex-col',
              widthMap[width],
            ].join(' ')}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div>
                {title && (
                  <h2 className="text-[15px] font-semibold text-[var(--text)] tracking-tight">{title}</h2>
                )}
                {description && (
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="ml-4 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors shrink-0 mt-0.5"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">{children}</div>

            {/* Optional footer */}
            {footer && (
              <div className="px-5 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface)]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
