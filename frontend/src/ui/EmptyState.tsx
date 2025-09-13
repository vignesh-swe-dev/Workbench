import React from 'react';
import { Button } from './Button.tsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-[var(--text-faint)] opacity-60">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-[var(--text)] mb-1 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-[14px] text-[var(--text-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {!description && (action || secondaryAction) && <div className="mb-6" />}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {action && (
            <Button
              variant="primary"
              size="md"
              onClick={action.onClick}
              loading={action.loading}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              size="md"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
