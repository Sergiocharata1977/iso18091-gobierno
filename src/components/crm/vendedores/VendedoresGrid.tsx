'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Mail, Shield, User } from 'lucide-react';

interface UserData {
  uid: string;
  email: string;
  rol: string;
  personnelData?: {
    nombres: string;
    apellidos: string;
    email: string;
  };
  metadata: {
    lastSignInTime?: string;
  };
}

interface VendedoresGridProps {
  users: UserData[];
}

export function VendedoresGrid({ users }: VendedoresGridProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay vendedores registrados</p>
        <p className="text-sm">Invita o asigna vendedores para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(u => (
        <Card key={u.uid} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {u.personnelData
                    ? `${u.personnelData.nombres} ${u.personnelData.apellidos}`
                    : 'Usuario Sistema'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {u.rol === 'vendedor' && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-100 text-purple-700 border-0"
                    >
                      Vendedor
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                    Activo
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span className="truncate">{u.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3" />
                <span className="capitalize">{u.rol.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>
                  Último acceso:{' '}
                  {u.metadata.lastSignInTime
                    ? new Date(u.metadata.lastSignInTime).toLocaleDateString()
                    : 'Nunca'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
