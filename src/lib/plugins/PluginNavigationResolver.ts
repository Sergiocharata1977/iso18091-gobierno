'use client';

import type { MenuItem } from '@/config/navigation';
import type { PluginNavigationEntry } from '@/types/plugins';
import type React from 'react';
import {
  AlertTriangle,
  ArchiveRestore,
  Award,
  BarChart,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Layers,
  MessageSquare,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Zap,
  Palette,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  DatabaseBackup,
  ArchiveRestore,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Layers,
  Settings,
  Calendar,
  MessageSquare,
  Award,
  Zap,
  BookOpen,
  Briefcase,
  Users,
  Bot,
  BarChart,
  BarChart3,
  CheckCircle,
  Compass,
  Palette,
  Server,
};

function resolveIcon(iconName: string) {
  return ICON_MAP[iconName] || Server;
}

function normalizeNavigationKey(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/\s+/g, '-');
}

function getItemKeys(item: MenuItem): Set<string> {
  const hrefKey = normalizeNavigationKey(item.href);
  const keys = new Set<string>([
    hrefKey,
    hrefKey.split('/')[0] || hrefKey,
    normalizeNavigationKey(item.feature),
    normalizeNavigationKey(item.name),
  ]);

  return new Set([...keys].filter(Boolean));
}

function canSeeEntry(
  entry: PluginNavigationEntry,
  userRole?: string | null
): boolean {
  if (!entry.roles || entry.roles.length === 0) return true;
  return Boolean(userRole && entry.roles.includes(userRole));
}

export function mergeNavigationWithPluginEntries(
  baseNavigation: MenuItem[],
  pluginEntries: PluginNavigationEntry[],
  userRole?: string | null
): MenuItem[] {
  const visibleEntries = pluginEntries.filter(entry =>
    canSeeEntry(entry, userRole)
  );
  if (!visibleEntries.length) return [];

  const topLevelEntries = visibleEntries.filter(entry => !entry.parent);
  const topLevelByHref = new Map(
    topLevelEntries.map(entry => [entry.href, entry] as const)
  );
  const entriesByParent = new Map<string, PluginNavigationEntry[]>();

  visibleEntries.forEach(entry => {
    if (!entry.parent) {
      return;
    }

    const parentKey = normalizeNavigationKey(entry.parent);
    const current = entriesByParent.get(parentKey) || [];
    current.push(entry);
    entriesByParent.set(parentKey, current);
  });

  const toMenuItem = (entry: PluginNavigationEntry): MenuItem => ({
    name: entry.name,
    href: entry.href,
    icon: resolveIcon(entry.icon),
    feature: entry.feature,
  });

  const resolvedNavigation: Array<MenuItem | null> = baseNavigation.map(
    item => {
      const itemKeys = getItemKeys(item);
      const matchingParentEntries = [...itemKeys]
        .flatMap(key => entriesByParent.get(key) || [])
        .filter(
          (entry, index, all) =>
            all.findIndex(candidate => candidate.href === entry.href) === index
        );

      if (matchingParentEntries.length > 0) {
        const allowedChildren = new Set(
          matchingParentEntries.map(entry => entry.href)
        );
        const baseChildren = (item.children || []).filter(child =>
          allowedChildren.has(child.href)
        );
        const mergedChildren = [
          ...baseChildren,
          ...matchingParentEntries
            .filter(
              entry => !baseChildren.some(child => child.href === entry.href)
            )
            .map(toMenuItem),
        ];

        return {
          ...item,
          children: mergedChildren,
        };
      }

      if (topLevelByHref.has(item.href)) {
        return {
          ...item,
          feature: topLevelByHref.get(item.href)?.feature || item.feature,
        };
      }

      return null;
    }
  );

  return resolvedNavigation.filter((item): item is MenuItem => item !== null);
}
