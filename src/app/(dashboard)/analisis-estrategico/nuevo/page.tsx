'use client';

import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { GenerateStrategicAnalysisForm } from '@/components/strategic-analysis/GenerateStrategicAnalysisForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NuevoAnalisisEstrategicoPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Nuevo analisis estrategico</h1>
          <p className="text-sm text-slate-600">Defina alcance, orientacion y entidad objetivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <DocumentationRouteButton route="/analisis-estrategico/nuevo" label="Manual" />
          <Button asChild variant="outline">
            <Link href="/analisis-estrategico">Volver al historial</Link>
          </Button>
        </div>
      </div>
      <GenerateStrategicAnalysisForm />
    </div>
  );
}
