export interface SidebarBucketMeta {
  label: string;
  description: string;
}

export interface SidebarSectionMeta {
  summary?: string;
}

export const SIDEBAR_BUCKET_META: Record<string, SidebarBucketMeta> = {
  quick: {
    label: 'Acceso rapido',
    description: 'Lo que se consulta y atiende con mayor frecuencia.',
  },
  workflows: {
    label: 'Gestion',
    description: 'Procesos, control y seguimiento operativo.',
  },
  'admin-tools': {
    label: 'Herramientas',
    description: 'Ajustes de plataforma y recursos de soporte.',
  },
  admin: {
    label: 'Administracion',
    description: 'Gobierno de la plataforma y supervision global.',
  },
};

export const SIDEBAR_SECTION_META: Record<string, SidebarSectionMeta> = {
  Noticias: { summary: 'Comunicacion y novedades internas.' },
  Mensajes: { summary: 'Conversaciones y seguimiento diario.' },
  'Mapa de Procesos': { summary: 'Vision transversal del sistema.' },
  Calendario: { summary: 'Agenda comun, hitos y vencimientos.' },
  'Mi Departamento': { summary: 'Prioridades y actividad del equipo.' },
  'Monitor ISO': { summary: 'Estado general del sistema ISO.' },
  Direccion: { summary: 'Revision, indicadores y foco directivo.' },
  Procesos: { summary: 'Definiciones, registros e indicadores.' },
  Controles: { summary: 'Hallazgos, acciones y mejora continua.' },
  'Procesos de Apoyo': {
    summary: 'Personas, documentos e infraestructura.',
  },
  'Procesos Operativos': {
    summary: 'Operacion comercial, servicio y modulos especializados.',
  },
  Configuracion: {
    summary: 'Plugins, parametros y conectores del sistema.',
  },
  'Seguridad de la Informacion': {
    summary: 'Controles, riesgos y cumplimiento SGSI.',
  },
  Terminales: { summary: 'Dispositivos, accesos y politicas.' },
  'Manual del Sistema': { summary: 'Base documental y referencia.' },
  'Usuarios y Roles': { summary: 'Accesos, perfiles y permisos.' },
  'Dashboard Super Admin': { summary: 'Panorama global de la plataforma.' },
  Organizaciones: { summary: 'Gestion multiempresa y onboarding.' },
  'Catalogo de Powers': { summary: 'Capacidades y extensiones disponibles.' },
  'Design System': { summary: 'Patrones visuales y componentes base.' },
  Estadisticas: { summary: 'Metricas y uso consolidado.' },
};

export function getSidebarBucketMeta(bucketId: string): SidebarBucketMeta {
  return (
    SIDEBAR_BUCKET_META[bucketId] ?? {
      label: bucketId,
      description: '',
    }
  );
}

export function getSidebarSectionMeta(sectionName: string): SidebarSectionMeta {
  return SIDEBAR_SECTION_META[sectionName] ?? {};
}
