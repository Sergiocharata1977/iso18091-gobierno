'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { DocBadge } from '@/components/docs/DocBadge';
import { cn } from '@/lib/utils';
import type { DocMeta } from '@/types/docs';

interface RelatedDocsProps {
  docs: DocMeta[];
  className?: string;
  title?: string;
  emptyMessage?: string;
}

export function RelatedDocs({
  docs,
  className,
  title = 'Documentos relacionados',
  emptyMessage = 'No hay documentos relacionados para este contexto.',
}: RelatedDocsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{docs.length} guias</span>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <Link
              key={doc.slug}
              href={`/documentacion/${encodeURIComponent(doc.slug)}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <DocBadge module={doc.module} />
                  <div>
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{doc.summary}</p>
                  </div>
                </div>

                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
