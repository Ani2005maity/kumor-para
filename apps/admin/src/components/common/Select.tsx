import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-admin-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-xl border border-admin-700 bg-admin-950 px-4 py-2.5 pr-10 text-sm text-admin-100 transition-colors focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 disabled:bg-admin-900 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3.5 flex items-center pointer-events-none text-admin-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-admin-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
