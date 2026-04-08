'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'operario',
    createPersonnel: true,
    nombres: '',
    apellidos: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Usuario creado',
          description: `Usuario ${formData.email} creado exitosamente`,
        });
        router.push('/admin/usuarios');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'No se pudo crear el usuario',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al crear usuario',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crear Usuario del Sistema"
        description="Crea un nuevo usuario con acceso al sistema"
        breadcrumbs={[
          { label: 'Administración', href: '/admin/usuarios' },
          { label: 'Usuarios', href: '/admin/usuarios' },
          { label: 'Crear' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="usuario@empresa.com"
                required
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se enviará una invitación a este email
              </p>
            </div>

            {/* Rol */}
            <div>
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={value =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="jefe">Jefe</SelectItem>
                  <SelectItem value="operario">Operario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Crear Personnel */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createPersonnel"
                checked={formData.createPersonnel}
                onChange={e =>
                  setFormData({
                    ...formData,
                    createPersonnel: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="createPersonnel" className="cursor-pointer">
                Crear registro de Personnel automáticamente
              </Label>
            </div>

            {/* Personnel Data */}
            {formData.createPersonnel && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-sm">Datos del Empleado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombres">Nombres *</Label>
                    <Input
                      id="nombres"
                      value={formData.nombres}
                      onChange={e =>
                        setFormData({ ...formData, nombres: e.target.value })
                      }
                      required={formData.createPersonnel}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apellidos">Apellidos *</Label>
                    <Input
                      id="apellidos"
                      value={formData.apellidos}
                      onChange={e =>
                        setFormData({ ...formData, apellidos: e.target.value })
                      }
                      required={formData.createPersonnel}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
