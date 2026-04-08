'use client';

import { cn } from '@/lib/utils';
import { InlineTagList } from '../../primitives/InlineTagList';
import { TabPanel, type Tab } from '../../primitives/TabPanel';
import { typography } from '../../tokens';
import { type BadgeColor } from '../../tokens/colors';

interface EntityStat {
  label: string;
  value: string | React.ReactNode;
}

interface EntityTag {
  label: string;
  color?: BadgeColor;
}

interface EntityAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface EntityDetailHeaderProps {
  /** Entity name — e.g. "Lucas Perez" */
  name: string;
  /** Subtitle — e.g. email */
  subtitle?: string;
  /** Avatar URL or undefined for initials */
  avatarUrl?: string;
  /** Tags/badges shown next to the name */
  tags?: EntityTag[];
  /** Key-value stats shown in the header */
  stats?: EntityStat[];
  /** Action buttons (icons) */
  actions?: EntityAction[];
  /** Tab navigation */
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

function EntityAvatar({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(' ')
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold ring-2 ring-primary/20">
      {initials}
    </div>
  );
}

export function EntityDetailHeader({
  name,
  subtitle,
  avatarUrl,
  tags,
  stats,
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
}: EntityDetailHeaderProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border/50 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Top section */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Left: Avatar + Identity */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <EntityAvatar name={name} url={avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className={cn(typography.h2, 'truncate')}>{name}</h2>
                {tags && tags.length > 0 && <InlineTagList tags={tags} />}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-6 flex-wrap">
            {stats &&
              stats.map((stat, i) => (
                <div key={i} className="text-center min-w-[80px]">
                  <div className={typography.kpiLabel}>{stat.label}</div>
                  <div className={cn(typography.kpiValue, 'mt-0.5')}>
                    {stat.value}
                  </div>
                </div>
              ))}

            {actions && actions.length > 0 && (
              <div className="flex items-center gap-1 border-l border-border pl-4">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    title={action.label}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      {tabs && activeTab && onTabChange && (
        <TabPanel
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
          className="px-6"
        />
      )}
    </div>
  );
}
