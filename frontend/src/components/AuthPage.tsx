import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Eye, EyeOff, KanbanSquare, GitPullRequest, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Button } from '../ui/Button.tsx';
import { Logo } from '../ui/Logo.tsx';

type Mode = 'login' | 'register';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
}

const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, value, onChange, error, hint, trailing, className = '', ...props },
  ref
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[var(--text)]">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'w-full h-10 px-3 text-[14px] bg-[var(--surface)] text-[var(--text)]',
            'border rounded-[var(--radius-sm)] placeholder:text-[var(--text-faint)]',
            'transition-colors duration-150 focus:outline-none focus:ring-2',
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger)]/20'
              : 'border-[var(--border)] hover:border-[var(--border-2)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20',
            trailing ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-[12px] text-[var(--text-muted)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const features = [
  { icon: KanbanSquare, text: 'Kanban boards with task dependencies' },
  { icon: GitPullRequest, text: 'Releases and GitHub pull request tracking' },
  { icon: ShieldCheck, text: 'Role-based access for every workspace' },
];

export function AuthPage() {
  const { login, register } = useApp();
  const reduceMotion = useReducedMotion();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const isLogin = mode === 'login';

  useEffect(() => {
    document.title = isLogin ? 'Log in · Workbench' : 'Create account · Workbench';
    firstFieldRef.current?.focus();
  }, [isLogin]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError('');
    setShowPassword(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isLogin && name.trim().length < 2) e.name = 'Enter your full name';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address';
    if (isLogin) {
      if (!password) e.password = 'Enter your password';
    } else {
      if (password.length < 8) e.password = 'Use at least 8 characters';
      if (workspaceName.trim().length < 2) e.workspaceName = 'Enter a workspace name';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          workspaceName: workspaceName.trim(),
        });
      }
    } catch (err: any) {
      setFormError(err?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
      className="h-8 w-8 flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
    </button>
  );
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4">Sign in to Workbench</h2>
      </div>
    </div>
  );
}
