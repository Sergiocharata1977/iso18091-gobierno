'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentationRouteButtonProps {
  route?: string;
  className?: string;
  floating?: boolean;
  label?: string;
  /** Href inicial mientras el API resuelve — muestra el botón de inmediato */
  defaultHref?: string;
}

interface ContextDocResponse {
  docs?: Array<{
    meta?: {
      slug?: string;
    };
  }>;
}

function toDocumentationHref(slug: string): string {
  return `/documentacion/${slug
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')}`;
}

export function DocumentationRouteButton({
  route,
  className,
  floating = false,
  label = 'Ver manual',
  defaultHref,
}: DocumentationRouteButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [targetHref, setTargetHref] = useState<string | null>(
    defaultHref ?? null
  );

  const resolvedRoute = route || pathname || '/';

  useEffect(() => {
    let cancelled = false;

    if (!resolvedRoute || resolvedRoute.startsWith('/documentacion')) {
      if (!defaultHref) setTargetHref(null);
      return () => {
        cancelled = true;
      };
    }

    const loadTarget = async () => {
      try {
        const response = await fetch(
          `/api/docs/context?route=${encodeURIComponent(resolvedRoute)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          if (!cancelled && !defaultHref) {
            setTargetHref(null);
          }
          return;
        }

        const data = (await response.json()) as ContextDocResponse;
        const primarySlug = data.docs?.[0]?.meta?.slug;

        if (!cancelled) {
          setTargetHref(
            primarySlug
              ? toDocumentationHref(primarySlug)
              : defaultHref ?? '/documentacion'
          );
        }
      } catch {
        if (!cancelled && !defaultHref) {
          setTargetHref(null);
        }
      }
    };

    loadTarget();

    return () => {
      cancelled = true;
    };
  }, [resolvedRoute, defaultHref]);

  if (!targetHref) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push(targetHref)}
      className={cn(
        'border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
        floating &&
          'fixed bottom-24 right-4 z-40 h-11 rounded-full px-4 md:bottom-20 md:right-6',
        className
      )}
    >
      <BookOpen className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
