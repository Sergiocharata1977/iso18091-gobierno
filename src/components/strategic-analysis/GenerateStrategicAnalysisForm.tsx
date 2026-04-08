'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StrategicAnalysisScope } from '@/types/strategic-analysis';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const scopes: Array<{ value: StrategicAnalysisScope; label: string }> = [
  { value: 'organization_general', label: 'Organizacional' },
  { value: 'process', label: 'Por proceso' },
  { value: 'role', label: 'Por puesto' },
  { value: 'person', label: 'Por persona' },
  { value: 'management_review', label: 'Revision por direccion' },
];

export function GenerateStrategicAnalysisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<StrategicAnalysisScope>('organization_general');
  const [targetType, setTargetType] = useState<'organization' | 'process' | 'role' | 'person'>('organization');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [readingOrientation, setReadingOrientation] = useState<'direccion' | 'jefatura' | 'operativo'>('direccion');
  const [horizon, setHorizon] = useState<'30d' | '60d' | '90d'>('30d');

  const needsTarget = scope === 'process' || scope === 'role' || scope === 'person';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const body: Record<string, unknown> = {
        scope,
        horizon,
        include_plugins: true,
        reading_orientation: readingOrientation,
      };

      if (needsTarget) {
        body.target_type = targetType;
        body.target_id = targetId;
        body.target_name = targetName;
      }

      const res = await fetch('/api/strategic-analysis/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo generar el analisis');
      }

      const reportId = json?.report?.id as string | undefined;
      if (!reportId) throw new Error('No se recibio ID del reporte');
      router.push(`/analisis-estrategico/${reportId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Error al generar analisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar analisis estrategico</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-slate-700">Scope de analisis</span>
            <select
              value={scope}
              onChange={event => setScope(event.target.value as StrategicAnalysisScope)}
              className="w-full rounded-md border px-3 py-2"
            >
              {scopes.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {needsTarget ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-sm">
                <span className="text-slate-700">Entidad objetivo</span>
                <select
                  value={targetType}
                  onChange={event => setTargetType(event.target.value as 'organization' | 'process' | 'role' | 'person')}
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="process">Proceso</option>
                  <option value="role">Puesto</option>
                  <option value="person">Persona</option>
                  <option value="organization">Organizacion</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-700">ID objetivo</span>
                <input
                  value={targetId}
                  onChange={event => setTargetId(event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="id"
                  required
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-700">Nombre objetivo</span>
                <input
                  value={targetName}
                  onChange={event => setTargetName(event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Nombre opcional"
                />
              </label>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-700">Orientacion de lectura</span>
              <select
                value={readingOrientation}
                onChange={event => setReadingOrientation(event.target.value as 'direccion' | 'jefatura' | 'operativo')}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="direccion">Direccion</option>
                <option value="jefatura">Jefatura</option>
                <option value="operativo">Operativo</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-700">Horizonte</span>
              <select
                value={horizon}
                onChange={event => setHorizon(event.target.value as '30d' | '60d' | '90d')}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="30d">30 dias</option>
                <option value="60d">60 dias</option>
                <option value="90d">90 dias</option>
              </select>
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? 'Generando...' : 'Generar informe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
