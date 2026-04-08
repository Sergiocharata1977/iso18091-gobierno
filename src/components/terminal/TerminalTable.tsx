'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Terminal } from '@/types/terminal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { TerminalStatusBadge } from './TerminalStatusBadge';

interface TerminalTableProps {
  terminals: Terminal[];
  onQuarantine: (id: string) => void;
  quarantineLoading?: string | null;
}

export function TerminalTable({ terminals, onQuarantine, quarantineLoading }: TerminalTableProps) {
  if (terminals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay terminales registradas aún.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Terminal</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Departamento / Puesto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Última actividad</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {terminals.map(terminal => (
          <TableRow key={terminal.id}>
            <TableCell>
              <div className="font-medium">{terminal.nombre}</div>
              {terminal.hostname && (
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{terminal.hostname}</div>
              )}
            </TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">{terminal.personnel_id}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm">{terminal.departamento_nombre}</div>
              <div className="text-xs text-muted-foreground">{terminal.puesto_nombre}</div>
            </TableCell>
            <TableCell>
              <TerminalStatusBadge status={terminal.status} />
            </TableCell>
            <TableCell>
              {terminal.last_heartbeat ? (
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(terminal.last_heartbeat.toDate(), {
                    locale: es,
                    addSuffix: true,
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Link href={`/terminales/${terminal.id}`}>
                  <Button variant="ghost" size="sm" aria-label="Ver detalle">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                {terminal.status !== 'quarantined' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Cuarentenar terminal"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => onQuarantine(terminal.id)}
                    disabled={quarantineLoading === terminal.id}
                  >
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
