'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import {
  shouldAutoInstallCrmForTenantType,
  type TenantType,
} from '@/lib/onboarding/tenantTypeUtils';
import { useState } from 'react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrganizationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    plan: 'free',
    timezone: 'America/Argentina/Buenos_Aires',
    currency: 'ARS',
    language: 'es',
    tenant_type: 'iso_puro' as TenantType,
    max_users: 50,
    private_sections: true,
    ai_assistant: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          plan: formData.plan,
          timezone: formData.timezone,
          currency: formData.currency,
          language: formData.language,
          tenant_type: formData.tenant_type,
          features: {
            private_sections: formData.private_sections,
            ai_assistant: formData.ai_assistant,
            max_users: formData.max_users,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear organización');
      }

      // Reset form
      setFormData({
        name: '',
        plan: 'free',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        language: 'es',
        tenant_type: 'iso_puro',
        max_users: 50,
        private_sections: true,
        ai_assistant: true,
      });

      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.error('Error:', error);
      alert(
        error instanceof Error ? error.message : 'Error al crear organización'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Organización</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Información Básica
            </h3>

            <div>
              <Label htmlFor="name">Nombre de la Organización *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Empresa XYZ S.A."
                required
              />
            </div>

            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={value =>
                  setFormData({ ...formData, plan: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tenant_type">Perfil del tenant</Label>
              <Select
                value={formData.tenant_type}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    tenant_type: value as TenantType,
                  })
                }
              >
                <SelectTrigger id="tenant_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyme">PyME</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="iso_puro">ISO puro</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-slate-500">
                {shouldAutoInstallCrmForTenantType(formData.tenant_type)
                  ? 'CRM se instalara automaticamente al crear la organizacion.'
                  : 'CRM quedara disponible como instalacion opcional.'}
              </p>
            </div>
          </div>

          {/* Configuración Regional */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Configuración Regional
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={value =>
                    setFormData({ ...formData, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Argentina/Buenos_Aires">
                      Buenos Aires
                    </SelectItem>
                    <SelectItem value="America/Mexico_City">
                      Ciudad de México
                    </SelectItem>
                    <SelectItem value="America/Santiago">Santiago</SelectItem>
                    <SelectItem value="America/Bogota">Bogotá</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={value =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                    <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Características
            </h3>

            <div>
              <Label htmlFor="max_users">Máximo de Usuarios</Label>
              <Input
                id="max_users"
                type="number"
                value={formData.max_users}
                onChange={e =>
                  setFormData({
                    ...formData,
                    max_users: parseInt(e.target.value),
                  })
                }
                min={1}
                max={1000}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.private_sections}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      private_sections: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Secciones Privadas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ai_assistant}
                  onChange={e =>
                    setFormData({ ...formData, ai_assistant: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Asistente IA</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Organización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
