'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, MessageSquare, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AuditCommentsProps {
  auditId: string;
  auditStatus: 'planned' | 'in_progress' | 'completed';
  initialComments: string | null;
  finalReport: string | null;
  onSave: () => void;
}

export function AuditComments({
  auditId,
  auditStatus,
  initialComments: initialCommentsValue,
  finalReport: finalReportValue,
  onSave,
}: AuditCommentsProps) {
  const [initialComments, setInitialComments] = useState(
    initialCommentsValue || ''
  );
  const [finalReport, setFinalReport] = useState(finalReportValue || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setInitialComments(initialCommentsValue || '');
    setFinalReport(finalReportValue || '');
  }, [initialCommentsValue, finalReportValue]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/audits/${auditId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialComments: initialComments || null,
          finalReport: finalReport || null,
        }),
      });

      if (!response.ok) throw new Error('Error al guardar');

      setHasChanges(false);
      onSave();
    } catch (error) {
      console.error('Error saving comments:', error);
      alert('Error al guardar los comentarios');
    } finally {
      setSaving(false);
    }
  };

  const canEditInitialComments =
    auditStatus === 'planned' || auditStatus === 'in_progress';
  const canEditFinalReport =
    auditStatus === 'in_progress' || auditStatus === 'completed';
  const showFinalReport = auditStatus !== 'planned';

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Comentarios e Informe
        </h2>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar
          </Button>
        )}
      </div>

      {/* Comentarios Iniciales */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <MessageSquare className="w-4 h-4" />
          Comentarios Iniciales
        </Label>
        <Textarea
          placeholder="Observaciones previas a la auditoría, contexto, alcance específico..."
          value={initialComments}
          onChange={e => {
            setInitialComments(e.target.value);
            setHasChanges(true);
          }}
          disabled={!canEditInitialComments}
          className="min-h-[100px] resize-y"
        />
        {!canEditInitialComments && (
          <p className="text-xs text-gray-500">
            Los comentarios iniciales no son editables una vez completada la
            auditoría.
          </p>
        )}
      </div>

      {/* Informe Final */}
      {showFinalReport && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-gray-700">
            <FileText className="w-4 h-4" />
            Informe Final del Auditor
          </Label>
          <Textarea
            placeholder="Conclusiones de la auditoría, resumen de hallazgos, recomendaciones..."
            value={finalReport}
            onChange={e => {
              setFinalReport(e.target.value);
              setHasChanges(true);
            }}
            disabled={!canEditFinalReport || auditStatus === 'completed'}
            className="min-h-[150px] resize-y"
          />
          {auditStatus === 'completed' && (
            <p className="text-xs text-gray-500">
              El informe final no es editable una vez cerrada la auditoría.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
