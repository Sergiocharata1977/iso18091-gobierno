'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, Home } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';

/* ─── Types ───────────────────────────────────────────── */

export type SidebarAccent =
  | 'emerald' // Calidad / SGC
  | 'amber' // Mejoras
  | 'blue' // CRM
  | 'purple' // RRHH
  | 'teal' // Procesos
  | 'cyan' // Super Admin
  | 'rose' // Finanzas
  | 'indigo'; // Planificación

export interface SidebarNavItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  children?: SidebarNavItem[];
}

interface SidebarShellProps {
  /** Module/section title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Module icon shown in header */
  moduleIcon?: React.ReactNode;
  /** Navigation items */
  items: SidebarNavItem[];
  /** Current active path */
  activeHref?: string;
  /** Collapsed state */
  collapsed?: boolean;
  /** Collapse toggle handler */
  onToggleCollapse?: () => void;
  /** Color accent — determines active item color */
  accent?: SidebarAccent;
  /** 'platform' = main nav, 'module' = sub-module nav */
  scope?: 'platform' | 'module';
  /** Show "← Menú Principal" back link */
  backHref?: string;
  /** Footer content (e.g. ISO clause) */
  footer?: React.ReactNode;
  className?: string;
}

/* ─── Accent palettes (DARK theme for module sidebars) ── */

const accentPalettes: Record<
  SidebarAccent,
  {
    active: string;
    activeText: string;
    activeIcon: string;
    badge: string;
    headerIcon: string;
    dot: string;
  }
> = {
  emerald: {
    active: 'bg-emerald-900/30',
    activeText: 'text-emerald-400',
    activeIcon: 'bg-emerald-800/50 text-emerald-400',
    badge: 'bg-emerald-900/50 text-emerald-400',
    headerIcon: 'bg-emerald-600',
    dot: 'bg-emerald-400',
  },
  amber: {
    active: 'bg-amber-900/30',
    activeText: 'text-amber-400',
    activeIcon: 'bg-amber-800/50 text-amber-400',
    badge: 'bg-amber-900/50 text-amber-400',
    headerIcon: 'bg-amber-600',
    dot: 'bg-amber-400',
  },
  blue: {
    active: 'bg-blue-900/30',
    activeText: 'text-blue-400',
    activeIcon: 'bg-blue-800/50 text-blue-400',
    badge: 'bg-blue-900/50 text-blue-400',
    headerIcon: 'bg-blue-600',
    dot: 'bg-blue-400',
  },
  purple: {
    active: 'bg-purple-900/30',
    activeText: 'text-purple-400',
    activeIcon: 'bg-purple-800/50 text-purple-400',
    badge: 'bg-purple-900/50 text-purple-400',
    headerIcon: 'bg-purple-600',
    dot: 'bg-purple-400',
  },
  teal: {
    active: 'bg-teal-900/30',
    activeText: 'text-teal-400',
    activeIcon: 'bg-teal-800/50 text-teal-400',
    badge: 'bg-teal-900/50 text-teal-400',
    headerIcon: 'bg-teal-600',
    dot: 'bg-teal-400',
  },
  cyan: {
    active: 'bg-cyan-900/30',
    activeText: 'text-cyan-400',
    activeIcon: 'bg-cyan-800/50 text-cyan-400',
    badge: 'bg-cyan-900/50 text-cyan-400',
    headerIcon: 'bg-cyan-600',
    dot: 'bg-cyan-400',
  },
  rose: {
    active: 'bg-rose-900/30',
    activeText: 'text-rose-400',
    activeIcon: 'bg-rose-800/50 text-rose-400',
    badge: 'bg-rose-900/50 text-rose-400',
    headerIcon: 'bg-rose-600',
    dot: 'bg-rose-400',
  },
  indigo: {
    active: 'bg-indigo-900/30',
    activeText: 'text-indigo-400',
    activeIcon: 'bg-indigo-800/50 text-indigo-400',
    badge: 'bg-indigo-900/50 text-indigo-400',
    headerIcon: 'bg-indigo-600',
    dot: 'bg-indigo-400',
  },
};

/* ─── Component ───────────────────────────────────────── */

export function SidebarShell({
  title,
  subtitle,
  moduleIcon,
  items,
  activeHref,
  collapsed = false,
  onToggleCollapse,
  accent = 'emerald',
  scope = 'module',
  backHref,
  footer,
  className,
}: SidebarShellProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const palette = useMemo(() => accentPalettes[accent], [accent]);

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
        // Dark theme base - matches main sidebar
        'bg-slate-800 border-r border-slate-700/50',
        'text-slate-200 transition-all duration-300 flex flex-col h-full',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* ─ Header ─ */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              {moduleIcon && (
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-white',
                    palette.headerIcon
                  )}
                >
                  {moduleIcon}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[10px] text-slate-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-slate-700 rounded-md transition-colors"
            >
              <ChevronLeft
                className={cn(
                  'w-5 h-5 text-slate-500 transition-transform',
                  collapsed && 'rotate-180'
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* ─ Back link ─ */}
      {backHref && !collapsed && (
        <div className="px-3 py-2 border-b border-slate-700/50">
          <Link
            href={backHref}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>← Menú Principal</span>
          </Link>
        </div>
      )}

      {/* ─ Navigation ─ */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const isGroupOpen = openGroups.has(item.label);
          const isActive = !!item.href && activeHref?.startsWith(item.href);
          // For exact match on root paths (e.g. /mejoras vs /mejoras/auditorias)
          const isExactActive = !!item.href && activeHref === item.href;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? cn(palette.active, palette.activeText)
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {Icon && (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        isActive
                          ? palette.activeIcon
                          : 'bg-slate-700 group-hover:bg-slate-600 text-slate-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-slate-400 transition-transform',
                      isGroupOpen && 'rotate-180'
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                    isExactActive || (isActive && !hasChildren)
                      ? cn(palette.active, palette.activeText)
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {Icon && (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        isExactActive || (isActive && !hasChildren)
                          ? palette.activeIcon
                          : 'bg-slate-700 group-hover:bg-slate-600 text-slate-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <p className="text-xs text-slate-500 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                  {item.badge !== undefined && !collapsed && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        palette.badge
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {(isExactActive || (isActive && !hasChildren)) &&
                    !collapsed && (
                      <div
                        className={cn('w-1.5 h-1.5 rounded-full', palette.dot)}
                      />
                    )}
                </Link>
              )}

              {/* Children */}
              {hasChildren && isGroupOpen && !collapsed && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {item.children!.map(child => {
                    const ChildIcon = child.icon;
                    const isChildActive =
                      !!child.href && activeHref?.startsWith(child.href);
                    return (
                      <Link
                        key={`${item.label}-${child.label}`}
                        href={child.href || '#'}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                          isChildActive
                            ? cn(palette.active, palette.activeText)
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
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

      {/* ─ Footer ─ */}
      {footer && !collapsed && (
        <div className="p-4 border-t border-slate-700/50">{footer}</div>
      )}
    </aside>
  );
}
