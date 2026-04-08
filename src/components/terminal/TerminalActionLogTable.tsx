'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ActionResult, TerminalActionLog } from '@/types/terminal-action-log';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle } from 'lucide-react';

const RESULT_CONFIG: Record<ActionResult, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  success: { label: 'Éxito', variant: 'success' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
  pending_approval: { label: 'Pendiente', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
};

interface TerminalActionLogTableProps {
  logs: TerminalActionLog[];
  onApprove?: (logId: string) => void;
  onReject?: (logId: string) => void;
  actionLoading?: string | null;
}

export function TerminalActionLogTable({
  logs,
  onApprove,
  onReject,
  actionLoading,
}: TerminalActionLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No hay acciones registradas.
      </div>
    );
  }

  const showActions = Boolean(onApprove || onReject);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tool</TableHead>
          <TableHead>Resultado</TableHead>
          <TableHead>Proceso ISO</TableHead>
          <TableHead>Duración</TableHead>
          <TableHead>Fecha</TableHead>
          {showActions && <TableHead className="text-right">Acción</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map(log => {
          const resultConfig = RESULT_CONFIG[log.result];
          const isPending = log.result === 'pending_approval';

          return (
            <TableRow key={log.id}>
              <TableCell>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {log.tool}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={resultConfig.variant}>{resultConfig.label}</Badge>
                {log.block_reason && (
                  <div className="text-xs text-muted-foreground mt-0.5">{log.block_reason}</div>
                )}
              </TableCell>
              <TableCell>
                {log.proceso_id ? (
                  <span className="text-xs font-mono text-muted-foreground">{log.proceso_id}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {log.duration_ms != null ? (
                  <span className="text-sm">{log.duration_ms}ms</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {log.timestamp
                    ? format(log.timestamp.toDate(), 'dd/MM/yy HH:mm', { locale: es })
                    : '—'}
                </span>
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  {isPending && (
                    <div className="flex items-center justify-end gap-1">
                      {onApprove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Aprobar"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => onApprove(log.id)}
                          disabled={actionLoading === log.id}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Rechazar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => onReject(log.id)}
                          disabled={actionLoading === log.id}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
