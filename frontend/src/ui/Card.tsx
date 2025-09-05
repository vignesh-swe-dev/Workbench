import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  padded?: boolean;
  className?: string;
}

export function Card({
  children,
  interactive = false,
  padded = true,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={[
        'bg-white border border-[#E5E7EB] rounded-[8px] transition-all duration-150',
        padded ? 'p-5' : '',
        interactive
          ? 'hover:border-[#D1D5DB] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04)] cursor-pointer'
          : 'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-[#F3F4F6] ${className}`}>
      <div>
        <h3 className="text-[15px] font-semibold text-[#111827] leading-tight">{title}</h3>
        {description && (
          <p className="text-[13px] text-[#6B7280] mt-1 leading-normal">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}
