'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IdentityCardProps {
  fullName: string;
  profileEmail?: string | null;
  supervisorNombre?: string | null;
  tieneAcceso?: boolean;
}

export function IdentityCard({
  fullName,
  profileEmail,
  supervisorNombre,
  tieneAcceso,
}: IdentityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identidad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-slate-500">Persona</p>
          <p className="font-medium">{fullName}</p>
        </div>
        <div>
          <p className="text-slate-500">Email</p>
          <p className="font-medium">{profileEmail || 'No disponible'}</p>
        </div>
        <div>
          <p className="text-slate-500">Supervisor</p>
          <p className="font-medium">{supervisorNombre || 'No asignado'}</p>
        </div>
        <div>
          <p className="text-slate-500">Acceso</p>
          <p className="font-medium">
            {tieneAcceso ? 'Usuario vinculado' : 'Sin acceso confirmado'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
