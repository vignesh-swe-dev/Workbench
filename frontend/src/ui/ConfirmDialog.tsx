import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          {variant === 'danger' && (
            <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[var(--danger-subtle)] flex items-center justify-center">
              <AlertTriangle size={16} strokeWidth={1.5} className="text-[var(--danger)]" />
            </span>
          )}
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text)] tracking-tight">{title}</h3>
            {description && (
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">{description}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
