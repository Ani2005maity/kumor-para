import React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 bg-white border border-stone-warm-300 rounded-xl text-charcoal-900 text-sm placeholder:text-stone-warm-400 focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:border-terracotta-500 transition-all duration-150 disabled:bg-stone-warm-100 disabled:cursor-not-allowed min-h-[90px]',
            error && 'border-rose-500 focus:ring-rose-400 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-rose-600 animate-in fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-stone-warm-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
