import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';
import { BaseBadge } from '../../primitives/BaseBadge';
import { BaseCard } from '../../primitives/BaseCard';
import { spacing, typography } from '../../tokens';

interface DomainCardAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

interface DomainCardProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  status?: {
    label: string;
    variant:
      | 'default'
      | 'secondary'
      | 'destructive'
      | 'outline'
      | 'success'
      | 'warning';
  };
  meta?: React.ReactNode;
  actions?: DomainCardAction[];
  children?: React.ReactNode; // Content body
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DomainCard({
  title,
  subtitle,
  leading,
  status,
  meta,
  actions,
  children,
  footer,
  className,
  onClick,
}: DomainCardProps) {
  return (
    <BaseCard
      className={cn('flex flex-col h-full', className)}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {leading && <div className="shrink-0 mt-0.5">{leading}</div>}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(typography.h3, 'line-clamp-1')}>{title}</h3>
              {status && (
                <BaseBadge variant={status.variant}>{status.label}</BaseBadge>
              )}
            </div>
            {subtitle && (
              <p className={cn(typography.p, 'line-clamp-2')}>{subtitle}</p>
            )}
          </div>
        </div>

        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={e => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className={
                    action.variant === 'destructive'
                      ? 'text-destructive focus:text-destructive'
                      : ''
                  }
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Meta (Optional top content) */}
      {meta && (
        <div className={cn('text-xs text-muted-foreground mb-4', spacing.sm)}>
          {meta}
        </div>
      )}

      {/* Body */}
      {children && <div className="flex-1">{children}</div>}

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-border/50">{footer}</div>
      )}
    </BaseCard>
  );
}
