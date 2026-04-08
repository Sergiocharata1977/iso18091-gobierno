'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const { toast } = useToast();
  const { usuario } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'operario',
    createPersonnel: true,
    nombres: '',
    apellidos: '',
  });

  const isFormValid = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      return false;
    }
    if (formData.password.length < 6) {
      return false;
    }
    if (
      formData.createPersonnel &&
      (!formData.nombres || !formData.apellidos)
    ) {
      return false;
    }
    return true;
  };

  const checkEmailExists = async (email: string) => {
    if (!email || email.length < 3) return;

    setCheckingEmail(true);
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        const exists = data.users.some(
          (u: { email: string }) =>
            u.email.toLowerCase() === email.toLowerCase()
        );
        setEmailExists(exists);
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Validate personnel data if creating personnel
    if (
      formData.createPersonnel &&
      (!formData.nombres || !formData.apellidos)
    ) {
      toast({
        title: 'Error',
        description:
          'Nombres y apellidos son requeridos cuando se crea personnel',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: usuario?.organization_id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Usuario creado',
          description:
            data.message || `Usuario ${formData.email} creado exitosamente`,
        });
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          role: 'operario',
          createPersonnel: true,
          nombres: '',
          apellidos: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();

        // Show more helpful error messages
        let description = error.message || 'No se pudo crear el usuario';

        // If email already exists, suggest going to users page
        if (response.status === 409 && error.message?.includes('email')) {
          description = error.message;
        }

        toast({
          title: error.error || 'Error',
          description,
          variant: 'destructive',
          duration: 7000, // Longer duration for important errors
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error al crear usuario. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Usuario del Sistema</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario con acceso al sistema. El usuario podrá
            iniciar sesión inmediatamente con la contraseña proporcionada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => {
                const email = e.target.value;
                setFormData({ ...formData, email });
                setEmailExists(false);
              }}
              onBlur={e => checkEmailExists(e.target.value)}
              placeholder="usuario@empresa.com"
              required
              className={`mt-1.5 ${emailExists ? 'border-red-500' : ''}`}
            />
            {checkingEmail && (
              <p className="text-xs text-gray-500 mt-1">Verificando email...</p>
            )}
            {emailExists && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Este email ya está en uso. Ve a la página de usuarios para
                editarlo.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="mt-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={e =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="Repetir contraseña"
              required
              minLength={6}
              className={`mt-1.5 ${
                formData.confirmPassword &&
                formData.password !== formData.confirmPassword
                  ? 'border-red-500'
                  : ''
              }`}
            />
            {formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Las contraseñas no coinciden
                </p>
              )}
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol *</Label>
            <Select
              value={formData.role}
              onValueChange={value => setFormData({ ...formData, role: value })}
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
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || !isFormValid() || emailExists || checkingEmail
              }
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
      </DialogContent>
    </Dialog>
  );
}
