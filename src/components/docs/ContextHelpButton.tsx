'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { ContextHelpDrawer } from '@/components/docs/ContextHelpDrawer';
import { Button } from '@/components/ui/button';
import { EVENTS, trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/utils';

interface ContextHelpButtonProps {
  route: string;
  className?: string;
}

export function ContextHelpButton({
  route,
  className,
}: ContextHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const resolvedPath = route || pathname || '/';
  const resolvedModule =
    resolvedPath.split('/').filter(Boolean)[0]?.toLowerCase() || 'general';

  const handleOpen = () => {
    trackEvent(EVENTS.DOC_HELP_OPENED, {
      pathname: resolvedPath,
      module: resolvedModule,
    });
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={cn(
          'h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
          className
        )}
        title="Abrir ayuda contextual"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="sr-only">Abrir ayuda contextual</span>
      </Button>

      <ContextHelpDrawer route={route} open={open} onOpenChange={setOpen} />
    </>
  );
}
