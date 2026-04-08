'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileText,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NormPoint {
  id: string;
  code: string;
  title: string;
  chapter: number;
  category: string;
  tipo_norma: string;
  nombre_norma: string;
  descripcion: string;
  es_obligatorio: boolean;
  prioridad: string;
}

export default function NormPointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [normPoint, setNormPoint] = useState<NormPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNormPoint = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/norm-points/${params.id}`);

        if (!response.ok) {
          throw new Error('Punto de norma no encontrado');
        }

        const data = await response.json();
        setNormPoint(data);
      } catch (err) {
        console.error('Error loading norm point:', err);
        setError(
          err instanceof Error ? err.message : 'Error al cargar el punto'
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadNormPoint();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando punto de norma...</p>
        </div>
      </div>
    );
  }

  if (error || !normPoint) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Punto de norma no encontrado'}
          </h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      contexto: 'Contexto de la Organización',
      liderazgo: 'Liderazgo',
      planificacion: 'Planificación',
      soporte: 'Apoyo',
      operacion: 'Operación',
      evaluacion: 'Evaluación del Desempeño',
      mejora: 'Mejora',
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      alta: 'bg-red-100 text-red-800',
      media: 'bg-yellow-100 text-yellow-800',
      baja: 'bg-green-100 text-green-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Puntos de Norma
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-mono font-semibold text-blue-600">
                  {normPoint.code}
                </span>
                {normPoint.es_obligatorio ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Obligatorio
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    <XCircle className="w-3 h-3" />
                    Opcional
                  </span>
                )}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(normPoint.prioridad)}`}
                >
                  Prioridad {normPoint.prioridad}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {normPoint.title}
              </h1>
              <p className="text-sm text-gray-600">
                {normPoint.nombre_norma} - Capítulo {normPoint.chapter}:{' '}
                {getCategoryLabel(normPoint.category)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Descripción Detallada */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Requisito de la Norma
          </h2>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {normPoint.descripcion}
          </p>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Información del Punto
          </h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-600">Código</dt>
              <dd className="text-sm font-medium text-gray-900">
                {normPoint.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Capítulo</dt>
              <dd className="text-sm font-medium text-gray-900">
                Capítulo {normPoint.chapter}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Categoría</dt>
              <dd className="text-sm font-medium text-gray-900">
                {getCategoryLabel(normPoint.category)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Clasificación
          </h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-600">Tipo de Norma</dt>
              <dd className="text-sm font-medium text-gray-900">
                {normPoint.nombre_norma}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Obligatoriedad</dt>
              <dd className="text-sm font-medium text-gray-900">
                {normPoint.es_obligatorio ? 'Obligatorio' : 'Opcional'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Prioridad</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">
                {normPoint.prioridad}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Este punto de norma puede estar vinculado a
          procesos, documentos y objetivos de calidad en el sistema. Utiliza la
          matriz de cumplimiento para ver las relaciones completas.
        </p>
      </div>
    </div>
  );
}
