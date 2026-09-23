import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'terracotta' | 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className,
  ...props
}) => {
  const variants = {
    terracotta: 'bg-terracotta-900/60 text-terracotta-300 border-terracotta-700/60',
    emerald: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    amber: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    blue: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    rose: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
    slate: 'bg-admin-800 text-admin-300 border-admin-700',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold rounded-full',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-full',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border transition-colors select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
