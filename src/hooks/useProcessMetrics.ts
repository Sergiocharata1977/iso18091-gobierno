'use client';

import { useEffect, useState } from 'react';
import type { ProcessMetric } from '@/types/process-map';

export function useProcessMetrics() {
  const [metrics, setMetrics] = useState<Record<string, ProcessMetric>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mapa-procesos/metrics')
      .then(r => (r.ok ? r.json() : {}))
      .then((data: Record<string, ProcessMetric>) => setMetrics(data))
      .catch(() => setMetrics({}))
      .finally(() => setLoading(false));
  }, []);

  return { metrics, loading };
}
