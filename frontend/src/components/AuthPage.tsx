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

  const passwordLongEnough = password.length >= 8;

  return (
    <div className="min-h-full h-full w-full flex bg-[var(--bg)] overflow-y-auto">
      {/* Brand panel (desktop) */}
      <aside className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-[#1E293B] text-white flex-col justify-between p-12">
        <Logo variant="dark" size={28} />

        <div className="max-w-md">
          <h2 className="text-[28px] leading-[1.2] font-semibold tracking-[-0.02em]">
            Plan the work. Ship the release. Keep the team in sync.
          </h2>
          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14px] text-slate-300">
                <span className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={16} strokeWidth={1.5} className="text-slate-100" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-slate-400">Workbench · Project management for teams</p>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="lg:hidden mb-8">
          <Logo size={28} />
        </div>

        <div className="w-full max-w-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            >
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                {isLogin ? 'Log in to Workbench' : 'Create your workspace'}
              </h1>
              <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">
                {isLogin
                  ? 'Enter your email and password to continue.'
                  : 'Set up your account. You will be the owner of the workspace.'}
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
                <div aria-live="polite">
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] px-3 py-2.5 text-[13px] text-[var(--danger)]"
                    >
                      {formError}
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <Field
                    ref={firstFieldRef}
                    label="Full name"
                    value={name}
                    onChange={setName}
                    error={errors.name}
                    autoComplete="name"
                    placeholder="Your name"
                  />
                )}

                <Field
                  ref={isLogin ? firstFieldRef : undefined}
                  label={isLogin ? 'Email' : 'Work email'}
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  autoComplete="email"
                  placeholder="you@company.com"
                />

                <Field
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
                  trailing={passwordToggle}
                  hint={
                    !isLogin ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check
                          size={13}
                          strokeWidth={2}
                          className={passwordLongEnough ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'}
                        />
                        At least 8 characters
                      </span>
                    ) : undefined
                  }
                />

                {!isLogin && (
                  <Field
                    label="Workspace name"
                    value={workspaceName}
                    onChange={setWorkspaceName}
                    error={errors.workspaceName}
                    autoComplete="organization"
                    placeholder="Your team or company"
                  />
                )}

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  {isLogin ? 'Log in' : 'Create account'}
                </Button>
              </form>

              <p className="mt-6 text-[13px] text-[var(--text-muted)] text-center">
                {isLogin ? 'New to Workbench?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(isLogin ? 'register' : 'login')}
                  className="font-medium text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-sm"
                >
                  {isLogin ? 'Create an account' : 'Log in'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
