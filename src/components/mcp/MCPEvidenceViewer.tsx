'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MCPEvidence } from '@/types/mcp';
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface MCPEvidenceViewerProps {
  evidence: MCPEvidence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MCPEvidenceViewer({
  evidence,
  open,
  onOpenChange,
}: MCPEvidenceViewerProps) {
  if (!evidence) return null;

  const renderContent = () => {
    switch (evidence.tipo) {
      case 'screenshot':
        return (
          <div className="flex items-center justify-center min-h-[300px]">
            <img
              src={evidence.url}
              alt={evidence.descripcion}
              className="max-w-full max-h-[60vh] object-contain rounded-md shadow-sm"
            />
          </div>
        );
      case 'pdf':
        return (
          <div className="w-full h-full min-h-[500px]">
            <iframe
              src={evidence.url}
              className="w-full h-full rounded-md border"
            />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-gray-500">
            <FileText className="w-16 h-16" />
            <p>
              Vista previa no disponible para este formato ({evidence.tipo})
            </p>
            <Button onClick={() => window.open(evidence.url, '_blank')}>
              <Download className="w-4 h-4 mr-2" /> Descargar Archivo
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {evidence.tipo === 'screenshot' ? (
              <ImageIcon className="w-5 h-5 text-blue-500" />
            ) : (
              <FileText className="w-5 h-5 text-orange-500" />
            )}
            {evidence.descripcion}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-slate-50/50 rounded-md border border-slate-100 p-4">
          {renderContent()}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(evidence.url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Abrir en nueva pestaña
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
