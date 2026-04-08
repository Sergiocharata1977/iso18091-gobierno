import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocumentationContent } from '@/components/docs/DocumentationContent';
import { DocBadge, getDocModuleLabel } from '@/components/docs/DocBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllDocs, getDocBySlug } from '@/lib/docs/loader';
import { formatDate } from '@/lib/utils';
import { ArrowRight, CalendarDays } from 'lucide-react';

// Render dynamically: docs are served from the filesystem at request time.
// Static pre-rendering is skipped to avoid ESM issues with react-markdown during build.
export const dynamic = 'force-dynamic';

interface DocumentationDetailPageProps {
  params: {
    slug: string[];
  };
}

function toDocumentationHref(slug: string): string {
  return `/documentacion/${slug
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')}`;
}

export default function DocumentationDetailPage({
  params,
}: DocumentationDetailPageProps) {
  const decodedSlug = params.slug
    .map(segment => decodeURIComponent(segment))
    .join('/');
  const doc = getDocBySlug(decodedSlug);

  if (!doc) {
    notFound();
  }

  const allDocs = getAllDocs();
  const relatedDocs = allDocs
    .filter(candidate => {
      if (candidate.slug === doc.meta.slug || candidate.status !== 'active') {
        return false;
      }

      if (candidate.module === doc.meta.module) {
        return true;
      }

      return candidate.tags.some(tag => doc.meta.tags.includes(tag));
    })
    .slice(0, 4);

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={doc.meta.title}
          description={doc.meta.summary}
          breadcrumbs={[
            { label: 'Manual del sistema', href: '/documentacion' },
            {
              label: getDocModuleLabel(doc.meta.module),
              href: `/documentacion?module=${doc.meta.module}`,
            },
            { label: doc.meta.title },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3">
          <DocBadge module={doc.meta.module} />
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Validado el {formatDate(doc.meta.lastValidated)}
          </span>
        </div>

        <DocumentationContent content={doc.content} />

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">
              Documentos relacionados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relatedDocs.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavia no hay documentos relacionados para esta guia.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {relatedDocs.map(relatedDoc => (
                  <Link
                    key={relatedDoc.slug}
                    href={toDocumentationHref(relatedDoc.slug)}
                    className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <DocBadge module={relatedDoc.module} />
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-slate-900">
                      {relatedDoc.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {relatedDoc.summary}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
