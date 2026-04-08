'use client';

import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { PageHeader } from '@/components/design-system';
import { Card, CardContent } from '@/components/ui/card';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';
import Link from 'next/link';
import {
  Award,
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Heart,
  Lock,
  Scale,
  Star,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  Workflow,
} from 'lucide-react';

interface ModuleCard {
  id: string;
  titulo: string;
  descripcion: string;
  icon: React.ElementType;
  ruta: string;
  metrica: string;
  colorIcon: string;
  colorBg: string;
  plugin?: string;
}

const CORE_MODULES: ModuleCard[] = [
  {
    id: 'departments',
    titulo: 'Planificación de RRHH',
    descripcion: 'Alinear necesidades de talento con estrategia',
    icon: Building2,
    ruta: '/rrhh/departments',
    metrica: '6 departamentos activos',
    colorIcon: 'text-blue-600',
    colorBg: 'bg-blue-100',
  },
  {
    id: 'personal',
    titulo: 'Personal',
    descripcion: 'Gestión completa de empleados y legajos',
    icon: UserCheck,
    ruta: '/rrhh/personal',
    metrica: 'Gestión de nómina',
    colorIcon: 'text-purple-600',
    colorBg: 'bg-purple-100',
  },
  {
    id: 'evaluaciones',
    titulo: 'Evaluación de Desempeño',
    descripcion: 'Medición de rendimiento y objetivos',
    icon: FileText,
    ruta: '/rrhh/evaluaciones',
    metrica: 'Evaluaciones periódicas',
    colorIcon: 'text-red-600',
    colorBg: 'bg-red-100',
  },
  {
    id: 'capacitacion',
    titulo: 'Capacitación y Desarrollo',
    descripcion: 'Formación y desarrollo de competencias',
    icon: GraduationCap,
    ruta: '/rrhh/capacitaciones',
    metrica: 'Cursos y programas',
    colorIcon: 'text-cyan-600',
    colorBg: 'bg-cyan-100',
  },
  {
    id: 'competencias',
    titulo: 'Competencias',
    descripcion: 'Definición y gestión de competencias ISO 7.2',
    icon: Award,
    ruta: '/rrhh/competencias',
    metrica: 'Mapa de habilidades',
    colorIcon: 'text-yellow-600',
    colorBg: 'bg-yellow-100',
  },
  {
    id: 'puestos',
    titulo: 'Puestos y Posiciones',
    descripcion: 'Descripción de puestos y organigramas',
    icon: Briefcase,
    ruta: '/rrhh/positions',
    metrica: 'Estructura organizacional',
    colorIcon: 'text-green-600',
    colorBg: 'bg-green-100',
  },
  {
    id: 'matriz',
    titulo: 'Matriz Polivalencia',
    descripcion: 'Flexibilidad y cobertura de habilidades',
    icon: FileSpreadsheet,
    ruta: '/rrhh/matriz-polivalencia',
    metrica: 'Cobertura de roles',
    colorIcon: 'text-teal-600',
    colorBg: 'bg-teal-100',
  },
  {
    id: 'kanban',
    titulo: 'Kanban RRHH',
    descripcion: 'Gestión visual de tareas y procesos',
    icon: Workflow,
    ruta: '/rrhh/kanban',
    metrica: 'Tareas del equipo',
    colorIcon: 'text-indigo-600',
    colorBg: 'bg-indigo-100',
  },
];

const PLUGIN_CICLO_VIDA: ModuleCard[] = [
  {
    id: 'ats',
    titulo: 'Atracción y Selección',
    descripcion: 'Gestión de vacantes y procesos de selección',
    icon: UserSearch,
    ruta: '/rrhh/ats',
    metrica: 'Pipeline de candidatos',
    colorIcon: 'text-green-600',
    colorBg: 'bg-green-100',
    plugin: 'rrhh_ciclo_vida',
  },
  {
    id: 'onboarding',
    titulo: 'Onboarding',
    descripcion: 'Integración de nuevos colaboradores',
    icon: UserPlus,
    ruta: '/rrhh/onboarding',
    metrica: 'Ingresos pendientes',
    colorIcon: 'text-violet-600',
    colorBg: 'bg-violet-100',
    plugin: 'rrhh_ciclo_vida',
  },
  {
    id: 'contratos',
    titulo: 'Contratos y Legajos',
    descripcion: 'Gestión documental y contractual',
    icon: FileText,
    ruta: '/rrhh/contratos',
    metrica: 'Alertas de vencimiento',
    colorIcon: 'text-orange-600',
    colorBg: 'bg-orange-100',
    plugin: 'rrhh_ciclo_vida',
  },
  {
    id: 'offboarding',
    titulo: 'Offboarding',
    descripcion: 'Gestión de salidas y desvinculaciones',
    icon: UserMinus,
    ruta: '/rrhh/offboarding',
    metrica: 'Proceso de egreso',
    colorIcon: 'text-slate-600',
    colorBg: 'bg-slate-100',
    plugin: 'rrhh_ciclo_vida',
  },
];

const PLUGIN_OPERACIONES: ModuleCard[] = [
  {
    id: 'asistencia',
    titulo: 'Asistencia y Presentismo',
    descripcion: 'Control horario, ausencias y alertas',
    icon: Clock,
    ruta: '/rrhh/asistencia',
    metrica: 'Control diario',
    colorIcon: 'text-blue-600',
    colorBg: 'bg-blue-100',
    plugin: 'rrhh_operaciones',
  },
  {
    id: 'sueldos',
    titulo: 'Liquidación de Sueldos',
    descripcion: 'Procesamiento de nóminas y beneficios',
    icon: DollarSign,
    ruta: '/rrhh/sueldos',
    metrica: 'Próxima liquidación',
    colorIcon: 'text-yellow-600',
    colorBg: 'bg-yellow-100',
    plugin: 'rrhh_operaciones',
  },
];

const PLUGIN_ESTRATEGICO: ModuleCard[] = [
  {
    id: 'clima',
    titulo: 'Clima y Bienestar',
    descripcion: 'Ambiente laboral y bienestar organizacional',
    icon: Heart,
    ruta: '/rrhh/clima',
    metrica: 'Encuesta de clima',
    colorIcon: 'text-pink-600',
    colorBg: 'bg-pink-100',
    plugin: 'rrhh_estrategico',
  },
  {
    id: 'talento',
    titulo: 'Gestión del Talento',
    descripcion: 'Planes de carrera y retención',
    icon: Star,
    ruta: '/rrhh/talento',
    metrica: 'Talentos identificados',
    colorIcon: 'text-amber-600',
    colorBg: 'bg-amber-100',
    plugin: 'rrhh_estrategico',
  },
  {
    id: 'relaciones',
    titulo: 'Relaciones Laborales',
    descripcion: 'Cumplimiento legal y relaciones sindicales',
    icon: Scale,
    ruta: '/rrhh/relaciones',
    metrica: '100% cumplimiento',
    colorIcon: 'text-slate-600',
    colorBg: 'bg-slate-100',
    plugin: 'rrhh_estrategico',
  },
];

function ModuleCardItem({ mod }: { mod: ModuleCard }) {
  const Icon = mod.icon;
  return (
    <Link href={mod.ruta}>
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.colorBg}`}>
              <Icon className={`w-5 h-5 ${mod.colorIcon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-800 text-sm group-hover:text-green-700 transition-colors leading-tight">
                {mod.titulo}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{mod.descripcion}</p>
              <p className="text-xs font-medium text-slate-700 mt-2">{mod.metrica}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function RRHHDashboardPage() {
  const { hasCapability, loading } = useInstalledCapabilities();

  const hasCicloVida = !loading && hasCapability('rrhh_ciclo_vida');
  const hasOperaciones = !loading && hasCapability('rrhh_operaciones');
  const hasEstrategico = !loading && hasCapability('rrhh_estrategico');

  const pluginModules = [
    ...(hasCicloVida ? PLUGIN_CICLO_VIDA : []),
    ...(hasOperaciones ? PLUGIN_OPERACIONES : []),
    ...(hasEstrategico ? PLUGIN_ESTRATEGICO : []),
  ];

  const allModules = [...CORE_MODULES, ...pluginModules];

  const hasAnyPlugin = hasCicloVida || hasOperaciones || hasEstrategico;
  const missingPlugins = [
    !hasCicloVida && { id: 'rrhh_ciclo_vida', label: 'Ciclo de Vida del Colaborador' },
    !hasOperaciones && { id: 'rrhh_operaciones', label: 'Operaciones Diarias' },
    !hasEstrategico && { id: 'rrhh_estrategico', label: 'RRHH Estratégico' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="Dashboard de Recursos Humanos"
          description="Sistema de gestión basado en ISO 9001"
          breadcrumbs={[{ label: 'RRHH' }]}
          actions={<ContextHelpButton route="/rrhh" />}
        />

        {/* Grid de módulos */}
        <div>
          {pluginModules.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">Módulos activos</h2>
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full font-medium">
                {pluginModules.length} módulo{pluginModules.length !== 1 ? 's' : ''} adicional{pluginModules.length !== 1 ? 'es' : ''} activo{pluginModules.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {allModules.map(mod => (
              <ModuleCardItem key={mod.id} mod={mod} />
            ))}
          </div>
        </div>

        {/* Banner de plugins disponibles */}
        {!loading && missingPlugins.length > 0 && (
          <Card className="border border-dashed border-green-300 bg-green-50/50 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">Ampliar módulo RRHH</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Activá plugins adicionales para acceder al ciclo completo del colaborador, operaciones diarias y herramientas estratégicas.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {missingPlugins.map(p => (
                      <Link
                        key={p.id}
                        href="/admin/marketplace"
                        className="text-xs px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium"
                      >
                        {p.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
