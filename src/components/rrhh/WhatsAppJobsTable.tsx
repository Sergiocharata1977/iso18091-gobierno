'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type WhatsAppJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type WhatsAppJobIntent = 'task.assign' | 'task.reminder';

export interface WhatsAppEmployeeResponse {
  message: string;
  detected_intent: string;
  created_at: string | null;
}

export interface WhatsAppJobListItem {
  id: string;
  intent: WhatsAppJobIntent;
  status: WhatsAppJobStatus;
  raw_status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: unknown;
  created_at: string | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  employee_phone: string | null;
  employee_name: string | null;
  message_sent: string | null;
  conversation_id: string | null;
  employee_response: WhatsAppEmployeeResponse | null;
}

export interface WhatsAppJobFilters {
  status: 'all' | WhatsAppJobStatus;
  intent: 'all' | WhatsAppJobIntent;
  date_from: string;
  date_to: string;
}

interface WhatsAppJobsTableProps {
  jobs: WhatsAppJobListItem[];
  loading: boolean;
  filters: WhatsAppJobFilters;
  retryingJobId: string | null;
  onFiltersChange: (next: WhatsAppJobFilters) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onViewDetail: (job: WhatsAppJobListItem) => void;
  onRetry: (jobId: string) => void;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
}

function getStatusBadgeClass(status: WhatsAppJobStatus): string {
  if (status === 'pending') return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
  if (status === 'processing') return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  return 'bg-red-100 text-red-800 hover:bg-red-100';
}

function getIntentLabel(intent: WhatsAppJobIntent): string {
  return intent === 'task.assign' ? 'Asignacion' : 'Recordatorio';
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export function WhatsAppJobsTable({
  jobs,
  loading,
  filters,
  retryingJobId,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  onViewDetail,
  onRetry,
}: WhatsAppJobsTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Estado</p>
            <Select
              value={filters.status}
              onValueChange={value =>
                onFiltersChange({
                  ...filters,
                  status: value as WhatsAppJobFilters['status'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tipo</p>
            <Select
              value={filters.intent}
              onValueChange={value =>
                onFiltersChange({
                  ...filters,
                  intent: value as WhatsAppJobFilters['intent'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="task.assign">Asignacion</SelectItem>
                <SelectItem value="task.reminder">Recordatorio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Desde</p>
            <Input
              type="date"
              value={filters.date_from}
              onChange={event =>
                onFiltersChange({ ...filters, date_from: event.target.value })
              }
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Hasta</p>
            <Input
              type="date"
              value={filters.date_to}
              onChange={event =>
                onFiltersChange({ ...filters, date_to: event.target.value })
              }
            />
          </div>

          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" onClick={onResetFilters}>
              Limpiar
            </Button>
            <Button onClick={onApplyFilters}>Aplicar</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de envio</TableHead>
              <TableHead>Respuesta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Cargando jobs...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay jobs para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{job.employee_phone || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.employee_name || 'Sin nombre'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getIntentLabel(job.intent)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(job.status)}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(job.created_at)}</TableCell>
                  <TableCell>
                    {job.employee_response ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          {truncate(job.employee_response.message, 60)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Intent: {job.employee_response.detected_intent}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin respuesta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetail(job)}
                      >
                        Ver detalle
                      </Button>
                      {job.status === 'failed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={retryingJobId === job.id}
                          onClick={() => onRetry(job.id)}
                        >
                          {retryingJobId === job.id ? 'Reintentando...' : 'Reintentar'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

