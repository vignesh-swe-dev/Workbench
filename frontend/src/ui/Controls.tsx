import React from 'react';

// ---- Checkbox ----
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Checkbox({ label, className = '', id, ...props }: CheckboxProps) {
  const cbId = id || (label ? `cb-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <label htmlFor={cbId} className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        id={cbId}
        {...props}
        className={[
          'w-4 h-4 rounded-[4px] border border-[var(--border-2)]',
          'bg-[var(--surface)] text-[var(--brand)] cursor-pointer',
          'accent-[var(--brand)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          props.disabled ? 'opacity-50 cursor-not-allowed' : '',
          className,
        ].join(' ')}
      />
      {label && (
        <span className="text-[14px] text-[var(--text)]">{label}</span>
      )}
    </label>
  );
}

// ---- Switch ----
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-2.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={[
          'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          checked ? 'bg-[var(--brand)]' : 'bg-[var(--border-2)]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {label && <span className="text-[14px] text-[var(--text)]">{label}</span>}
    </label>
  );
}
