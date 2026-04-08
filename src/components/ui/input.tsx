import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] ring-offset-background transition-[border-color,box-shadow,background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/90 hover:border-[var(--border-strong)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 aria-invalid:border-destructive aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
