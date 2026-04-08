'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DocumentationSearch } from '@/components/docs/DocumentationSearch';
import { DocBadge, getDocModuleLabel } from '@/components/docs/DocBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import type { DocCategory, DocMeta, DocModule } from '@/types/docs';
import { ArrowUpRight, CalendarDays, FileText, Filter } from 'lucide-react';

const MODULE_ORDER: DocModule[] = [
  'onboarding',
  'mi-panel',
  'rrhh',
  'procesos',
  'documentos',
  'crm',
  'auditorias',
  'hallazgos',
  'acciones',
  'iso-design',
  'iso-infra',
  'don-candido',
];

const CATEGORY_LABELS: Record<DocCategory, string> = {
  usuario: 'Usuario',
  tecnico: 'Tecnico',
  proceso: 'Proceso',
};

function matchesSearch(doc: DocMeta, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase('es');

  if (!normalized) {
    return true;
  }

  return [doc.title, doc.summary, ...doc.tags].some(value =>
    value.toLocaleLowerCase('es').includes(normalized)
  );
}

function toDocumentationHref(slug: string): string {
  return `/documentacion/${slug
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')}`;
}

interface DocumentationLayoutProps {
  docs: DocMeta[];
  initialQuery?: string;
  initialModule?: DocModule | 'all';
  initialCategory?: DocCategory | 'all';
}

export function DocumentationLayout({
  docs,
  initialQuery = '',
  initialModule = 'all',
  initialCategory = 'all',
}: DocumentationLayoutProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedModule, setSelectedModule] = useState<DocModule | 'all'>(
    initialModule
  );
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'all'>(
    initialCategory
  );

  const availableModules = useMemo(
    () =>
      MODULE_ORDER.filter(module => docs.some(doc => doc.module === module)),
    [docs]
  );

  const filteredDocs = useMemo(
    () =>
      docs.filter(doc => {
        if (selectedModule !== 'all' && doc.module !== selectedModule) {
          return false;
        }

        if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
          return false;
        }

        return matchesSearch(doc, query);
      }),
    [docs, query, selectedCategory, selectedModule]
  );

  const groupedDocs = useMemo(() => {
    return MODULE_ORDER.map(module => ({
      module,
      docs: filteredDocs.filter(doc => doc.module === module),
    })).filter(group => group.docs.length > 0);
  }, [filteredDocs]);

  const categoryOptions = useMemo(
    () =>
      (['usuario', 'tecnico', 'proceso'] as DocCategory[]).filter(category =>
        docs.some(doc => doc.category === category)
      ),
    [docs]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter className="h-4 w-4 text-emerald-600" />
          Navegacion documental
        </div>

        <div className="mt-5 space-y-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Modulos
            </p>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button
                type="button"
                onClick={() => setSelectedModule('all')}
                className={cn(
                  'rounded-full border px-3 py-2 text-sm text-left transition-colors',
                  selectedModule === 'all'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                Todos
              </button>
              {availableModules.map(module => (
                <button
                  key={module}
                  type="button"
                  onClick={() => setSelectedModule(module)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-sm text-left transition-colors',
                    selectedModule === module
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {getDocModuleLabel(module)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Categorias
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'rounded-full border px-3 py-2 text-sm transition-colors',
                  selectedCategory === 'all'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                Todas
              </button>
              {categoryOptions.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-sm transition-colors',
                    selectedCategory === category
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <div className="space-y-6">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <DocumentationSearch
              value={query}
              onChange={setQuery}
              resultsCount={filteredDocs.length}
            />
          </CardContent>
        </Card>

        {groupedDocs.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/70 shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="rounded-full bg-white p-4 shadow-sm">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  No hay documentos para este filtro
                </h2>
                <p className="max-w-xl text-sm text-slate-500">
                  Ajusta la busqueda o espera a que se publiquen nuevas guias en
                  el hub documental.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          groupedDocs.map(group => (
            <section key={group.module} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {getDocModuleLabel(group.module)}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {group.docs.length} documento
                    {group.docs.length === 1 ? '' : 's'} disponible
                    {group.docs.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <DocBadge module={group.module} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.docs.map(doc => (
                  <Link
                    key={doc.slug}
                    href={toDocumentationHref(doc.slug)}
                    className="group block"
                  >
                    <Card className="h-full border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <DocBadge module={doc.module} />
                          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-emerald-600" />
                        </div>
                        <CardTitle className="line-clamp-2 text-lg text-slate-900">
                          {doc.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                          {doc.summary}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {doc.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                          Validado el {formatDate(doc.lastValidated)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
