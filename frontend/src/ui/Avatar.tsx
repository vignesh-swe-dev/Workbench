import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  src?: string;
}

const sizeMap = {
  xs: { outer: 'w-5 h-5', text: 'text-[9px]' },
  sm: { outer: 'w-6 h-6', text: 'text-[10px]' },
  md: { outer: 'w-8 h-8', text: 'text-[12px]' },
  lg: { outer: 'w-10 h-10', text: 'text-[14px]' },
};

// Deterministic color from name
function colorFromName(name: string): { bg: string; fg: string } {
  const palette = [
    { bg: '#CCFBF1', fg: '#0F766E' },
    { bg: '#D1FAE5', fg: '#065F46' },
    { bg: '#FEF3C7', fg: '#92400E' },
    { bg: '#FEE2E2', fg: '#991B1B' },
    { bg: '#EDE9FE', fg: '#5B21B6' },
    { bg: '#DBEAFE', fg: '#1E40AF' },
    { bg: '#FCE7F3', fg: '#9D174D' },
    { bg: '#D1FAE5', fg: '#065F46' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '', src }: AvatarProps) {
  const { outer, text } = sizeMap[size];
  const { bg, fg } = colorFromName(name);
  const initials = getInitials(name);

  if (src && !src.includes('dicebear') && !src.includes('unsplash') && !src.includes('api.') ) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        className={`${outer} rounded-full object-cover shrink-0 border border-[var(--border)] ${className}`}
      />
    );
  }

  return (
    <span
      title={name}
      aria-label={name}
      className={`${outer} rounded-full shrink-0 inline-flex items-center justify-center font-semibold ${text} ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials}
    </span>
  );
}

// Stack of avatars
interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: AvatarProps['size'];
}

export function AvatarGroup({ names, max = 3, size = 'sm' }: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - max;
  const { outer, text } = sizeMap[size];

  return (
    <div className="flex -space-x-1.5">
      {shown.map((name) => (
        <Avatar
          key={name}
          name={name}
          size={size}
          className="ring-2 ring-[var(--surface)]"
        />
      ))}
      {overflow > 0 && (
        <span
          className={`${outer} rounded-full inline-flex items-center justify-center font-semibold ${text} ring-2 ring-[var(--surface)] bg-[var(--surface-2)] text-[var(--text-muted)]`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
