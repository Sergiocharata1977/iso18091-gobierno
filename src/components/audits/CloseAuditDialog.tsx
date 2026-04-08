'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Audit } from '@/types/audits';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface CloseAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audit: Audit;
  onSuccess: () => void;
}

export function CloseAuditDialog({
  open,
  onOpenChange,
  audit,
  onSuccess,
}: CloseAuditDialogProps) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation checks
  const verifications = audit.normPointsVerification || [];
  const totalPoints = verifications.length;
  const verifiedPoints = verifications.filter(
    v => v.conformityStatus !== null
  ).length;
  const allPointsVerified = totalPoints > 0 && verifiedPoints === totalPoints;
  const hasFinalReport = audit.finalReport && audit.finalReport.trim() !== '';

  const canClose = allPointsVerified && hasFinalReport;

  const handleClose = async () => {
    if (!canClose) return;

    try {
      setClosing(true);
      setError(null);

      const response = await fetch(
        `/api/audits/${audit.id}/close-and-archive`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Error al cerrar la auditoría');
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error closing audit:', err);
      setError('Error de conexión al cerrar la auditoría');
    } finally {
      setClosing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            Cerrar y Archivar Auditoría
          </DialogTitle>
          <DialogDescription>
            Esta acción cerrará la auditoría, generará el informe PDF y lo
            archivará en el sistema de documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Validation Checklist */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Lista de verificación</h4>

            {/* Points Verified */}
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                allPointsVerified
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {allPointsVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${allPointsVerified ? 'text-green-800' : 'text-red-800'}`}
                >
                  Puntos de Norma Verificados
                </p>
                <p
                  className={`text-sm ${allPointsVerified ? 'text-green-700' : 'text-red-700'}`}
                >
                  {verifiedPoints} de {totalPoints} puntos verificados
                </p>
              </div>
            </div>

            {/* Final Report */}
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                hasFinalReport
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {hasFinalReport ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${hasFinalReport ? 'text-green-800' : 'text-red-800'}`}
                >
                  Informe Final del Auditor
                </p>
                <p
                  className={`text-sm ${hasFinalReport ? 'text-green-700' : 'text-red-700'}`}
                >
                  {hasFinalReport
                    ? 'Completado'
                    : 'Falta completar el informe final'}
                </p>
              </div>
            </div>
          </div>

          {/* What will happen */}
          {canClose && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">
                    Al cerrar se realizará:
                  </p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Generación del informe de auditoría</li>
                    <li>• Archivo en el sistema de documentos</li>
                    <li>• Cambio de estado a "Completada"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warning if can't close */}
          {!canClose && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    No se puede cerrar
                  </p>
                  <p className="text-sm text-amber-700">
                    Complete todos los requisitos antes de cerrar la auditoría.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={!canClose || closing}
            className="bg-green-600 hover:bg-green-700"
          >
            {closing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Cerrar y Archivar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
