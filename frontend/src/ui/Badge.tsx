import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]',
  success: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
  warning: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
  danger:  'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]',
  info:    'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]',
  brand:   'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
};

const dotVariantColors: Record<BadgeVariant, string> = {
  default: 'bg-[#9CA3AF]',
  success: 'bg-[#10B981]',
  warning: 'bg-[#F59E0B]',
  danger:  'bg-[#EF4444]',
  info:    'bg-[#3B82F6]',
  brand:   'bg-[#2563EB]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-1.5 py-0.5 leading-none',
  md: 'text-[12px] px-2 py-0.5 leading-tight',
};

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-[4px] whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotVariantColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}

// Status → Badge variant mapping helpers
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'done':        return 'success';
    case 'in_progress': return 'info';
    case 'in_review':   return 'brand';
    case 'cancelled':   return 'danger';
    case 'todo':        return 'default';
    case 'backlog':     return 'default';
    default:            return 'default';
  }
}

export function getPriorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high':   return 'warning';
    case 'medium': return 'info';
    case 'low':    return 'default';
    default:       return 'default';
  }
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    backlog:     'Backlog',
    todo:        'To Do',
    in_progress: 'In Progress',
    in_review:   'In Review',
    done:        'Done',
    cancelled:   'Cancelled',
  };
  return map[status] ?? status;
}
