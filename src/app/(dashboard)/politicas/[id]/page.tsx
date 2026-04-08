'use client';

import { Politica } from '@/types/politicas';
import { ArrowLeft, Calendar, FileText, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PoliticaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [politica, setPolitica] = useState<Politica | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolitica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadPolitica = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/politicas/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPolitica(data);
      }
    } catch (error) {
      console.error('Error loading politica:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      vigente: 'bg-green-100 text-green-800',
      borrador: 'bg-gray-100 text-gray-800',
      en_revision: 'bg-yellow-100 text-yellow-800',
      obsoleta: 'bg-red-100 text-red-800',
    };
    return colors[estado as keyof typeof colors] || colors.borrador;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando política...</p>
        </div>
      </div>
    );
  }

  if (!politica) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Política no encontrada
          </h3>
          <button
            onClick={() => router.push('/politicas')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver a políticas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <button
        onClick={() => router.push('/politicas')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Volver a Políticas
      </button>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-gray-500">
                {politica.codigo}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(politica.estado)}`}
              >
                {politica.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {politica.titulo}
            </h1>
            <p className="text-gray-600 text-lg">{politica.descripcion}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b">
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Versión</p>
              <p className="font-semibold">{politica.version}</p>
            </div>
          </div>

          {politica.fecha_aprobacion && (
            <div className="flex items-start gap-3">
              <Calendar className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-500">Fecha de Aprobación</p>
                <p className="font-semibold">
                  {new Date(politica.fecha_aprobacion).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {politica.aprobador_nombre && (
            <div className="flex items-start gap-3">
              <User className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-500">Aprobado por</p>
                <p className="font-semibold">{politica.aprobador_nombre}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Contenido</h2>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {politica.contenido || 'No hay contenido disponible'}
            </div>
          </div>
        </div>

        {politica.fecha_revision && (
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={16} />
              <span>
                Próxima revisión:{' '}
                {new Date(politica.fecha_revision).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
