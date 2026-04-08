'use client';

import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  allowPublicDemoRequests: boolean;
}

export default function SuperAdminConfiguracionPage() {
  const [form, setForm] = useState<PlatformConfig>({
    platformName: 'Don Candido IA Platform',
    supportEmail: 'soporte@doncandidoia.com',
    defaultTrialDays: 30,
    maintenanceMode: false,
    allowPublicDemoRequests: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/super-admin/configuration', {
          cache: 'no-store',
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setForm({
            platformName: json.data.platformName || 'Don Candido IA Platform',
            supportEmail: json.data.supportEmail || 'soporte@doncandidoia.com',
            defaultTrialDays: Number(json.data.defaultTrialDays || 30),
            maintenanceMode: Boolean(json.data.maintenanceMode),
            allowPublicDemoRequests: Boolean(json.data.allowPublicDemoRequests),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/super-admin/configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(`Error guardando: ${json?.error || 'desconocido'}`);
        return;
      }
      setMessage('Configuracion guardada correctamente.');
    } catch {
      setMessage('Error de red al guardar configuracion.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-600">
        Cargando configuracion...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <PageHeader
        title="Configuración Sistema"
        description="Parámetros globales de la plataforma."
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Configuración' },
        ]}
      />

      <BaseCard padding="lg">
        <h3 className="text-lg font-semibold mb-4">General</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de plataforma</Label>
            <Input
              value={form.platformName}
              onChange={e =>
                setForm(prev => ({ ...prev, platformName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Email soporte</Label>
            <Input
              value={form.supportEmail}
              onChange={e =>
                setForm(prev => ({ ...prev, supportEmail: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Dias trial por defecto</Label>
            <Input
              type="number"
              min={1}
              value={form.defaultTrialDays}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  defaultTrialDays: Number(e.target.value || 30),
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    maintenanceMode: e.target.checked,
                  }))
                }
              />
              Modo mantenimiento
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.allowPublicDemoRequests}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    allowPublicDemoRequests: e.target.checked,
                  }))
                }
              />
              Permitir solicitudes demo publicas
            </label>
          </div>
        </div>
      </BaseCard>

      <BaseCard padding="lg">
        <h3 className="text-lg font-semibold mb-2">IA</h3>
        <p className="text-sm text-slate-600">
          Gestiona tiers, markups, costos base y limites desde el panel de
          precios IA.
        </p>
        <div className="mt-4">
          <Link href="/super-admin/ia-precios">
            <Button variant="outline">Abrir precios IA</Button>
          </Link>
        </div>
      </BaseCard>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </Button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
