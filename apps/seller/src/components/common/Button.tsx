import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warm';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl';

    const variants = {
      primary:
        'bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-700 shadow-sm focus:ring-terracotta-400',
      warm:
        'bg-ochre-500 text-white hover:bg-ochre-600 active:bg-ochre-700 shadow-sm focus:ring-ochre-400',
      secondary:
        'bg-stone-warm-200 text-charcoal-900 hover:bg-stone-warm-300 active:bg-stone-warm-400 focus:ring-stone-warm-400',
      outline:
        'border border-stone-warm-300 bg-white text-charcoal-800 hover:bg-stone-warm-50 active:bg-stone-warm-100 focus:ring-terracotta-400',
      ghost:
        'text-charcoal-700 hover:bg-stone-warm-200 hover:text-charcoal-900 active:bg-stone-warm-300 focus:ring-stone-warm-400',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-400',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-2.5 text-base gap-2.5 font-semibold',
      icon: 'p-2 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
