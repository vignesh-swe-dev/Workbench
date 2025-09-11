import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  width?: number;
}

export function DropdownMenu({ trigger, items, align = 'right', width = 192 }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      {React.cloneElement(trigger as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen((v) => !v);
          (trigger as React.ReactElement<any>).props.onClick?.(e);
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            style={{ width }}
            className={[
              'absolute top-full mt-1 z-50',
              'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)]',
              'shadow-[var(--shadow-md)] overflow-hidden py-1',
              align === 'right' ? 'right-0' : 'left-0',
            ].join(' ')}
          >
            {items.map((item, i) => {
              if (item.separator) {
                return <div key={i} className="my-1 border-t border-[var(--border)]" />;
              }
              return (
                <button
                  key={i}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      setOpen(false);
                    }
                  }}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-100',
                    item.danger
                      ? 'text-[var(--danger)] hover:bg-[var(--danger-subtle)]'
                      : 'text-[var(--text)] hover:bg-[var(--surface-2)]',
                    item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {item.icon && (
                    <span className="shrink-0 text-[var(--text-muted)]">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
