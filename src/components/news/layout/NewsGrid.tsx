'use client';

import { ReactNode } from 'react';

interface NewsGridProps {
  leftSidebar?: ReactNode;
  header: ReactNode;
  content: ReactNode;
  rightSidebar?: ReactNode;
  isLeftSidebarCollapsed?: boolean;
  isRightSidebarCollapsed?: boolean;
  className?: string;
}

export function NewsGrid({
  leftSidebar,
  header,
  content,
  rightSidebar,
  isLeftSidebarCollapsed = false,
  isRightSidebarCollapsed = false,
  className = '',
}: NewsGridProps) {
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 ${className}`}>
      {/* Header */}
      {header}

      {/* Main Content */}
      <div className="flex gap-6 px-4 md:px-6 py-6 max-w-7xl mx-auto">
        {/* Left Sidebar */}
        {leftSidebar && !isLeftSidebarCollapsed && (
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            {leftSidebar}
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="max-w-2xl">{content}</div>
        </main>

        {/* Right Sidebar */}
        {rightSidebar && !isRightSidebarCollapsed && (
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            {rightSidebar}
          </aside>
        )}
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden px-4 md:px-6 py-6">
        <main className="max-w-2xl mx-auto">{content}</main>
      </div>
    </div>
  );
}
