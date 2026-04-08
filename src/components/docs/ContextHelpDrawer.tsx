'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpenText,
  ChevronDown,
  ExternalLink,
  FileText,
} from 'lucide-react';

import { DocBadge } from '@/components/docs/DocBadge';
import { RelatedDocs } from '@/components/docs/RelatedDocs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import type { Doc, DocMeta } from '@/types/docs';

interface ContextHelpDoc extends Doc {
  relatedDocs: DocMeta[];
}

interface ContextHelpResponse {
  docs: ContextHelpDoc[];
}

interface ContentSection {
  title: string;
  content: string;
}

interface ContextHelpDrawerProps {
  route: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseSections(content: string): {
  intro: string;
  sections: ContentSection[];
} {
  const normalized = content.trim();

  if (!normalized) {
    return { intro: '', sections: [] };
  }

  const matches = [...normalized.matchAll(/^##\s+(.+)$/gm)];

  if (matches.length === 0) {
    return { intro: normalized, sections: [] };
  }

  const intro = normalized.slice(0, matches[0].index).trim();
  const sections = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? normalized.length)
        : normalized.length;

    return {
      title: match[1].trim(),
      content: normalized.slice(start, end).trim(),
    };
  });

  return { intro, sections };
}

function MarkdownBlock({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content) {
    return null;
  }

  return (
    <article
      className={cn(
        'prose prose-sm prose-slate max-w-none prose-p:leading-6 prose-headings:text-slate-900 prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-li:text-slate-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-800',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}

function HelpDocCard({ doc }: { doc: ContextHelpDoc }) {
  const { intro, sections } = parseSections(doc.content);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DocBadge module={doc.meta.module} />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Validado el {formatDate(doc.meta.lastValidated)}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-slate-900">
          {doc.meta.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {doc.meta.summary}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <MarkdownBlock content={intro} />

        {sections.length === 0 ? (
          <MarkdownBlock content={doc.content} />
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <Collapsible
                key={`${doc.meta.slug}-${section.title}`}
                defaultOpen={index === 0}
              >
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100">
                    <span className="font-medium text-slate-900">
                      {section.title}
                    </span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-slate-200 bg-white px-4 py-4">
                    <MarkdownBlock content={section.content} />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        <RelatedDocs docs={doc.relatedDocs} />
      </div>
    </section>
  );
}

function DrawerLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function DrawerEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <BookOpenText className="h-6 w-6 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Ayuda contextual
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Documentacion en preparacion. Visita{' '}
        <span className="font-medium text-slate-900">/documentacion</span> para
        ver todas las guias disponibles.
      </p>
    </div>
  );
}

export function ContextHelpDrawer({
  route,
  open,
  onOpenChange,
}: ContextHelpDrawerProps) {
  const [docs, setDocs] = useState<ContextHelpDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCancelled = false;

    async function loadContextDocs() {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/docs/context?route=${encodeURIComponent(route)}`
        );
        const data = (await response.json()) as ContextHelpResponse;

        if (!response.ok) {
          throw new Error('No se pudo cargar la ayuda contextual.');
        }

        if (!isCancelled) {
          setDocs(data.docs ?? []);
        }
      } catch {
        if (!isCancelled) {
          setDocs([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setHasLoaded(true);
        }
      }
    }

    loadContextDocs();

    return () => {
      isCancelled = true;
    };
  }, [open, route]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-[720px] overflow-hidden border-slate-200 bg-slate-50 p-0 sm:max-w-[720px]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 bg-white px-6 py-5 pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle>Ayuda contextual</SheetTitle>
                <SheetDescription>
                  Guias y pasos recomendados para la ruta{' '}
                  <span className="font-medium text-slate-700">{route}</span>.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading && !hasLoaded ? (
              <DrawerLoadingState />
            ) : docs.length === 0 ? (
              <DrawerEmptyState />
            ) : (
              <div className="space-y-5">
                {docs.map(doc => (
                  <HelpDocCard key={doc.meta.slug} doc={doc} />
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <Link
              href="/documentacion"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
            >
              Ver documentacion completa
              <ExternalLink className="h-4 w-4" />
            </Link>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
