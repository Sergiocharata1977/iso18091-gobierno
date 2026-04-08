'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ClienteCRM } from '@/types/crm';
import { Building2, Eye, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

interface ClientesGridProps {
  clientes: ClienteCRM[];
}

export function ClientesGrid({ clientes }: ClientesGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clientes.map(cliente => (
        <Card key={cliente.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {cliente.razon_social}
                </h3>
                {cliente.nombre_comercial && (
                  <p className="text-xs text-muted-foreground truncate">
                    {cliente.nombre_comercial}
                  </p>
                )}
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {cliente.tipo_cliente?.replace('_', ' ') || 'Sin tipo'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              {cliente.cuit_cuil && (
                <p className="font-mono text-xs">{cliente.cuit_cuil}</p>
              )}

              {cliente.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}

              {cliente.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{cliente.telefono}</span>
                </div>
              )}

              {(cliente.localidad || cliente.provincia) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{cliente.localidad || cliente.provincia}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t">
              <Link href={`/crm/clientes/${cliente.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalle
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
