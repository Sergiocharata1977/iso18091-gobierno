'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, Shield, User } from 'lucide-react';

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

interface VendedoresListProps {
  users: UserData[];
}

export function VendedoresList({ users }: VendedoresListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No se encontraron usuarios
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Último Acceso</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(u => (
            <TableRow key={u.uid}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p>
                      {u.personnelData
                        ? `${u.personnelData.nombres} ${u.personnelData.apellidos}`
                        : 'Usuario Sistema'}
                    </p>
                    {u.rol === 'vendedor' && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-0"
                      >
                        Vendedor
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {u.email}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 capitalize">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  {u.rol.replace('_', ' ')}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.metadata.lastSignInTime
                  ? new Date(u.metadata.lastSignInTime).toLocaleDateString()
                  : 'Nunca'}
              </TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                  Activo
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
