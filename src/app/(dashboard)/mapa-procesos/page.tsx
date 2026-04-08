'use client';

import { ProcessMapPanel } from '@/components/process-map/ProcessMapPanel';

export default function MapaProcesosPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f3_42%,#f8fafc_100%)] px-4 py-6 md:px-8 lg:px-10 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <ProcessMapPanel />
    </div>
  );
}
