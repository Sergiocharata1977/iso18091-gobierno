// src/components/ui/slider.tsx
// Slider component using native HTML range input

'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      defaultValue = [50],
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      className,
      disabled = false,
    },
    ref
  ) => {
    const currentValue = value?.[0] ?? defaultValue[0];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      onValueChange?.([newValue]);
    };

    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div className={cn('relative w-full', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-6',
            '[&::-webkit-slider-thumb]:h-6',
            '[&::-webkit-slider-thumb]:bg-emerald-500',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:border-4',
            '[&::-webkit-slider-thumb]:border-white',
            '[&::-webkit-slider-thumb]:shadow-lg',
            '[&::-webkit-slider-thumb]:hover:bg-emerald-600',
            '[&::-webkit-slider-thumb]:transition-colors',
            '[&::-moz-range-thumb]:w-6',
            '[&::-moz-range-thumb]:h-6',
            '[&::-moz-range-thumb]:bg-emerald-500',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:border-4',
            '[&::-moz-range-thumb]:border-white',
            '[&::-moz-range-thumb]:shadow-lg',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            background: `linear-gradient(to right, #10b981 ${percentage}%, #e5e7eb ${percentage}%)`,
          }}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
