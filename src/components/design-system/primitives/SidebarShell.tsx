'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface SidebarNavItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: SidebarNavItem[];
}

interface SidebarShellProps {
  title?: string;
  items: SidebarNavItem[];
  activeHref?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  scope?: 'platform' | 'module';
}

export function SidebarShell({
  title,
  items,
  activeHref,
  collapsed = false,
  onToggleCollapse,
  className,
  scope = 'platform',
}: SidebarShellProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const palette = useMemo(
    () =>
      scope === 'platform'
        ? {
            shell: 'bg-slate-900 text-white border-slate-800',
            active: 'bg-emerald-600 text-white',
            hover: 'hover:bg-slate-800',
            chip: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
          }
        : {
            shell: 'bg-slate-50 text-slate-900 border-slate-200',
            active: 'bg-blue-100 text-blue-800',
            hover: 'hover:bg-slate-100',
            chip: 'bg-blue-100 text-blue-800 border-blue-200',
          },
    [scope]
  );

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'w-64 rounded-xl border p-3 shadow-sm',
        palette.shell,
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="truncate text-xs font-semibold uppercase tracking-wider">
          {title || 'Navigation'}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'rounded-md p-1 transition-colors',
              palette.hover,
              scope === 'platform' ? 'text-white' : 'text-slate-700'
            )}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <nav className="space-y-1">
          {items.map(item => {
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;
            const isGroupOpen = openGroups.has(item.label);
            const isActive = !!item.href && activeHref === item.href;

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? palette.active : palette.hover
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1 text-left">{item.label}</span>
                    {isGroupOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href || '#'}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? palette.active : palette.hover
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 text-xs',
                          palette.chip
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}

                {hasChildren && isGroupOpen && (
                  <div className="ml-5 mt-1 space-y-1">
                    {item.children!.map(child => {
                      const ChildIcon = child.icon;
                      const isChildActive =
                        !!child.href && activeHref === child.href;
                      return (
                        <Link
                          key={`${item.label}-${child.label}`}
                          href={child.href || '#'}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                            isChildActive ? palette.active : palette.hover
                          )}
                        >
                          {ChildIcon && (
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
