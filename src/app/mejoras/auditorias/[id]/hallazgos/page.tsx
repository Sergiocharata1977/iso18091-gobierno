'use client';

import { Button } from '@/components/ui/button';
import type { Finding } from '@/types/findings';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuditFindingsPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchFindings();
  }, [auditId]);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sdk/audits/${auditId}/findings`);
      const result = await response.json();

      if (result.success && result.data) {
        setFindings(result.data);
      } else {
        setFindings([]);
      }
    } catch (error) {
      console.error('Error fetching findings:', error);
      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFindings = findings.filter(finding => {
    if (filter === 'all') return true;
    return finding.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registrado':
        return 'bg-blue-100 text-blue-800';
      case 'en_tratamiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'cerrado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'registrado':
        return 'Registrado';
      case 'en_tratamiento':
        return 'En Tratamiento';
      case 'cerrado':
        return 'Cerrado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando hallazgos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hallazgos de Auditoría
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de hallazgos encontrados en la auditoría
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/mejoras/auditorias/${auditId}`)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4" />
            Nuevo Hallazgo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{findings.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Registrados</p>
          <p className="text-2xl font-bold text-blue-600">
            {findings.filter(f => f.status === 'registrado').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">En Tratamiento</p>
          <p className="text-2xl font-bold text-yellow-600">
            {findings.filter(f => f.status === 'en_tratamiento').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Cerrados</p>
          <p className="text-2xl font-bold text-green-600">
            {findings.filter(f => f.status === 'cerrado').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'registrado', 'en_tratamiento', 'cerrado'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Todos' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No hay hallazgos que mostrar</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredFindings.map(finding => (
              <div
                key={finding.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/mejoras/hallazgos/${finding.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {finding.registration?.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(finding.status)}`}
                      >
                        {getStatusLabel(finding.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {finding.findingNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Progreso</p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${finding.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {finding.progress || 0}%
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mb-3">
                  {finding.registration?.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    {finding.registration?.processName && (
                      <span>Proceso: {finding.registration.processName}</span>
                    )}
                  </div>
                  <div>
                    {finding.createdAt && (
                      <span>
                        Creado:{' '}
                        {(
                          (finding.createdAt as any)?.toDate?.() ||
                          new Date(finding.createdAt as any)
                        ).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
