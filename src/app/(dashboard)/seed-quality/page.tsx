'use client';

import Link from 'next/link';
import { useState } from 'react';

interface SeedResult {
  success: boolean;
  message?: string;
  data?: unknown;
  ids?: {
    politica?: string;
    reunion?: string;
    foda?: string;
  };
}

export default function SeedQualityPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/seed/quality-modules', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Error al crear registros');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Crear Datos de Ejemplo</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <p className="text-gray-600 mb-4">
            Este script creará registros de ejemplo en las colecciones de:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li>Políticas (1 registro)</li>
            <li>Reuniones de Trabajo (1 registro)</li>
            <li>Análisis FODA (1 registro)</li>
          </ul>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Registros de Ejemplo'}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Registros creados exitosamente
            </h2>
            <p className="text-green-700 mb-4">{result.message}</p>
            <div className="bg-white rounded p-4">
              <p className="text-sm text-gray-600 mb-2">IDs creados:</p>
              <ul className="text-sm space-y-1">
                <li>
                  Política:{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {result.ids?.politica}
                  </code>
                </li>
                <li>
                  Reunión:{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {result.ids?.reunion}
                  </code>
                </li>
                <li>
                  FODA:{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {result.ids?.foda}
                  </code>
                </li>
              </ul>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                href="/politicas"
                className="block text-blue-600 hover:text-blue-700"
              >
                → Ver Políticas
              </Link>
              <Link
                href="/reuniones-trabajo"
                className="block text-blue-600 hover:text-blue-700"
              >
                → Ver Reuniones
              </Link>
              <Link
                href="/analisis-foda"
                className="block text-blue-600 hover:text-blue-700"
              >
                → Ver Análisis FODA
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              ❌ Error
            </h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
