import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const fieldClass =
  'h-10 w-full rounded-md border border-field bg-surface px-3 text-sm text-ink placeholder:text-muted fade duration-150 hover:border-muted aria-[invalid=true]:border-bad disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted';

export const Input = forwardRef(({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClass, className)} {...props} />);
Input.displayName = 'Input';

// Native <select>: accessible, mobile-friendly, zero dependencies.
export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClass, 'pr-8', className)} {...props}>{children}</select>
));
Select.displayName = 'Select';
