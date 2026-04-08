'use client';

import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Activity, ListChecks, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Finding, FindingsList } from './FindingsList';
import { HealthGauge } from './HealthGauge';

const MOCK_FINDINGS: Finding[] = [
  {
    id: '1',
    code: 'DOC-001',
    title: 'Politica de calidad vencida',
    severity: 'CRITICAL',
    evidence: 'Last review: 540 days ago (limit: 365)',
    daysOpen: 12,
  },
  {
    id: '2',
    code: 'AUTH-002',
    title: 'Segregacion de funciones invalida',
    severity: 'HIGH',
    evidence: 'Author (J.Perez) == Approver',
    daysOpen: 2,
  },
  {
    id: '3',
    code: 'AUD-005',
    title: 'Auditoria sin cierre formal',
    severity: 'MEDIUM',
    evidence: 'Audit #2023-Q4 is open since Dec 2023',
    daysOpen: 45,
  },
  {
    id: '4',
    code: 'ACT-012',
    title: 'Accion correctiva pendiente',
    severity: 'HIGH',
    evidence: 'Deadline passed 7 days ago',
    daysOpen: 7,
  },
  {
    id: '5',
    code: 'RRHH-001',
    title: 'Certificacion de auditor vencida',
    severity: 'LOW',
    evidence: 'M.Garcia cert expired yesterday',
    daysOpen: 1,
  },
];

export function GovernanceDashboard() {
  const [score, setScore] = useState(85);
  const [findings, setFindings] = useState(MOCK_FINDINGS);

  const severityData = [
    {
      name: 'Critical',
      value: findings.filter(f => f.severity === 'CRITICAL').length,
      color: '#f43f5e',
    },
    {
      name: 'High',
      value: findings.filter(f => f.severity === 'HIGH').length,
      color: '#f97316',
    },
    {
      name: 'Medium',
      value: findings.filter(f => f.severity === 'MEDIUM').length,
      color: '#f59e0b',
    },
    {
      name: 'Low',
      value: findings.filter(f => f.severity === 'LOW').length,
      color: '#3b82f6',
    },
  ].filter(item => item.value > 0);

  const weeklyTrendData = [
    { week: 'W-5', open: 11, closed: 4 },
    { week: 'W-4', open: 10, closed: 5 },
    { week: 'W-3', open: 9, closed: 6 },
    { week: 'W-2', open: 8, closed: 7 },
    { week: 'W-1', open: 7, closed: 8 },
    { week: 'Now', open: findings.length, closed: 9 },
  ];

  const agingData = [
    { bucket: '0-7d', total: findings.filter(f => f.daysOpen <= 7).length },
    {
      bucket: '8-30d',
      total: findings.filter(f => f.daysOpen > 7 && f.daysOpen <= 30).length,
    },
    { bucket: '31d+', total: findings.filter(f => f.daysOpen > 30).length },
  ];

  const handleFix = (id: string) => {
    setFindings(prev => prev.filter(f => f.id !== id));
    setScore(prev => Math.min(100, prev + 5));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 border border-emerald-100 p-2">
        <PageHeader
          title="Governance Monitor"
          description="Monitoreo activo de riesgos y cumplimiento ISO 9001 con trazabilidad operativa."
          breadcrumbs={[
            { label: 'Mi SGC', href: '/mi-sgc' },
            { label: 'Gaps' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BaseCard className="lg:col-span-2 border-emerald-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
              <Activity className="w-5 h-5 text-amber-500" />
              Hallazgos activos
            </h3>
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
              {findings.length}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
            <BaseCard className="border-slate-200 bg-slate-50/70">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Tendencia semanal
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="open"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="closed"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </BaseCard>

            <BaseCard className="border-slate-200 bg-slate-50/70">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Severidad actual
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={32}
                      outerRadius={58}
                      paddingAngle={3}
                    >
                      {severityData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </BaseCard>

            <BaseCard className="border-slate-200 bg-slate-50/70">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Aging de hallazgos
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BaseCard>
          </div>

          <FindingsList findings={findings} onFix={handleFix} />

          {findings.length === 0 && (
            <div className="text-center py-10 border border-dashed border-emerald-200 rounded-xl bg-emerald-50/60 mt-4">
              <ShieldCheck className="w-11 h-11 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-emerald-800">
                Sistema estable
              </h3>
              <p className="text-emerald-700 text-sm">
                No hay riesgos de gobernanza activos en este momento.
              </p>
            </div>
          )}
        </BaseCard>

        <div className="space-y-4">
          <BaseCard className="border-sky-100 bg-white">
            <HealthGauge score={score} trend={2.5} />
          </BaseCard>

          <BaseCard className="border-cyan-100 bg-white">
            <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-4">
              Compliance por dominio
            </h4>
            <div className="space-y-4">
              <DomainProgress
                label="Control documental"
                percent={92}
                color="bg-emerald-500"
              />
              <DomainProgress
                label="Gestion de auditorias"
                percent={65}
                color="bg-amber-500"
              />
              <DomainProgress
                label="Riesgos e incidentes"
                percent={88}
                color="bg-blue-500"
              />
              <DomainProgress
                label="RRHH y competencias"
                percent={100}
                color="bg-teal-500"
              />
            </div>
          </BaseCard>

          <BaseCard className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-lg text-indigo-700">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">
                  Night Watch activo
                </h4>
                <p className="text-sm text-slate-600">
                  Ultimo barrido: 145 documentos y 32 auditorias analizadas hace
                  4 horas.
                </p>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  );
}

function DomainProgress({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">{percent}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
