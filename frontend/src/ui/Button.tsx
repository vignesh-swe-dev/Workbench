// Core button primitive
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  ripple?: boolean;
  children: React.ReactNode;
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[14px] gap-2',
  lg: 'h-10 px-4 text-[14px] gap-2',
};

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[#2563EB] text-white hover:bg-[#1D4ED8] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] shadow-xs hover:shadow-[0_2px_6px_rgba(37,99,235,0.25)] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
  secondary:
    'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] active:bg-[#F3F4F6] active:scale-[0.98] shadow-xs focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] active:bg-[#E5E7EB] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] shadow-xs hover:shadow-[0_2px_6px_rgba(220,38,38,0.25)] focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2',
  link:
    'bg-transparent text-[#2563EB] hover:underline active:opacity-75 px-0 h-auto focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ripple = false,
  children,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !isDisabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setCoords(null), 400);
    }
    if (onClick && !isDisabled) {
      onClick(e);
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        'relative overflow-hidden inline-flex items-center justify-center font-medium rounded-[6px] transition-all duration-150 whitespace-nowrap select-none',
        sizeStyles[size],
        variantStyles[variant],
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {coords && (
        <span
          className="absolute w-12 h-12 rounded-full bg-white/30 pointer-events-none animate-ping"
          style={{ left: coords.x - 24, top: coords.y - 24 }}
        />
      )}
      {loading && (
        <Loader2
          className="animate-spin shrink-0"
          size={size === 'sm' ? 13 : 15}
          strokeWidth={1.5}
        />
      )}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
  children: React.ReactNode;
}

const iconSizeStyles: Record<Size, string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-9 h-9',
};

export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  label,
  children,
  className = '',
  ...props
}: IconButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-label={label}
      aria-disabled={isDisabled}
      aria-busy={loading}
      title={label}
      className={[
        'inline-flex items-center justify-center rounded-[6px] transition-all duration-150 shrink-0',
        iconSizeStyles[size],
        variantStyles[variant],
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
      ) : (
        children
      )}
    </button>
  );
}
