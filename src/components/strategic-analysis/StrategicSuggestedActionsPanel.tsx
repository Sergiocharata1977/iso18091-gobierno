'use client';

import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

type Props = {
  report: StrategicAnalysisReport;
};

export function StrategicSuggestedActionsPanel({ report }: Props) {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestDirectAction = async (actionId: string) => {
    try {
      setMessage(null);
      setLoadingActionId(actionId);
      const res = await fetch(`/api/strategic-analysis/reports/${report.id}/direct-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo solicitar la accion');
      }
      setMessage(`DirectAction creada. Confirmacion: ${json.confirmationUrl || json.action?.confirmationUrl || 'disponible en /confirm-action'}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error solicitando DirectAction');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleUseForManagementReview = async () => {
    try {
      setMessage(null);
      setLoadingActionId('management-review-base');
      const res = await fetch(`/api/strategic-analysis/reports/${report.id}/management-review-base`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo generar la base de revision por direccion');
      }
      setMessage(`Base creada en revision por direccion: ${json.revision?.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error creando base de revision por direccion');
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones sugeridas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleUseForManagementReview}
          disabled={loadingActionId === 'management-review-base'}
        >
          {loadingActionId === 'management-review-base'
            ? 'Generando...'
            : 'Usar como base para revision por la direccion'}
        </Button>

        {report.suggested_actions.length === 0 ? (
          <p className="text-sm text-slate-500">Sin acciones sugeridas para este informe.</p>
        ) : (
          report.suggested_actions.map(action => (
            <div key={action.id} className="rounded-lg border p-3">
              <div className="font-medium">{action.title}</div>
              <p className="mt-1 text-sm text-slate-600">{action.description}</p>
              <p className="mt-1 text-xs text-slate-500">{action.rationale}</p>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleRequestDirectAction(action.id)}
                  disabled={loadingActionId === action.id}
                >
                  {loadingActionId === action.id ? 'Solicitando...' : 'Solicitar DirectAction'}
                </Button>
              </div>
            </div>
          ))
        )}

        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
