import React from 'react';
import { motion } from 'motion/react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  layoutId?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  className = '',
  layoutId = 'tab-underline',
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-6 border-b border-[#E5E7EB] ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            className={[
              'relative flex items-center gap-2 pb-3 pt-2 text-[13px] font-medium transition-colors duration-150',
              isActive
                ? 'text-[#111827] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]',
              item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {item.icon && <span className="shrink-0 text-[#9CA3AF]">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`text-[11px] font-medium rounded-full px-1.5 py-0.2 ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}
              >
                {item.badge}
              </span>
            )}
            {/* Sliding Underline Indicator using Motion layoutId */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  tabId: string;
  activeId: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ tabId, activeId, children, className = '' }: TabPanelProps) {
  if (tabId !== activeId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
