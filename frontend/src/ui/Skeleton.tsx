import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <span
      className={`block skeleton ${className}`}
      style={{ width, height: height ?? '16px' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? '65%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="rounded-full" width="32px" height="32px" />
        <div className="flex-1 space-y-1.5">
          <Skeleton height="13px" width="50%" />
          <Skeleton height="11px" width="35%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-1">
        <Skeleton height="22px" width="64px" className="rounded-[var(--radius-sm)]" />
        <Skeleton height="22px" width="48px" className="rounded-[var(--radius-sm)]" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
      <Skeleton width="16px" height="16px" className="rounded" />
      <Skeleton height="13px" width="40%" />
      <Skeleton height="20px" width="64px" className="ml-auto rounded-[var(--radius-sm)]" />
      <Skeleton height="20px" width="64px" className="rounded-[var(--radius-sm)]" />
      <Skeleton className="rounded-full" width="24px" height="24px" />
    </div>
  );
}
