import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'purple'
  | 'terracotta'
  | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  // Resolve variant by status string if provided
  let resolvedVariant: BadgeVariant = variant || 'default';

  if (status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'delivered':
      case 'paid':
      case 'active':
        resolvedVariant = 'success';
        break;
      case 'pending':
      case 'preparing':
      case 'ready_for_pickup':
        resolvedVariant = 'warning';
        break;
      case 'new':
      case 'accepted':
      case 'shipped':
        resolvedVariant = 'info';
        break;
      case 'rejected':
      case 'cancelled':
      case 'failed':
        resolvedVariant = 'danger';
        break;
      case 'draft':
      case 'neutral':
        resolvedVariant = 'neutral';
        break;
      case 'commission':
        resolvedVariant = 'purple';
        break;
      default:
        resolvedVariant = 'default';
    }
  }

  const variants = {
    default: 'bg-stone-warm-200 text-charcoal-800 border-stone-warm-300',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/80',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
    terracotta: 'bg-terracotta-50 text-terracotta-800 border-terracotta-200/80',
  };

  const dotColors = {
    default: 'bg-stone-500',
    neutral: 'bg-stone-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
    purple: 'bg-purple-500',
    terracotta: 'bg-terracotta-500',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors select-none tracking-tight capitalize',
        variants[resolvedVariant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[resolvedVariant])} />}
      {children || (status ? status.replace(/_/g, ' ') : '')}
    </span>
  );
};
