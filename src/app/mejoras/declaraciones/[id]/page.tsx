'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import type { Declaration } from '@/types/declarations';
import {
  DECLARATION_CATEGORY_LABELS,
  DECLARATION_STATUS_COLORS,
  DECLARATION_STATUS_LABELS,
} from '@/types/declarations';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DeclarationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [declaration, setDeclaration] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (params.id) {
      loadDeclaration();
    }
  }, [params.id]);

  const loadDeclaration = async () => {
    try {
      const response = await fetch(`/api/declarations/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setDeclaration(result.data);
      }
    } catch (error) {
      console.error('Error loading declaration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewNotes.trim()) {
      alert('Por favor ingresa notas de revisión');
      return;
    }

    try {
      setReviewing(true);

      const response = await fetch(`/api/declarations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewNotes,
          createFinding: false, // Por ahora no creamos hallazgo automáticamente
        }),
      });

      const result = await response.json();

      if (result.success) {
        loadDeclaration();
        setReviewNotes('');
      } else {
        alert(result.error || 'Error al revisar declaración');
      }
    } catch (error) {
      console.error('Error reviewing declaration:', error);
      alert('Error al revisar la declaración');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!declaration) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Declaración no encontrada
          </h2>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-gray-500">
                  {declaration.declarationNumber}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {DECLARATION_CATEGORY_LABELS[declaration.category]}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${DECLARATION_STATUS_COLORS[declaration.status]}`}
                >
                  {DECLARATION_STATUS_LABELS[declaration.status]}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {declaration.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Descripción
              </h2>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {declaration.description}
            </p>
          </div>

          {/* Review Notes */}
          {declaration.reviewNotes && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-900">
                  Notas de Revisión
                </h2>
              </div>
              <p className="text-blue-800 whitespace-pre-wrap">
                {declaration.reviewNotes}
              </p>
            </div>
          )}

          {/* Review Form */}
          {declaration.status === 'pending' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Revisar Declaración
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">Notas de Revisión</Label>
                  <Textarea
                    id="reviewNotes"
                    rows={4}
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Ingresa tus comentarios sobre la declaración..."
                  />
                </div>

                <Button
                  onClick={handleReview}
                  disabled={reviewing}
                  className="w-full"
                >
                  {reviewing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Revisando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como Revisada
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Empleado
            </h2>

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span>Nombre</span>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-6">
                  {declaration.employeeName}
                </p>
              </div>

              {declaration.employeeEmail && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Email</div>
                  <p className="text-sm font-medium text-gray-900">
                    {declaration.employeeEmail}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="text-sm text-gray-600 mb-1">Fecha</div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(
                    declaration.createdAt instanceof Date
                      ? declaration.createdAt
                      : new Date(declaration.createdAt)
                  )}
                </p>
              </div>

              {declaration.reviewedByName && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-600 mb-1">Revisada por</div>
                  <p className="text-sm font-medium text-gray-900">
                    {declaration.reviewedByName}
                  </p>
                  {declaration.reviewedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(
                        declaration.reviewedAt instanceof Date
                          ? declaration.reviewedAt
                          : new Date(declaration.reviewedAt)
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {declaration.status === 'reviewed' && !declaration.findingId && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    Próximo Paso
                  </h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    ¿Esta declaración requiere un hallazgo?
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Crear Hallazgo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
