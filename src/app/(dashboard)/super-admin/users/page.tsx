'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserService } from '@/services/auth/UserService';
import { User } from '@/types/auth';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Search,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // States for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [trialDays, setTrialDays] = useState(30);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await UserService.getAll();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    try {
      await UserService.approveUser(selectedUser.id, trialDays);
      setIsApproveDialogOpen(false);
      loadUsers(); // Reload to see changes
    } catch (error) {
      console.error('Failed to approve user', error);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(
    u => u.status === 'pending_approval' || (u.activo === false && !u.status)
  );
  const activeUsers = filteredUsers.filter(
    u => u.status === 'active' || (u.activo === true && u.status !== 'expired')
  );
  const expiredUsers = filteredUsers.filter(u => u.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Gestión de Usuarios
          </h2>
          <p className="text-slate-400">
            Administra accesos, aprobaciones y suscripciones.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
        <Search className="w-5 h-5 text-slate-500" />
        <Input
          placeholder="Buscar email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus-visible:ring-0 text-white placeholder-slate-500"
        />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500"
          >
            Pendientes{' '}
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-800 text-slate-300"
            >
              {pendingUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
          >
            Activos{' '}
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-800 text-slate-300"
            >
              {activeUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="expired"
            className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500"
          >
            Expirados{' '}
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-800 text-slate-300"
            >
              {expiredUsers.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingUsers.map(user => (
            <Card key={user.id} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {user.email}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Solicitado{' '}
                      {formatDistanceToNow(user.created_at, {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={isApproveDialogOpen && selectedUser?.id === user.id}
                    onOpenChange={open => {
                      if (open) setSelectedUser(user);
                      else {
                        setIsApproveDialogOpen(false);
                        setSelectedUser(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Aprobar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Aprobar Acceso</DialogTitle>
                        <DialogDescription>
                          Configura los días de prueba para {user.email}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="days" className="text-right mb-2 block">
                          Días de Trial
                        </Label>
                        <Input
                          id="days"
                          type="number"
                          value={trialDays}
                          onChange={e => setTrialDays(Number(e.target.value))}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleApprove}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Confirmar y Activar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Rechazar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No hay solicitudes pendientes.
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeUsers.map(user => (
            <Card key={user.id} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {user.email}
                  </h3>
                  <div className="flex gap-4 mt-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                    >
                      {user.planType?.toUpperCase() || 'BASIC'}
                    </Badge>
                    {user.expirationDate && (
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> Vence:{' '}
                        {format(user.expirationDate, 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Administrar
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
