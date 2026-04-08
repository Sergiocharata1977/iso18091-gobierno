'use client';

import {
  BaseBadge,
  PageHeader,
  PageToolbar,
  ViewMode,
} from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { SurveyFormDialog } from '@/components/surveys/SurveyFormDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Survey } from '@/types/surveys';
import { SURVEY_STATUS_LABELS, SURVEY_TYPE_LABELS } from '@/types/surveys';
import { FileText, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/surveys');
      const result = await response.json();

      if (result.success) {
        setSurveys(result.data || []);
      }
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadSurveys();
  };

  // Filter surveys
  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = searchTerm
      ? survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === 'all' || survey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: surveys.length,
    active: surveys.filter(s => s.status === 'active').length,
    draft: surveys.filter(s => s.status === 'draft').length,
    completed: surveys.filter(s => s.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando encuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <PageHeader
          title="Encuestas"
          description="Gestiona encuestas de clientes y ciudadania desde un unico modulo"
          breadcrumbs={[
            { label: 'Mejora', href: '/mejoras' },
            { label: 'Encuestas' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="encuestas" />
              <Button
                onClick={() => setShowDialog(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Encuesta
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-500 font-medium">Activas</p>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.active}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-500 font-medium">Borradores</p>
            <p className="text-2xl font-bold text-blue-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-500 font-medium">Completadas</p>
            <p className="text-2xl font-bold text-gray-600">
              {stats.completed}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          supportedViews={['grid', 'list']}
          searchPlaceholder="Buscar encuesta..."
          filterOptions={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-background border-input">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(SURVEY_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Content */}
        {filteredSurveys.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              No hay encuestas
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron encuestas con los filtros aplicados'
                : 'Comienza creando tu primera encuesta'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Encuesta
              </Button>
            )}
          </div>
        ) : (
          <ListGrid
            data={filteredSurveys}
            keyExtractor={survey => survey.id}
            renderItem={survey => (
              <DomainCard
                key={survey.id}
                title={survey.title}
                subtitle={survey.surveyNumber}
                status={{
                  label: SURVEY_STATUS_LABELS[survey.status],
                  variant: survey.status === 'active' ? 'success' : 'default',
                }}
                meta={
                  <div className="flex flex-wrap gap-2">
                    <BaseBadge variant="secondary">
                      {SURVEY_TYPE_LABELS[survey.type]}
                    </BaseBadge>
                    <BaseBadge variant="outline">
                      {survey.channel === 'publico' ? 'Canal publico' : 'Canal interno'}
                    </BaseBadge>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Respuestas</p>
                    <p className="font-medium">{survey.responseCount}</p>
                  </div>

                  {survey.averageRating ? (
                    <div>
                      <p className="text-muted-foreground text-xs">Promedio</p>
                      <div className="flex items-center gap-1 font-medium text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{survey.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-xs">Promedio</p>
                      <p className="text-muted-foreground">-</p>
                    </div>
                  )}

                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{survey.questions.length} preguntas</span>
                      <Link
                        href={`/mejoras/encuestas/${survey.id}`}
                        className="text-primary hover:underline"
                      >
                        Ver detalles
                      </Link>
                    </div>
                  </div>
                </div>
              </DomainCard>
            )}
          />
        )}

        {/* Dialog */}
        <SurveyFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
