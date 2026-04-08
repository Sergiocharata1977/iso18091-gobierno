/**
 * MejorasSidebar - Módulo Mejora Continua
 * Migrado al Design System SidebarShell (light theme)
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Zap,
} from 'lucide-react';

const menuItems: SidebarNavItem[] = [
  {
    label: 'Dashboard Mejoras',
    href: '/mejoras',
    icon: BarChart3,
  },
  {
    label: 'Auditorías',
    href: '/mejoras/auditorias',
    icon: ClipboardCheck,
  },
  {
    label: 'Hallazgos',
    href: '/mejoras/hallazgos',
    icon: AlertTriangle,
    badge: 'NC/OBS',
  },
  {
    label: 'Acciones',
    href: '/mejoras/acciones',
    icon: CheckCircle,
    badge: 'CAPA',
  },
  {
    label: 'Encuestas',
    href: '/mejoras/encuestas',
    icon: MessageSquare,
  },
  {
    label: 'Declaraciones',
    href: '/mejoras/declaraciones',
    icon: FileText,
  },
];

export function MejorasSidebar() {
  return (
    <ModuleSidebar
      moduleName="MEJORA"
      subtitle="Mejora Continua"
      moduleIcon={<Zap className="w-4 h-4" />}
      items={menuItems}
      accent="amber"
      docModule="acciones"
      footer={
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3">
          <p className="text-xs text-amber-400 font-medium">Mejora Continua</p>
          <p className="text-xs text-slate-400 mt-1">
            Cláusula 10 · Ciclos PDCA
          </p>
        </div>
      }
    />
  );
}
