/**
 * RRHHSidebar — Módulo Recursos Humanos
 * Items dinámicos según capabilities instaladas:
 *   - Core: siempre visible
 *   - Plugin A (rrhh_ciclo_vida): ATS, Onboarding, Contratos, Offboarding
 *   - Plugin B (rrhh_operaciones): Planificación, Asistencia
 *   - Plugin C (rrhh_estrategico): Clima, Talento, Relaciones Laborales
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';
import {
  Award,
  BarChart2,
  Briefcase,
  Building,
  Clock,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Heart,
  Scale,
  Star,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
  Workflow,
} from 'lucide-react';

const CORE_ITEMS: SidebarNavItem[] = [
  { label: 'Departamentos', href: '/rrhh/departments', icon: Building },
  { label: 'Puestos', href: '/rrhh/positions', icon: Briefcase },
  { label: 'Personal', href: '/rrhh/personal', icon: UserCheck },
  { label: 'Capacitaciones', href: '/rrhh/capacitaciones', icon: GraduationCap },
  { label: 'Competencias', href: '/rrhh/competencias', icon: Award },
  { label: 'Evaluaciones', href: '/rrhh/evaluaciones', icon: FileText },
  { label: 'Matriz Polivalencia', href: '/rrhh/matriz-polivalencia', icon: FileSpreadsheet },
  { label: 'Kanban', href: '/rrhh/kanban', icon: Workflow, badge: 'Tareas' },
];

const CICLO_VIDA_ITEMS: SidebarNavItem[] = [
  { label: 'Atracción y Selección', href: '/rrhh/ats', icon: UserSearch },
  { label: 'Onboarding', href: '/rrhh/onboarding', icon: UserPlus },
  { label: 'Contratos y Legajos', href: '/rrhh/contratos', icon: FileText },
  { label: 'Offboarding', href: '/rrhh/offboarding', icon: UserMinus },
];

const OPERACIONES_ITEMS: SidebarNavItem[] = [
  { label: 'Planificación RRHH', href: '/rrhh/planificacion', icon: BarChart2 },
  { label: 'Asistencia', href: '/rrhh/asistencia', icon: Clock },
];

const ESTRATEGICO_ITEMS: SidebarNavItem[] = [
  { label: 'Clima y Bienestar', href: '/rrhh/clima', icon: Heart },
  { label: 'Gestión del Talento', href: '/rrhh/talento', icon: Star },
  { label: 'Relaciones Laborales', href: '/rrhh/relaciones', icon: Scale },
];

export function RRHHSidebar() {
  const { hasCapability, loading } = useInstalledCapabilities();
  const hasCicloVida = !loading && hasCapability('rrhh_ciclo_vida');
  const hasOperaciones = !loading && hasCapability('rrhh_operaciones');
  const hasEstrategico = !loading && hasCapability('rrhh_estrategico');

  const items: SidebarNavItem[] = [
    ...CORE_ITEMS,
    ...(hasCicloVida ? CICLO_VIDA_ITEMS : []),
    ...(hasOperaciones ? OPERACIONES_ITEMS : []),
    ...(hasEstrategico ? ESTRATEGICO_ITEMS : []),
  ];

  return (
    <ModuleSidebar
      moduleName="RRHH"
      subtitle="Recursos Humanos"
      moduleIcon={<Users className="w-4 h-4" />}
      items={items}
      accent="purple"
      docModule="rrhh"
      footer={
        <div className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 rounded-lg p-3">
          <p className="text-xs text-purple-400 font-medium">Gestión de Personal</p>
          <p className="text-xs text-slate-400 mt-1">Cláusula 7.2 · Competencias</p>
        </div>
      }
    />
  );
}
