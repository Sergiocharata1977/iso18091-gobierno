'use client';

import { useTheme, type Theme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Claro',
    description: 'Fondo claro con contraste oscuro',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Tema base aprobado para trabajo diario',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Sistema',
    description: 'Sigue la preferencia del dispositivo',
    icon: Monitor,
  },
];

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const activeOption =
    THEME_OPTIONS.find(option => option.value === theme) ?? THEME_OPTIONS[1];
  const TriggerIcon =
    theme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className={cn(
            'h-10 rounded-xl border border-border/60 bg-card/80 text-foreground hover:bg-accent/80',
            !compact && 'justify-start gap-2 px-3',
            className
          )}
          aria-label="Cambiar tema"
          title={`Tema actual: ${activeOption.label}`}
        >
          <TriggerIcon className="h-4 w-4" />
          {!compact && (
            <>
              <span className="text-sm font-medium">{activeOption.label}</span>
              <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">
                tema
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={value => setTheme(value as Theme)}
        >
          {THEME_OPTIONS.map(option => {
            const Icon = option.icon;

            return (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="px-3 py-2"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            const nextTheme =
              theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            setTheme(nextTheme);
          }}
          className="px-3 py-2"
        >
          Alternar rápido
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
