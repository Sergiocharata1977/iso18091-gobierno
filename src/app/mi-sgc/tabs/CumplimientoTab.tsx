'use client';

import { ProcessComplianceMatrix } from '@/components/compliance/ProcessComplianceMatrix';
import { typography } from '@/components/design-system/tokens';
import { NormPointsDashboard } from '@/components/normPoints/NormPointsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CumplimientoTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={typography.h2}>
          Cumplimiento ISO 9001
        </h2>
        <p className={`${typography.p} mt-1`}>
          Estado de cumplimiento por capítulo y procesos obligatorios
        </p>
      </div>

      <Tabs defaultValue="procesos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="procesos">Procesos Obligatorios</TabsTrigger>
          <TabsTrigger value="norma">Puntos de Norma</TabsTrigger>
        </TabsList>

        <TabsContent value="procesos" className="space-y-4">
          <ProcessComplianceMatrix />
        </TabsContent>

        <TabsContent value="norma" className="space-y-4">
          <NormPointsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
