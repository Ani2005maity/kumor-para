import React from 'react';
import { cn } from '../../lib/utils';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { warm?: boolean }> = ({
  className,
  warm = false,
  children,
  ...props
}) => (
  <div
    className={cn(
      'rounded-2xl border transition-all duration-200',
      warm ? 'bg-[#FCFAF7] border-stone-warm-300/80 shadow-warm-sm' : 'bg-white border-stone-warm-200/90 shadow-warm-sm hover:shadow-warm-md',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5 sm:p-6 border-b border-stone-warm-200/60 flex flex-col space-y-1.5', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('font-display font-bold text-lg text-charcoal-900 leading-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs sm:text-sm text-stone-warm-600', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => <div className={cn('p-5 sm:p-6', className)} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5 sm:p-6 pt-0 border-t border-stone-warm-200/60 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);
