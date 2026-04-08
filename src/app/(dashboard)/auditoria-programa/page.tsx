'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClipboardList } from 'lucide-react';

export default function AuditoriaProgramaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Programa de Auditorías"
        description="Planificación anual de auditorías multistandard conforme a ISO 19011."
        breadcrumbs={[
          { label: 'Auditorías', href: '/auditorias' },
          { label: 'Programa de Auditorías' },
        ]}
      />
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-600" />
            Módulo en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            El Programa de Auditorías (ISO 19011) está disponible en esta edición.
            La interfaz completa estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
