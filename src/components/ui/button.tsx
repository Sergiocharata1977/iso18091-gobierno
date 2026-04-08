import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import * as React from 'react';

const buttonVariantsObj = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-transparent text-sm font-medium ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-duration-normal)] ease-[var(--motion-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[var(--motion-scale-press)]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-sm)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[var(--shadow-xs)] hover:bg-[var(--destructive-hover)] hover:shadow-[var(--shadow-sm)]',
        outline:
          'border-border bg-card text-foreground shadow-[var(--shadow-xs)] hover:border-[var(--border-strong)] hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)] hover:bg-[var(--secondary-hover)]',
        ghost:
          'text-foreground shadow-none hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto rounded-none px-0 py-0 text-primary shadow-none underline-offset-4 hover:text-[var(--primary-hover)] hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-[var(--radius-xs)] px-3 text-xs',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariantsObj> {
  asChild?: boolean;
}

export const buttonVariants = (props?: {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) => {
  return buttonVariantsObj(props);
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          buttonVariantsObj({
            variant,
            size,
          }),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
