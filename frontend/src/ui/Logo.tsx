import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'symbol' | 'monochrome' | 'dark';
  size?: number | string;
  className?: string;
  showWordmark?: boolean;
}

export function Logo({
  variant = 'horizontal',
  size,
  className = '',
  showWordmark = true,
}: LogoProps) {
  const isDark = variant === 'dark';
  const isMono = variant === 'monochrome';
  const isSymbolOnly = variant === 'symbol' || !showWordmark;

  const slabColor = isDark ? '#3B82F6' : isMono ? '#111827' : '#2563EB';
  const frameColor = isDark ? '#FFFFFF' : isMono ? '#111827' : '#1E293B';
  const textColor = isDark ? '#FFFFFF' : '#111827';

  const markSvg = (svgSize: number | string) => (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-label="Workbench Mark"
    >
      {/* Top Horizontal Slab (Precision Work Surface) */}
      <rect x="1" y="3" width="30" height="5" rx="1.5" fill={slabColor} />
      {/* Left Sturdy Pier Leg */}
      <rect x="4.5" y="10.5" width="4.5" height="17" rx="1.5" fill={frameColor} />
      {/* Right Sturdy Pier Leg */}
      <rect x="23" y="10.5" width="4.5" height="17" rx="1.5" fill={frameColor} />
      {/* Structural Lower Stretcher / Shelf */}
      <rect x="6.5" y="18.5" width="19" height="3.5" rx="1.2" fill={frameColor} />
    </svg>
  );

  if (isSymbolOnly) {
    const symbolSize = size ?? 24;
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        {markSvg(symbolSize)}
      </div>
    );
  }

  const height = size ?? 24;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {markSvg(height)}
      <span
        className="text-[17px] font-semibold tracking-[-0.02em] font-sans leading-none"
        style={{ color: textColor }}
      >
        Workbench
      </span>
    </div>
  );
}
