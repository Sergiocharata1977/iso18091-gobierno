import { DocumentationLayout } from '@/components/docs/DocumentationLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllDocs } from '@/lib/docs/loader';
import type { DocCategory, DocModule } from '@/types/docs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DOC_MODULES: DocModule[] = [
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
  'dealer',
  'ejecutivo',
];

const DOC_CATEGORIES: DocCategory[] = ['usuario', 'tecnico', 'proceso'];

interface DocumentacionPageProps {
  searchParams?: {
    q?: string;
    module?: string;
    category?: string;
  };
}

export default function DocumentacionPage({
  searchParams,
}: DocumentacionPageProps) {
  const docs = getAllDocs();
  const initialModule = DOC_MODULES.includes(searchParams?.module as DocModule)
    ? (searchParams?.module as DocModule)
    : 'all';
  const initialCategory = DOC_CATEGORIES.includes(
    searchParams?.category as DocCategory
  )
    ? (searchParams?.category as DocCategory)
    : 'all';

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Manual de sistema"
          description="Guias funcionales y operativas organizadas por modulo, categoria y flujo de trabajo."
          breadcrumbs={[{ label: 'Manual de sistema' }]}
        />

        <DocumentationLayout
          docs={docs}
          initialQuery={searchParams?.q ?? ''}
          initialModule={initialModule}
          initialCategory={initialCategory}
        />
      </div>
    </div>
  );
}
