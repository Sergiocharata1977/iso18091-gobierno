'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Bot, Loader2, Settings2 } from 'lucide-react';
import Link from 'next/link';

export default function MCPProfilesPage() {
  const { usuario, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!usuario?.organization_id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No se encontro una organizacion para este usuario.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Perfiles de Agente
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuracion de capacidades y perfiles operativos MCP.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm">
              Esta pantalla se agrego para completar la navegacion MCP y dejar
              preparada la supervision de perfiles.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Siguiente iteracion recomendada:
            </p>
            <p className="text-sm mt-1">
              listar perfiles por puesto (`agent_profiles`) y sus capacidades
              efectivas por usuario (`agent_instances`).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/mcp">
              <Button variant="outline">Volver al MCP</Button>
            </Link>
            <Link href="/mcp/dashboard">
              <Button>
                <Bot className="mr-2 h-4 w-4" />
                Ir al Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
