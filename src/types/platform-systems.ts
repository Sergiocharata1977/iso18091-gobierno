/**
 * Platform Systems – Modelo federado de aplicaciones
 *
 * Cada "sistema" es un producto desplegado independientemente
 * (9001app, Finanzas, SIG-Agro). Las organizaciones pueden
 * suscribirse a uno o más sistemas.
 */

export type SystemStatus = 'active' | 'maintenance' | 'deprecated';
export type ContractStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface PlatformSystem {
  id: string; // 'iso9001' | 'finanzas' | 'sig-agro'
  name: string; // Display name
  description: string;
  url: string; // URL del deployment
  healthEndpoint: string; // /api/health para monitoreo
  color: string; // Tailwind color name (emerald, rose, amber)
  icon: string; // Lucide icon name
  status: SystemStatus;
  version?: string;
  modules: string[]; // Módulos disponibles en este sistema
  created_at: any; // Firestore Timestamp or Date
  updated_at: any;
}

export interface ContractedSystem {
  systemId: string;
  systemName: string;
  status: ContractStatus;
  modulesEnabled: string[];
  contractedAt: any;
  expiresAt?: any;
  notes?: string;
}

export interface SystemHealthStatus {
  systemId: string;
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  responseTimeMs?: number;
  lastChecked: string; // ISO date string
  version?: string;
  error?: string;
}

/**
 * Extiende el modelo Organization existente con sistemas contratados
 */
export interface OrganizationSystemsData {
  organizationId: string;
  contractedSystems: ContractedSystem[];
}
