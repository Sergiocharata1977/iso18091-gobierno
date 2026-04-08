import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

export interface BaseButtonProps extends ButtonProps {
  // Add any custom props here if needed, or just extend standard props
  fullWidth?: boolean;
}

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, fullWidth, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          fullWidth && 'w-full',
          // Add any specific design system overrides here if needed
          className
        )}
        {...props}
      />
    );
  }
);
BaseButton.displayName = 'BaseButton';
