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
import type { ClienteCRM } from '@/types/crm';
import { Building2, Eye, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';

interface ClientesListProps {
  clientes: ClienteCRM[];
}

export function ClientesList({ clientes }: ClientesListProps) {
  if (clientes.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg border">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
        <p className="text-muted-foreground">
          No se encontraron resultados para tu búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Razón Social</TableHead>
            <TableHead>CUIT/CUIL</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map(cliente => (
            <TableRow key={cliente.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{cliente.razon_social}</p>
                    {cliente.nombre_comercial && (
                      <p className="text-xs text-muted-foreground">
                        {cliente.nombre_comercial}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{cliente.cuit_cuil || '-'}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {cliente.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-32">{cliente.email}</span>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                  {(cliente.whatsapp_phone || cliente.telefono) && (
                    <div className="flex items-center gap-1 text-sm text-slate-400">
                      <MessageSquare className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">
                        {cliente.whatsapp_phone || cliente.telefono}
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{cliente.localidad || cliente.provincia || '-'}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 text-xs rounded-full bg-muted">
                  {cliente.tipo_cliente?.replace('_', ' ') || '-'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/crm/clientes/${cliente.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
