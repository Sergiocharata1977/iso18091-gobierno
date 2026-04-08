'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Download, FileSpreadsheet, Loader2, Sheet } from 'lucide-react';
import { useState } from 'react';

interface ExportDropdownProps {
  className?: string;
}

export function ExportDropdown({ className }: ExportDropdownProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const downloadFile = (base64: string, filename: string, mimeType: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (!user) return;

    setLoading('excel');
    try {
      const response = await fetch('/api/mcp/excel/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: user.organization_id,
          user_id: user.id,
          limit: 100,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.base64) {
        downloadFile(data.data.base64, data.data.filename, data.data.mimeType);
      } else {
        alert(data.error || 'Error al exportar');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setLoading(null);
    }
  };

  const handleExportSheets = () => {
    // Abre el diálogo de Google Sheets
    // Se maneja desde el ExportToSheetsDialog
    const event = new CustomEvent('open-sheets-dialog');
    window.dispatchEvent(event);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 border-slate-200/80 gap-2 ${className}`}
          disabled={loading !== null}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleExportExcel}
          disabled={loading === 'excel'}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          <span>Descargar Excel/CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportSheets}
          className="cursor-pointer"
        >
          <Sheet className="w-4 h-4 mr-2 text-green-600" />
          <span>Exportar a Google Sheets</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
