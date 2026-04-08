'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MCPExecutionStatus, MCPTaskExecution } from '@/types/mcp';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Monitor,
} from 'lucide-react';
import { useState } from 'react';
import { MCPEvidenceViewer } from './MCPEvidenceViewer';

interface MCPExecutionListProps {
  executions: MCPTaskExecution[];
  title?: string;
  limit?: number;
}

export function MCPExecutionList({ executions, title }: MCPExecutionListProps) {
  const [selectedExecution, setSelectedExecution] =
    useState<MCPTaskExecution | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);

  const formatDate = (date: any) => {
    if (!date) return '-';
    // Handle Firestore timestamp or ISO string
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const getStatusBadge = (status: MCPExecutionStatus) => {
    switch (status) {
      case 'exitoso':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
            Exitoso
          </Badge>
        );
      case 'fallido':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
            Fallido
          </Badge>
        );
      case 'parcial':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
            Parcial
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          {title}
        </h3>
      )}

      <div className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-none">
              <TableHead className="text-slate-600 font-semibold">
                Estado
              </TableHead>
              <TableHead className="text-slate-600 font-semibold">
                Tipo / ID
              </TableHead>
              <TableHead className="text-slate-600 font-semibold">
                Origen
              </TableHead>
              <TableHead className="text-slate-600 font-semibold">
                Fecha
              </TableHead>
              <TableHead className="text-right text-slate-600 font-semibold">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Activity className="w-8 h-8" />
                    <p>No hay ejecuciones registradas</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              executions.map(exec => (
                <TableRow
                  key={exec.id}
                  className="hover:bg-slate-50/50 border-slate-100/80 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {exec.estado === 'exitoso' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : exec.estado === 'fallido' ? (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400" />
                      )}
                      {getStatusBadge(exec.estado)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium capitalize text-slate-700">
                        {exec.tipo}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{exec.id.slice(0, 8)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Monitor className="w-3.5 h-3.5" />
                      {exec.sistema_origen}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDate(exec.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedExecution(exec)}
                      className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="sr-only">Ver detalles</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedExecution}
        onOpenChange={open => !open && setSelectedExecution(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              Detalle de Ejecución
              {selectedExecution && getStatusBadge(selectedExecution.estado)}
            </DialogTitle>
          </DialogHeader>

          {selectedExecution && (
            <div className="space-y-6 py-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-gray-500 text-xs mb-1">ID Ejecución</p>
                  <p className="font-mono font-medium">
                    {selectedExecution.id}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-gray-500 text-xs mb-1">Fecha</p>
                  <p className="font-medium">
                    {formatDate(selectedExecution.created_at)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-gray-500 text-xs mb-1">Sistema Origen</p>
                  <p className="font-medium flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedExecution.sistema_origen}
                  </p>
                  <a
                    href={selectedExecution.url_origen}
                    target="_blank"
                    className="text-xs text-blue-500 hover:underline truncate block mt-1"
                  >
                    {selectedExecution.url_origen}
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-gray-500 text-xs mb-1">Duración</p>
                  <p className="font-medium">
                    {selectedExecution.duracion_ms} ms
                  </p>
                </div>
              </div>

              {/* Pasos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Log de Pasos
                </h4>
                <div className="border rounded-md divide-y text-sm">
                  {selectedExecution.log_pasos.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 flex items-start gap-3 hover:bg-slate-50"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                        {step.orden}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {step.accion}
                        </p>
                        {step.selector && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            Selector: {step.selector}
                          </p>
                        )}
                        {step.error_mensaje && (
                          <p className="text-xs text-red-600 mt-1 bg-red-50 p-1.5 rounded">
                            Error: {step.error_mensaje}
                          </p>
                        )}
                      </div>
                      <div>
                        {step.resultado === 'ok' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidencias */}
              {selectedExecution.evidencias &&
                selectedExecution.evidencias.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Evidencias Capturadas
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedExecution.evidencias.map((ev, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-video bg-slate-100 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition-all"
                          onClick={() => setSelectedEvidence(ev)}
                        >
                          {ev.tipo === 'screenshot' ? (
                            <img
                              src={ev.url}
                              alt={ev.descripcion}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <FileText className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs truncate backdrop-blur-sm">
                            {ev.descripcion}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evidence Viewer Overlay */}
      <MCPEvidenceViewer
        evidence={selectedEvidence}
        open={!!selectedEvidence}
        onOpenChange={open => !open && setSelectedEvidence(null)}
      />
    </div>
  );
}
