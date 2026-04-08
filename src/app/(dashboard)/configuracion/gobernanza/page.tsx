'use client';

import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_GOVERNANCE_THRESHOLDS,
  GovernanceThresholdConfig,
} from '@/types/processes-unified';
import { useEffect, useState } from 'react';

interface GovernanceConfigForm {
  enabled: boolean;
  thresholds: GovernanceThresholdConfig;
}

const DEFAULT_FORM: GovernanceConfigForm = {
  enabled: true,
  thresholds: { ...DEFAULT_GOVERNANCE_THRESHOLDS },
};

export default function GovernanceConfigPage() {
  const [form, setForm] = useState<GovernanceConfigForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/governance/config', {
          cache: 'no-store',
        });
        const json = await res.json();

        if (res.ok && json.success && json.data) {
          setForm({
            enabled:
              typeof json.data.enabled === 'boolean' ? json.data.enabled : true,
            thresholds: {
              ...DEFAULT_GOVERNANCE_THRESHOLDS,
              ...(json.data.thresholds || {}),
            },
          });
        }
      } catch {
        setMessage('No se pudo cargar la configuracion de gobernanza.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const setThreshold = (
    key: keyof GovernanceThresholdConfig,
    value: number
  ) => {
    setForm(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/governance/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setMessage(`Error guardando: ${json?.error || 'desconocido'}`);
        return;
      }

      setForm({
        enabled: json.data.enabled,
        thresholds: {
          ...DEFAULT_GOVERNANCE_THRESHOLDS,
          ...(json.data.thresholds || {}),
        },
      });
      setMessage('Gobernanza actualizada correctamente.');
    } catch {
      setMessage('Error de red al guardar configuracion de gobernanza.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-600">
        Cargando configuracion de gobernanza...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <PageHeader
        title="Configuracion de Gobernanza"
        description="Umbrales y reglas para madurez, riesgos y alertas por organizacion."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuracion', href: '/configuracion' },
          { label: 'Gobernanza' },
        ]}
      />

      <BaseCard padding="lg">
        <h3 className="text-lg font-semibold mb-4">Estado general</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e =>
              setForm(prev => ({
                ...prev,
                enabled: e.target.checked,
              }))
            }
          />
          Activar escaneo y alertas de gobernanza
        </label>
      </BaseCard>

      <BaseCard padding="lg">
        <h3 className="text-lg font-semibold mb-4">Umbrales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nivel minimo de madurez</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={form.thresholds.low_maturity_alert_level}
              onChange={e =>
                setThreshold(
                  'low_maturity_alert_level',
                  Number(e.target.value || 1)
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Nivel critico de madurez</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={form.thresholds.critical_maturity_level}
              onChange={e =>
                setThreshold(
                  'critical_maturity_level',
                  Number(e.target.value || 1)
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Minimo controles faltantes para alerta</Label>
            <Input
              type="number"
              min={1}
              value={form.thresholds.missing_controls_alert_min_count}
              onChange={e =>
                setThreshold(
                  'missing_controls_alert_min_count',
                  Number(e.target.value || 1)
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Umbral RPN alto</Label>
            <Input
              type="number"
              min={1}
              value={form.thresholds.high_rpn_threshold}
              onChange={e =>
                setThreshold('high_rpn_threshold', Number(e.target.value || 80))
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Maximo inconsistencias high para nivel 5</Label>
            <Input
              type="number"
              min={0}
              value={form.thresholds.max_high_severity_for_optimized}
              onChange={e =>
                setThreshold(
                  'max_high_severity_for_optimized',
                  Number(e.target.value || 0)
                )
              }
            />
          </div>
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
