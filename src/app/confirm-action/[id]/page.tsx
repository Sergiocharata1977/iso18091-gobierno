'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DirectActionConfirmation } from '@/components/direct-actions/DirectActionConfirmation';
import type { DirectActionConfirmation as ConfType } from '@/types/direct-actions';

type PageState = 'loading' | 'ready' | 'not_found' | 'already_processed' | 'done';

export default function ConfirmActionPage() {
  const params = useParams();
  const router = useRouter();
  const actionId = params.id as string;

  const [state, setState] = useState<PageState>('loading');
  const [confirmation, setConfirmation] = useState<ConfType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId) return;
    loadConfirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId]);

  const loadConfirmation = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await fetch(`/api/direct-actions/pending/${actionId}`);
      const data = await res.json();

      if (res.status === 404) {
        setState('not_found');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setState('not_found');
        return;
      }
      if (data.confirmation?.confirmed === true) {
        setState('already_processed');
        return;
      }

      setConfirmation(data.confirmation as ConfType);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
      setState('not_found');
    }
  };

  const handleConfirm = async (id: string) => {
    const res = await fetch('/api/direct-actions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: id, confirmed: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    setDoneMessage(data.message ?? 'Acción ejecutada correctamente');
    setState('done');
  };

  const handleCancel = async (id: string) => {
    const res = await fetch('/api/direct-actions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: id, confirmed: false }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    setDoneMessage('Acción cancelada');
    setState('done');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white text-xl font-bold mb-3">
            IA
          </div>
          <h1 className="text-xl font-bold text-gray-900">Confirmar acción — Don Cándido</h1>
          <p className="text-sm text-gray-500 mt-1">
            La IA propone ejecutar una operación. Revisá el detalle y decidí.
          </p>
        </div>

        {/* Estados */}

        {state === 'loading' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 flex items-center justify-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Cargando solicitud...</span>
          </div>
        )}

        {state === 'not_found' && (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-3">
            <span className="text-4xl">🔍</span>
            <h2 className="font-semibold text-gray-800">Acción no encontrada</h2>
            <p className="text-sm text-gray-500">
              {error ?? `No se encontró una solicitud con ID: ${actionId}`}
            </p>
            <button
              onClick={() => router.push('/mi-panel')}
              className="text-sm text-indigo-600 hover:underline"
            >
              Volver al panel
            </button>
          </div>
        )}

        {state === 'already_processed' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-3">
            <span className="text-4xl">✅</span>
            <h2 className="font-semibold text-gray-800">Esta acción ya fue procesada</h2>
            <p className="text-sm text-gray-500">
              La solicitud <code className="bg-gray-100 px-1 rounded text-xs">{actionId}</code> ya fue confirmada o cancelada anteriormente.
            </p>
            <button
              onClick={() => router.push('/mi-panel')}
              className="text-sm text-indigo-600 hover:underline"
            >
              Volver al panel
            </button>
          </div>
        )}

        {state === 'ready' && confirmation && (
          <div className="space-y-3">
            <DirectActionConfirmation
              confirmation={confirmation}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
            <p className="text-center text-xs text-gray-400">
              Solo vos podés confirmar esta acción — fue solicitada por tu sesión.
            </p>
          </div>
        )}

        {state === 'done' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-3">
            <span className="text-4xl">✅</span>
            <h2 className="font-semibold text-gray-800">{doneMessage}</h2>
            <p className="text-sm text-gray-500">
              Podés volver al panel o continuar la conversación con Don Cándido.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => router.push('/mi-panel')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ir al panel
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
