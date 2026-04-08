'use client';

import { SidebarNavItem, SidebarShell } from './SidebarShell';

interface ModuleSidebarProps {
  moduleName: string;
  items: SidebarNavItem[];
  activeHref?: string;
  className?: string;
}

export function ModuleSidebar({
  moduleName,
  items,
  activeHref,
  className,
}: ModuleSidebarProps) {
  return (
    <SidebarShell
      title={moduleName}
      items={items}
      activeHref={activeHref}
      scope="module"
      className={className}
    />
  );
}
