'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExportToSheetsDialogProps {
  trigger?: React.ReactNode;
}

export function ExportToSheetsDialog({ trigger }: ExportToSheetsDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('MCP Executions');

  // Listen for event from ExportDropdown
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener('open-sheets-dialog', handleOpenEvent);
    return () =>
      window.removeEventListener('open-sheets-dialog', handleOpenEvent);
  }, []);

  const extractSpreadsheetId = (input: string): string => {
    // Handle full URL or just ID
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  };

  const handleExport = async () => {
    if (!spreadsheetId.trim()) {
      setResult({
        success: false,
        message: 'Por favor ingresa el ID o URL de la hoja de cálculo',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/mcp/sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: user?.organization_id,
          user_id: user?.id,
          spreadsheetId: extractSpreadsheetId(spreadsheetId),
          sheetName: sheetName || 'MCP Executions',
          includeHeaders: true,
          limit: 100,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `✅ Exportados ${data.data.executionsExported} registros a la hoja "${sheetName}"`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Error al exportar',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión. Verifica tu red.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Exportar a Google Sheets
          </DialogTitle>
          <DialogDescription>
            Exporta el historial de ejecuciones MCP a una hoja de cálculo de
            Google.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">
              URL o ID de la Hoja de Cálculo
            </Label>
            <Input
              id="spreadsheetId"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-slate-500">
              Pega la URL completa o solo el ID del spreadsheet
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetName">Nombre de la Pestaña</Label>
            <Input
              id="sheetName"
              placeholder="MCP Executions"
              value={sheetName}
              onChange={e => setSheetName(e.target.value)}
              disabled={loading}
            />
          </div>

          {result && (
            <div
              className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ Requisitos previos:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>La hoja debe estar compartida con la cuenta de servicio</li>
              <li>
                Las credenciales de Google deben estar configuradas en el
                servidor
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
