import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-1 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-[var(--motion-duration-normal)] ease-[var(--motion-ease-standard)] focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-xs)]',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-[var(--destructive-soft)] text-[var(--destructive)] dark:text-[var(--destructive-foreground)]',
        outline: 'border-border bg-transparent text-foreground',
        success:
          'border-transparent bg-[var(--success-soft)] text-[var(--success-foreground)]',
        warning:
          'border-transparent bg-[var(--warning-soft)] text-[var(--warning-foreground)]',
        info: 'border-transparent bg-[var(--info-soft)] text-[var(--info-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({
          variant,
        }),
        className
      )}
      {...props}
    />
  );
}

export { Badge };
