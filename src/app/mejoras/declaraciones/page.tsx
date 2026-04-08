'use client';

import { PageHeader, PageToolbar, ViewMode } from '@/components/design-system';
import { ListTable } from '@/components/design-system/patterns/lists';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import type { Declaration } from '@/types/declarations';
import {
  DECLARATION_CATEGORY_LABELS,
  DECLARATION_STATUS_COLORS,
  DECLARATION_STATUS_LABELS,
} from '@/types/declarations';
import { AlertCircle, CheckCircle, Clock, Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DeclarationsPage() {
  const router = useRouter();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/declarations');
      const result = await response.json();

      if (result.success) {
        setDeclarations(result.data || []);
      }
    } catch (error) {
      console.error('Error loading declarations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter declarations
  const filteredDeclarations = declarations.filter(declaration => {
    const matchesSearch = searchTerm
      ? declaration.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        declaration.declarationNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        declaration.employeeName
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === 'all' || declaration.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: declarations.length,
    pending: declarations.filter(d => d.status === 'pending').length,
    reviewed: declarations.filter(d => d.status === 'reviewed').length,
    closed: declarations.filter(d => d.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando declaraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <PageHeader
          title="Declaraciones"
          description="Gestiona y revisa las declaraciones del personal"
          breadcrumbs={[
            { label: 'Mejora', href: '/mejoras' },
            { label: 'Declaraciones' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="declaraciones" />
              <Link href="/mejoras/declaraciones/nueva">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Declaración
                </Button>
              </Link>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-yellow-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  Pendientes
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.pending}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">Revisadas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.reviewed}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-green-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-800 font-medium">Cerradas</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.closed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode)}
          supportedViews={['list', 'grid']}
          searchPlaceholder="Buscar declaración..."
          filterOptions={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-background border-input">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(DECLARATION_STATUS_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Content */}
        {filteredDeclarations.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              No hay declaraciones
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron declaraciones con los filtros aplicados'
                : 'No se han registrado declaraciones aún'}
            </p>
          </div>
        ) : (
          <ListTable
            data={filteredDeclarations}
            keyExtractor={declaration => declaration.id}
            columns={[
              {
                header: 'Número',
                cell: declaration => (
                  <span className="text-xs font-mono text-gray-500">
                    {declaration.declarationNumber}
                  </span>
                ),
              },
              {
                header: 'Título',
                cell: declaration => (
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {declaration.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {declaration.description}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Categoría',
                cell: declaration => (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {DECLARATION_CATEGORY_LABELS[declaration.category]}
                  </span>
                ),
              },
              {
                header: 'Estado',
                cell: declaration => (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${DECLARATION_STATUS_COLORS[declaration.status]}`}
                  >
                    {DECLARATION_STATUS_LABELS[declaration.status]}
                  </span>
                ),
              },
              {
                header: 'Empleado',
                cell: declaration => (
                  <span className="text-sm text-gray-900">
                    {declaration.employeeName}
                  </span>
                ),
              },
              {
                header: 'Fecha',
                cell: declaration => (
                  <span className="text-sm text-gray-500">
                    {formatDate(
                      declaration.createdAt instanceof Date
                        ? declaration.createdAt
                        : new Date(declaration.createdAt)
                    )}
                  </span>
                ),
              },
              {
                header: '',
                cell: declaration => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/mejoras/declaraciones/${declaration.id}`)
                    }
                  >
                    Ver Detalle
                  </Button>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
