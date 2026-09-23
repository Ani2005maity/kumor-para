import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'terracotta' | 'stone' | 'ochre' | 'emerald' | 'amber' | 'blue' | 'rose' | 'charcoal';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'terracotta',
  size = 'md',
  className,
  ...props
}) => {
  const variants = {
    terracotta: 'bg-terracotta-50 text-terracotta-800 border-terracotta-200',
    stone: 'bg-stone-warm-100 text-stone-warm-800 border-stone-warm-300',
    ochre: 'bg-ochre-50 text-ochre-700 border-ochre-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    charcoal: 'bg-charcoal-900 text-white border-charcoal-900',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-full',
    md: 'text-xs px-2.5 py-1 font-medium rounded-full',
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
