'use client';

import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  /** Visual variant */
  variant?: 'underline' | 'pills';
  /** Full width distribution */
  fullWidth?: boolean;
  className?: string;
}

export function TabPanel({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  fullWidth = false,
  className,
}: TabPanelProps) {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'flex items-center gap-1 bg-muted/50 p-1 rounded-lg',
          fullWidth && 'w-full',
          className
        )}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              fullWidth && 'flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default: underline variant
  return (
    <div className={cn('border-b border-border', className)}>
      <div
        className={cn('flex items-center gap-0 -mb-px', fullWidth && 'w-full')}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              fullWidth && 'flex-1 justify-center',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
