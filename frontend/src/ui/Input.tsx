import React from 'react';

// ---- Input ----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-[var(--text)]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-2.5 flex items-center text-[var(--text-muted)] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            'w-full bg-[var(--surface)] text-[var(--text)] text-[14px]',
            'border border-[var(--border)] rounded-[var(--radius-sm)]',
            'h-9 px-3 placeholder:text-[var(--text-faint)]',
            'transition-colors duration-150',
            'hover:border-[var(--border-2)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20',
            error ? 'border-[var(--danger)] focus:ring-[var(--danger)]/20' : '',
            leftIcon ? 'pl-8' : '',
            rightIcon ? 'pr-8' : '',
            props.disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-2)]' : '',
            className,
          ].join(' ')}
        />
        {rightIcon && (
          <span className="absolute right-2.5 flex items-center text-[var(--text-muted)] pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-[var(--danger)]" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

// ---- Textarea ----
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const areaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={areaId}
          className="text-[13px] font-medium text-[var(--text)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        {...props}
        className={[
          'w-full bg-[var(--surface)] text-[var(--text)] text-[14px]',
          'border border-[var(--border)] rounded-[var(--radius-sm)]',
          'px-3 py-2 placeholder:text-[var(--text-faint)] resize-y min-h-[80px]',
          'transition-colors duration-150',
          'hover:border-[var(--border-2)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20',
          error ? 'border-[var(--danger)] focus:ring-[var(--danger)]/20' : '',
          props.disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-2)]' : '',
          className,
        ].join(' ')}
      />
      {error && <p className="text-[12px] text-[var(--danger)]" role="alert">{error}</p>}
      {hint && !error && <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

// ---- Select ----
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Select({
  label,
  error,
  hint,
  className = '',
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[13px] font-medium text-[var(--text)]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={[
          'w-full bg-[var(--surface)] text-[var(--text)] text-[14px]',
          'border border-[var(--border)] rounded-[var(--radius-sm)]',
          'h-9 px-3 appearance-none',
          'transition-colors duration-150',
          'hover:border-[var(--border-2)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20',
          error ? 'border-[var(--danger)]' : '',
          props.disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-2)]' : 'cursor-pointer',
          className,
        ].join(' ')}
      >
        {children}
      </select>
      {error && <p className="text-[12px] text-[var(--danger)]" role="alert">{error}</p>}
      {hint && !error && <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
