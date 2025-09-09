import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, description, children, size = 'md', className = '' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }
  }, [open]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={[
              'relative w-full bg-[var(--surface)] border border-[var(--border)]',
              'rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]',
              'flex flex-col max-h-[90vh]',
              sizeMap[size],
              className,
            ].join(' ')}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
                <div>
                  {title && <h2 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">{title}</h2>}
                  {description && <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="ml-4 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors shrink-0"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
