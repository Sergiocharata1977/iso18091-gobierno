// Tipos para el Mapa de Procesos visual (ISO 9001:2015 — cláusula 4.4)

export type ProcessLevelColor = 'emerald' | 'blue' | 'violet' | 'amber';

export interface ProcessItem {
  processKey: string;
  label: string;
  visible: boolean;
  applies: boolean;
  order: number;
  route?: string;
  icon?: string;
  // Stage 2 — métricas (reservado)
  completion?: number;
  maturity?: number;
  pending?: number;
  status?: 'ok' | 'warning' | 'critical';
}

export interface ProcessLevel {
  level: number;
  title: string;
  color: ProcessLevelColor;
  items: ProcessItem[];
}

export interface ProcessMapConfig {
  levels: ProcessLevel[];
}

// Stage 2 — métrica en tiempo real por proceso (calculada en /api/mapa-procesos/metrics)
export interface ProcessMetric {
  pending?: number;  // ítems que requieren atención (vencidos, expirando, abiertos)
  total?: number;    // total de ítems en ese proceso
  status?: 'ok' | 'warning' | 'critical';
}
