import { PLATFORM_PLUGIN_MANIFESTS } from '@/config/plugins';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type {
  CapabilityManifest,
  PlatformCapability,
  PluginNavigationEntry,
} from '@/types/plugins';
import { NextResponse } from 'next/server';

const SYSTEM_ID = 'iso9001';
const VERSION = '1.0.0';
const DEFAULT_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

type CapabilitySeedConfig = {
  id: string;
  name: string;
  description: string;
  status?: PlatformCapability['status'];
  tier: PlatformCapability['tier'];
  icon: string;
  color: string;
  tags: string[];
  dependencies?: string[];
  navigation?: PluginNavigationEntry[];
  datasets?: string[];
  settingsSchema?: Record<string, unknown>;
  permissions?: CapabilityManifest['permissions'];
  long_description?: string;
  target_audience?: string;
  features?: string[];
  benefits?: string[];
  how_it_works?: string;
  screenshots?: string[];
};

function createNavigationEntry(params: {
  name: string;
  href: string;
  icon: string;
  feature: string;
  parent?: string;
  roles?: string[];
}): PluginNavigationEntry {
  return {
    name: params.name,
    href: params.href,
    icon: params.icon,
    parent: params.parent,
    feature: params.feature,
    condition: 'enabled',
    roles: params.roles ? [...params.roles] : [...DEFAULT_ROLES],
  };
}

function createManifest(
  capabilityId: string,
  config: CapabilitySeedConfig
): CapabilityManifest {
  return {
    capability_id: capabilityId,
    version: VERSION,
    system_id: SYSTEM_ID,
    navigation: config.navigation || [],
    datasets: config.datasets,
    settings_schema: config.settingsSchema,
    permissions: config.permissions,
  };
}

function createCapability(config: CapabilitySeedConfig): PlatformCapability {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    version: VERSION,
    system_ids: [SYSTEM_ID],
    scope: 'system',
    status: config.status || 'active',
    tier: config.tier,
    icon: config.icon,
    color: config.color,
    tags: config.tags,
    dependencies: config.dependencies || [],
    manifest: createManifest(config.id, config),
    ...(config.long_description && { long_description: config.long_description }),
    ...(config.target_audience && { target_audience: config.target_audience }),
    ...(config.features && { features: config.features }),
    ...(config.benefits && { benefits: config.benefits }),
    ...(config.how_it_works && { how_it_works: config.how_it_works }),
    ...(config.screenshots && { screenshots: config.screenshots }),
  };
}

const ISO9001_CAPABILITIES: PlatformCapability[] = [
  createCapability({
    id: 'mi-sgc',
    name: 'Mi SGC',
    description:
      'Centro del SGC con madurez, cumplimiento, gaps, roadmap y vistas de soporte.',
    long_description:
      'Mi SGC concentra el estado general del sistema de gestion en una sola vista. Reune madurez, cumplimiento, brechas y roadmap para que la direccion y los responsables de proceso puedan entender rapido donde esta el sistema y que priorizar.\n\nTambien incorpora vistas de automatizacion, resumen por usuario y configuracion de gobernanza. Eso permite bajar del tablero ejecutivo a la operacion diaria sin salir del modulo.',
    target_audience:
      'Ideal para equipos de calidad, direccion y responsables de proceso que necesitan una vision integral del SGC y su evolucion.',
    features: [
      'Tableros de madurez y cumplimiento',
      'Analisis de gaps y roadmap',
      'Vista de automatizacion del sistema',
      'Resumen personal por usuario',
      'Configuracion de gobernanza',
    ],
    benefits: [
      'Prioriza acciones sobre una base comun de indicadores',
      'Alinea direccion y operacion en el mismo tablero',
      'Facilita el seguimiento del avance del SGC',
    ],
    how_it_works:
      'El modulo consolida datos de otros componentes del sistema y los presenta en vistas de madurez, cumplimiento, brechas y roadmap. Cada equipo puede revisar su estado, detectar prioridades y navegar a los modulos relacionados para ejecutar acciones.',
    screenshots: [],
    tier: 'base',
    icon: 'ShieldCheck',
    color: 'emerald',
    tags: ['sgc', 'iso9001', 'governance'],
    navigation: [
      createNavigationEntry({
        name: 'Madurez',
        href: '/mi-sgc/madurez',
        icon: 'BarChart3',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
      }),
      createNavigationEntry({
        name: 'Cumplimiento',
        href: '/mi-sgc/cumplimiento',
        icon: 'CheckCircle',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
      }),
      createNavigationEntry({
        name: 'Gaps',
        href: '/mi-sgc/gaps',
        icon: 'AlertTriangle',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
      }),
      createNavigationEntry({
        name: 'Roadmap',
        href: '/mi-sgc/roadmap',
        icon: 'Compass',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
      }),
      createNavigationEntry({
        name: 'Automatizacion',
        href: '/mi-sgc/automatizacion',
        icon: 'Bot',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
      }),
      createNavigationEntry({
        name: 'Resumen Personal',
        href: '/mi-sgc/resumen-usuarios',
        icon: 'Users',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
        roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'],
      }),
      createNavigationEntry({
        name: 'Config Gobernanza',
        href: '/configuracion/gobernanza',
        icon: 'Settings',
        parent: 'mi-sgc',
        feature: 'mi-sgc',
        roles: ['admin', 'gerente', 'super_admin'],
      }),
    ],
  }),
  createCapability({
    id: 'procesos',
    name: 'Mapa de Procesos',
    description: 'Mapa, definiciones y registros de procesos del SGC.',
    long_description:
      'Mapa de Procesos organiza la arquitectura operativa del sistema con definiciones, relaciones y registros ejecutables. Permite documentar procesos, trabajar con enfoque SIPOC y bajar cada definicion a objetivos, indicadores, checklists y registros.\n\nEl modulo esta pensado para que el mapa no quede como un documento estatico. Cada proceso puede tener seguimiento operativo, mediciones y evidencia vinculada para sostener la trazabilidad.',
    target_audience:
      'Ideal para organizaciones que necesitan formalizar su mapa de procesos y convertirlo en una herramienta operativa del dia a dia.',
    features: [
      'Definiciones de procesos y vistas SIPOC',
      'Registros operativos por proceso',
      'Objetivos e indicadores de calidad',
      'Checklists y tareas vinculadas',
      'Relacion con documentos y puntos de norma',
    ],
    benefits: [
      'Convierte el mapa de procesos en gestion operativa',
      'Mejora la trazabilidad entre definicion y ejecucion',
      'Ordena indicadores y evidencia por proceso',
    ],
    how_it_works:
      'Se define cada proceso con su estructura y luego se agregan registros, objetivos, mediciones y checklists. Desde el mismo modulo se navega entre definicion, ejecucion y evidencia asociada.',
    screenshots: [],
    tier: 'base',
    icon: 'FileSpreadsheet',
    color: 'sky',
    tags: ['procesos', 'sipoc', 'records'],
    navigation: [
      createNavigationEntry({
        name: 'Procesos',
        href: '/procesos',
        icon: 'FileSpreadsheet',
        feature: 'procesos',
      }),
    ],
    datasets: ['process_definitions', 'process_records'],
  }),
  createCapability({
    id: 'documentos',
    name: 'Control Documental',
    description: 'GestiÃ³n de documentos, versiones y trazabilidad.',
    long_description:
      'Control Documental centraliza la documentaciÃ³n del sistema y su historial de versiones. Permite publicar documentos, consultar su estado y mantener trazabilidad sobre cambios y referencias cruzadas con otros mÃ³dulos.\n\nDe esta forma, procedimientos, instructivos y registros dejan de circular por fuera del sistema. El acceso queda ordenado y alineado con el resto del SGC.',
    target_audience:
      'Ideal para organizaciones que necesitan ordenar documentos vigentes, versionado y consulta controlada dentro del sistema ISO.',
    features: [
      'Repositorio central de documentos',
      'Versionado y trazabilidad de cambios',
      'Consulta por detalle de documento',
      'VinculaciÃ³n con otros mÃ³dulos del sistema',
      'Soporte para evidencia documental',
    ],
    benefits: [
      'Reduce dispersiÃ³n de documentos y versiones',
      'Mejora el acceso a informaciÃ³n vigente',
      'Aporta trazabilidad documental al SGC',
    ],
    how_it_works:
      'Los usuarios cargan y actualizan documentos dentro del mÃ³dulo, donde quedan registrados con su informaciÃ³n de versiÃ³n. Luego pueden consultarse desde el listado principal o desde otros mÃ³dulos que los referencian.',
    screenshots: [],
    tier: 'base',
    icon: 'FileText',
    color: 'amber',
    tags: ['documentos', 'versiones', 'sgc'],
    navigation: [
      createNavigationEntry({
        name: 'Documentos',
        href: '/documentos',
        icon: 'FileText',
        feature: 'documentos',
      }),
    ],
    datasets: ['documents'],
  }),
  createCapability({
    id: 'mejoras',
    name: 'Hallazgos y Acciones',
    description: 'Hallazgos, acciones correctivas y mejora continua.',
    long_description:
      'Hallazgos y Acciones concentra no conformidades, observaciones, auditorÃ­as y acciones de mejora en un flujo Ãºnico. El mÃ³dulo da seguimiento desde la detecciÃ³n hasta el cierre, con trazabilidad sobre responsables, estado y origen.\n\nTambiÃ©n incorpora vistas para auditorÃ­as, declaraciones y encuestas, lo que ayuda a sostener la mejora continua como un proceso vivo y no como registros aislados.',
    target_audience:
      'Ideal para equipos de calidad y responsables de Ã¡rea que gestionan hallazgos, auditorÃ­as y acciones correctivas de manera continua.',
    features: [
      'GestiÃ³n de hallazgos y acciones',
      'Seguimiento de auditorÃ­as',
      'Registro de declaraciones y encuestas',
      'Estados y responsables por acciÃ³n',
      'Vista dashboard para auditorÃ­as',
    ],
    benefits: [
      'Ordena el ciclo completo de mejora continua',
      'Facilita el seguimiento de acciones abiertas',
      'Vincula auditorÃ­as, hallazgos y cierres en un mismo flujo',
    ],
    how_it_works:
      'Se registran hallazgos o eventos de mejora, se asignan acciones y responsables, y se sigue el avance hasta su cierre. Las auditorÃ­as y sus resultados quedan vinculados dentro del mismo mÃ³dulo.',
    screenshots: [],
    tier: 'base',
    icon: 'Zap',
    color: 'rose',
    tags: ['mejoras', 'acciones', 'hallazgos'],
    navigation: [
      createNavigationEntry({
        name: 'Mejora',
        href: '/mejoras',
        icon: 'Zap',
        feature: 'mejoras',
      }),
    ],
    datasets: ['findings', 'actions'],
  }),
  createCapability({
    id: 'rrhh',
    name: 'Recursos Humanos',
    description: 'Personal, competencias, capacitaciones y estructura.',
    long_description:
      'Recursos Humanos integra legajo de personal, puestos, departamentos, competencias, evaluaciones y capacitaciones. Esto permite sostener los requisitos de competencia del sistema de gestiÃ³n sin depender de planillas separadas.\n\nEl mÃ³dulo conecta estructura organizacional con brechas de competencias y formaciÃ³n, dando una base operativa para planificar desarrollo y evidenciar cumplimiento.',
    target_audience:
      'Ideal para organizaciones que necesitan gestionar estructura, personal y competencias con trazabilidad dentro del SGC.',
    features: [
      'GestiÃ³n de personal, puestos y departamentos',
      'Matriz de competencias y polivalencia',
      'Evaluaciones de desempeÃ±o o brechas',
      'Capacitaciones y seguimiento asociado',
      'RelaciÃ³n entre puesto y competencias requeridas',
    ],
    benefits: [
      'Centraliza la evidencia de competencias y capacitaciÃ³n',
      'Identifica brechas entre personas y puestos',
      'Ordena la estructura organizacional en un solo mÃ³dulo',
    ],
    how_it_works:
      'Se cargan personas, puestos y departamentos, se definen competencias por puesto y luego se ejecutan evaluaciones y capacitaciones. El sistema deja trazabilidad de brechas, evoluciÃ³n y formaciÃ³n realizada.',
    screenshots: [],
    tier: 'base',
    icon: 'Users',
    color: 'cyan',
    tags: ['rrhh', 'personal', 'competencias'],
    navigation: [
      createNavigationEntry({
        name: 'RRHH',
        href: '/rrhh',
        icon: 'Users',
        feature: 'rrhh',
      }),
    ],
    datasets: ['personnel', 'positions', 'departments', 'trainings'],
  }),
  createCapability({
    id: 'planificacion',
    name: 'Planificacion y Revision',
    description:
      'PlanificaciÃ³n estratÃ©gica y revisiÃ³n por la direcciÃ³n del sistema.',
    long_description:
      'Planificacion y Revision concentra el trabajo de contexto, alcance, identidad, estructura, polÃ­ticas y revisiÃ³n por la direcciÃ³n. El mÃ³dulo acompaÃ±a la parte estratÃ©gica del sistema y ordena la informaciÃ³n que normalmente queda repartida entre documentos y presentaciones.\n\nTambiÃ©n incorpora historial y reuniones, para que las decisiones de direcciÃ³n queden registradas con continuidad y trazabilidad.',
    target_audience:
      'Ideal para direcciÃ³n, responsables del SGC y consultores que necesitan estructurar la planificaciÃ³n estratÃ©gica y la revisiÃ³n del sistema.',
    features: [
      'GestiÃ³n de contexto, alcance e identidad',
      'PolÃ­ticas y estructura organizacional',
      'AMFE y planificaciones',
      'Historial de revisiones',
      'Reuniones de revisiÃ³n por la direcciÃ³n',
    ],
    benefits: [
      'Ordena la informaciÃ³n estratÃ©gica del sistema',
      'Da continuidad a la revisiÃ³n por la direcciÃ³n',
      'Reduce dispersiÃ³n entre documentos y decisiones',
    ],
    how_it_works:
      'El equipo carga los componentes estratÃ©gicos del sistema en secciones especÃ­ficas y registra revisiones sucesivas. Luego puede consultar la versiÃ³n vigente, el historial y los elementos asociados a cada instancia de revisiÃ³n.',
    screenshots: [],
    tier: 'base',
    icon: 'Award',
    color: 'violet',
    tags: ['planificacion', 'revision-direccion', 'estrategia'],
    navigation: [
      createNavigationEntry({
        name: 'Planificacion y Revision',
        href: '/planificacion-revision-direccion',
        icon: 'Award',
        feature: 'planificacion',
      }),
    ],
    datasets: ['planificaciones_revision_direccion'],
  }),
  createCapability({
    id: 'calendario',
    name: 'Calendario',
    description: 'Agenda de eventos, tareas y seguimiento operativo.',
    long_description:
      'Calendario ofrece una vista comÃºn para organizar eventos, compromisos y tareas operativas del sistema. Sirve como punto de coordinaciÃ³n para reuniones, vencimientos y carga de trabajo, con apoyo de endpoints de anÃ¡lisis asistido.\n\nAl estar integrado al entorno del SGC, ayuda a que responsables y equipos mantengan una agenda compartida sobre hitos del sistema.',
    target_audience:
      'Ideal para organizaciones que necesitan coordinar actividades del sistema y visualizar compromisos operativos en una agenda central.',
    features: [
      'Agenda central de eventos y tareas',
      'Seguimiento operativo por calendario',
      'AnÃ¡lisis de carga de trabajo',
      'Consultas de eventos por usuario',
      'Contexto para acciones asistidas por IA',
    ],
    benefits: [
      'Mejora la coordinaciÃ³n entre responsables',
      'Visibiliza vencimientos y carga operativa',
      'Aporta una agenda comÃºn para el sistema',
    ],
    how_it_works:
      'Las actividades se consultan y organizan desde la agenda central. El mÃ³dulo permite revisar compromisos, distribuir carga y usar anÃ¡lisis asistido para entender eventos y tareas por usuario.',
    screenshots: [],
    tier: 'base',
    icon: 'Calendar',
    color: 'indigo',
    tags: ['agenda', 'eventos', 'calendario'],
    navigation: [
      createNavigationEntry({
        name: 'Calendario',
        href: '/calendario',
        icon: 'Calendar',
        feature: 'calendario',
      }),
    ],
  }),
  createCapability({
    id: 'noticias',
    name: 'Noticias',
    description: 'Comunicaciones internas y novedades de la organizaciÃ³n.',
    long_description:
      'Noticias funciona como canal interno para publicar novedades, avisos y comunicaciones de la organizaciÃ³n. El objetivo es que mensajes operativos y cambios relevantes del sistema tengan un espacio visible y consultable.\n\nAdemÃ¡s del contenido principal, el mÃ³dulo contempla interacciÃ³n mediante comentarios, lo que permite sostener conversaciones alrededor de cada publicaciÃ³n.',
    target_audience:
      'Ideal para organizaciones que necesitan comunicar novedades internas y mantener un espacio visible para anuncios del sistema o de la operaciÃ³n.',
    features: [
      'PublicaciÃ³n de noticias internas',
      'Listado y detalle de novedades',
      'Comentarios asociados a cada publicaciÃ³n',
      'Canal visible para avisos organizacionales',
      'IntegraciÃ³n con la navegaciÃ³n general del tenant',
    ],
    benefits: [
      'Centraliza comunicaciones internas',
      'Da visibilidad a anuncios relevantes',
      'Facilita seguimiento de conversaciones sobre cada novedad',
    ],
    how_it_works:
      'Se crean publicaciones dentro del mÃ³dulo y los usuarios pueden consultarlas desde el listado o el detalle. Cada noticia puede recibir comentarios para ampliar o aclarar la comunicaciÃ³n.',
    screenshots: [],
    tier: 'base',
    icon: 'MessageSquare',
    color: 'blue',
    tags: ['noticias', 'comunicacion', 'interna'],
    navigation: [
      createNavigationEntry({
        name: 'Noticias',
        href: '/noticias',
        icon: 'MessageSquare',
        feature: 'noticias',
      }),
    ],
    datasets: ['news_posts', 'news_comments'],
  }),
  createCapability({
    id: 'puntos-norma',
    name: 'Puntos de Norma',
    description: 'Referencia navegable de la norma ISO 9001 y su trazabilidad.',
    long_description:
      'Puntos de Norma ofrece una referencia navegable de la ISO 9001 dentro del sistema. Facilita consultar clÃ¡usulas, revisar su contenido y vincular la norma con procesos, documentos y otros elementos de gestiÃ³n.\n\nEsto reduce el salto constante entre documentos externos y la plataforma, y mejora la trazabilidad entre requisito y evidencia.',
    target_audience:
      'Ideal para responsables del sistema, auditores y consultores que necesitan consultar la norma y relacionarla con la operaciÃ³n.',
    features: [
      'Listado navegable de puntos de norma',
      'Detalle por clÃ¡usula o requisito',
      'Referencia integrada al SGC',
      'RelaciÃ³n con procesos y documentos',
      'Soporte para trazabilidad normativa',
    ],
    benefits: [
      'Acerca la norma a la operaciÃ³n diaria',
      'Mejora la interpretaciÃ³n y consulta de requisitos',
      'Facilita la trazabilidad entre requisito y evidencia',
    ],
    how_it_works:
      'Los usuarios navegan los puntos de norma desde el listado principal y acceden al detalle de cada requisito. Desde allÃ­ pueden usar la referencia para relacionarla con procesos, documentos y acciones del sistema.',
    screenshots: [],
    tier: 'base',
    icon: 'BookOpen',
    color: 'teal',
    tags: ['iso9001', 'norma', 'referencia'],
    navigation: [
      createNavigationEntry({
        name: 'Puntos de Norma',
        href: '/puntos-norma',
        icon: 'BookOpen',
        feature: 'puntos-norma',
      }),
    ],
    datasets: ['norm_points'],
  }),
  createCapability({
    id: 'admin',
    name: 'Administracion',
    description: 'GestiÃ³n de usuarios y configuraciÃ³n operativa del tenant.',
    long_description:
      'Administracion concentra funciones operativas del tenant, especialmente gestiÃ³n de usuarios y configuraciones bÃ¡sicas del entorno. Es el mÃ³dulo que permite mantener ordenada la base de acceso y algunas polÃ­ticas de operaciÃ³n.\n\nSu alcance es deliberadamente acotado para resolver gobierno interno del espacio de trabajo sin mezclarlo con los mÃ³dulos funcionales del sistema.',
    target_audience:
      'Ideal para administradores del tenant y perfiles con responsabilidad sobre usuarios, accesos y configuraciÃ³n bÃ¡sica.',
    features: [
      'GestiÃ³n de usuarios del tenant',
      'Configuraciones operativas bÃ¡sicas',
      'Control de invitaciones a usuarios',
      'PolÃ­tica de usuarios activos',
      'Acceso restringido por rol administrativo',
    ],
    benefits: [
      'Ordena la administraciÃ³n diaria del tenant',
      'Centraliza el control de accesos',
      'Reduce fricciÃ³n operativa en altas y configuraciones',
    ],
    how_it_works:
      'Los perfiles autorizados gestionan usuarios y parÃ¡metros operativos desde el panel administrativo. El mÃ³dulo aplica restricciones por rol y conserva las reglas definidas para invitaciones y usuarios activos.',
    screenshots: [],
    tier: 'base',
    icon: 'Settings',
    color: 'slate',
    tags: ['admin', 'usuarios', 'configuracion'],
    navigation: [
      createNavigationEntry({
        name: 'Usuarios',
        href: '/admin/usuarios',
        icon: 'Users',
        feature: 'admin',
        roles: ['admin', 'super_admin'],
      }),
    ],
    settingsSchema: {
      allow_user_invites: true,
      enforce_active_users_only: true,
    },
  }),
  createCapability({
    id: 'crm',
    name: 'CRM Base',
    description: 'Clientes, oportunidades, pipeline y actividades comerciales.',
    tier: 'opcional',
    icon: 'Briefcase',
    color: 'orange',
    tags: ['crm', 'clientes', 'ventas'],
    navigation: [
      createNavigationEntry({
        name: 'CRM',
        href: '/crm',
        icon: 'Briefcase',
        feature: 'crm',
      }),
    ],
    datasets: ['crm_clientes', 'crm_acciones', 'crm_contactos'],
    long_description:
      'El mÃ³dulo CRM centraliza toda la informaciÃ³n comercial en un solo lugar. Permite gestionar clientes, contactos, oportunidades, acciones y vistas de seguimiento comercial con formatos de lista, grilla y tablero.\n\nAdemÃ¡s incluye componentes para mÃ©tricas, mapa comercial, contactos, WhatsApp y scoring crediticio bÃ¡sico. Esto lo convierte en una base operativa para ventas y relaciÃ³n con clientes dentro del ecosistema del sistema.',
    target_audience:
      'Ideal para organizaciones con equipo comercial que necesitan centralizar la gestiÃ³n de clientes y el seguimiento de oportunidades.',
    features: [
      'GestiÃ³n de clientes y contactos',
      'Oportunidades comerciales',
      'Pipeline y vistas Kanban',
      'Acciones comerciales con seguimiento',
      'MÃ©tricas, mapa y paneles complementarios',
    ],
    benefits: [
      'Un solo lugar para la operaciÃ³n comercial',
      'Seguimiento visual del pipeline y actividades',
      'Base comÃºn para integraciones y anÃ¡lisis de clientes',
    ],
    how_it_works:
      'Se crea un cliente, se vinculan contactos y se gestionan oportunidades y acciones desde el mÃ³dulo. El equipo comercial puede seguir el avance por vistas operativas, consultar mÃ©tricas y mantener trazabilidad sobre cada cuenta.',
    screenshots: [],
  }),
  createCapability({
    id: 'dealer_solicitudes',
    name: 'Solicitudes Dealer',
    description:
      'Ingreso publico y panel interno unico para solicitudes de repuestos, servicio y comercial.',
    tier: 'opcional',
    icon: 'Layers',
    color: 'emerald',
    tags: ['dealer', 'solicitudes', 'backoffice'],
    navigation: [
      createNavigationEntry({
        name: 'Repuestos',
        href: '/solicitudes/repuestos',
        icon: 'Wrench',
        feature: 'dealer_solicitudes',
        roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'],
      }),
      createNavigationEntry({
        name: 'Servicios Tecnicos',
        href: '/solicitudes/servicios',
        icon: 'Settings2',
        feature: 'dealer_solicitudes',
        roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'],
      }),
    ],
    datasets: ['solicitudes'],
    long_description:
      'Solicitudes Dealer habilita un flujo pÃºblico de ingreso para pedidos de repuestos, servicio tÃ©cnico y consultas comerciales. La organizaciÃ³n recibe las solicitudes en un panel interno Ãºnico y puede administrarlas con informaciÃ³n estructurada segÃºn el tipo de requerimiento.\n\nEl mÃ³dulo tambiÃ©n contempla validaciones, protecciÃ³n anti-spam, notificaciones y un puente hacia CRM cuando corresponde. Esto permite convertir contactos entrantes en gestiÃ³n operativa sin reprocesos manuales.',
    target_audience:
      'Ideal para dealers, concesionarios y equipos de postventa o comercial que reciben solicitudes externas y necesitan ordenarlas en un solo flujo.',
    features: [
      'Formulario pÃºblico para solicitudes',
      'Tipos de solicitud: repuesto, servicio y comercial',
      'Panel interno unificado',
      'Validaciones y filtros anti-spam',
      'SincronizaciÃ³n con CRM cuando aplica',
    ],
    benefits: [
      'Centraliza ingresos desde canales pÃºblicos',
      'Reduce carga manual en la toma de solicitudes',
      'Conecta postventa y comercial con el CRM',
    ],
    how_it_works:
      'El cliente completa un formulario pÃºblico segÃºn el tipo de solicitud. El sistema valida el ingreso, lo registra en el panel interno, envÃ­a notificaciones y, si corresponde, crea o actualiza informaciÃ³n en CRM.',
    screenshots: [],
  }),
  createCapability({
    id: 'ai-assist',
    name: 'Asistente IA',
    description:
      'Asistencia de IA para generaciÃ³n y apoyo operativo en el SGC.',
    long_description:
      'Asistente IA agrega capacidades de asistencia conversacional y automatizaciÃ³n sobre distintos mÃ³dulos del sistema. Puede intervenir en tareas de apoyo operativo y en experiencias guiadas donde la plataforma ya expone contexto o endpoints especÃ­ficos.\n\nEl mÃ³dulo estÃ¡ preparado para configurarse por proveedor y modelo, manteniendo el enfoque como capa de asistencia y no como reemplazo de los flujos principales del sistema.',
    target_audience:
      'Ideal para organizaciones que quieren sumar asistencia operativa con IA en procesos puntuales del sistema sin rediseÃ±ar sus mÃ³dulos base.',
    features: [
      'Asistencia conversacional integrada',
      'ConfiguraciÃ³n de proveedor y modelo',
      'Soporte para automatizaciones guiadas',
      'IntegraciÃ³n con contexto del sistema',
      'Uso transversal sobre distintos mÃ³dulos',
    ],
    benefits: [
      'Reduce tiempo en tareas de soporte operativo',
      'Aprovecha contexto ya disponible en la plataforma',
      'Permite incorporar IA de forma gradual',
    ],
    how_it_works:
      'La capability habilita endpoints y componentes de asistencia que usan el contexto del sistema. Los administradores pueden configurar proveedor y modelo, y luego usar la ayuda de IA en los flujos donde ya estÃ¡ integrada.',
    screenshots: [],
    tier: 'opcional',
    icon: 'Bot',
    color: 'fuchsia',
    tags: ['ai', 'assistant', 'automation'],
    settingsSchema: {
      provider: 'openai',
      model: 'gpt',
    },
  }),
  createCapability({
    id: 'dashboard-ejecutivo',
    name: 'Dashboard Ejecutivo',
    description: 'Indicadores y resumen ejecutivo para seguimiento gerencial.',
    long_description:
      'Dashboard Ejecutivo expone una entrada gerencial simplificada a los principales indicadores y seÃ±ales del sistema. En el estado actual la navegaciÃ³n redirige a Mi SGC, que funciona como tablero consolidado para seguimiento ejecutivo.\n\nLa capability sigue siendo Ãºtil para segmentar acceso y evolucionar una experiencia especÃ­fica para direcciÃ³n sin duplicar la lÃ³gica base del sistema.',
    target_audience:
      'Ideal para perfiles gerenciales que necesitan un punto de entrada resumido para monitorear el estado general del sistema.',
    features: [
      'Acceso ejecutivo dedicado en navegaciÃ³n',
      'Resumen gerencial centralizado',
      'RedirecciÃ³n actual a Mi SGC',
      'Control de acceso por rol',
      'Base para evoluciÃ³n futura del tablero ejecutivo',
    ],
    benefits: [
      'Simplifica el acceso de direcciÃ³n a la informaciÃ³n clave',
      'Evita duplicar tableros mientras se consolida la vista central',
      'Permite segmentar experiencia gerencial por capability',
    ],
    how_it_works:
      'Cuando la capability estÃ¡ habilitada, los perfiles autorizados acceden desde una entrada ejecutiva. Hoy esa entrada deriva a Mi SGC, donde se concentran los indicadores y vistas de seguimiento.',
    screenshots: [],
    tier: 'opcional',
    icon: 'BarChart',
    color: 'lime',
    tags: ['dashboard', 'kpi', 'ejecutivo'],
    navigation: [
      createNavigationEntry({
        name: 'Dashboard Ejecutivo',
        href: '/ejecutivo',
        icon: 'BarChart',
        feature: 'dashboard-ejecutivo',
        roles: ['admin', 'gerente', 'super_admin'],
      }),
    ],
  }),
  createCapability({
    id: 'crm_risk_scoring',
    name: 'Calificacion de Riesgo',
    description:
      'Scoring crediticio y anÃ¡lisis de riesgo comercial sobre el CRM.',
    long_description:
      'Calificacion de Riesgo amplifica el CRM con anÃ¡lisis comercial y crediticio sobre cada cliente. Se apoya en la informaciÃ³n ya registrada en la capability base para estructurar evaluaciones, scoring e histÃ³rico financiero.\n\nAl depender de CRM, el mÃ³dulo se enfoca en enriquecer decisiones comerciales y de otorgamiento, no en duplicar la gestiÃ³n del cliente.',
    target_audience:
      'Ideal para organizaciones que venden con riesgo crediticio o necesitan evaluar salud comercial y financiera de su cartera.',
    features: [
      'Evaluaciones de riesgo sobre clientes CRM',
      'Scoring crediticio',
      'ConfiguraciÃ³n de scoring',
      'HistÃ³rico financiero asociado',
      'Dependencia directa del CRM base',
    ],
    benefits: [
      'Mejora decisiones comerciales con mÃ¡s contexto',
      'Ordena el anÃ¡lisis de riesgo en el mismo ecosistema',
      'Aprovecha datos ya cargados en CRM',
    ],
    how_it_works:
      'Una vez habilitado CRM, el equipo crea evaluaciones y scoring sobre clientes existentes. El mÃ³dulo usa esa base para registrar resultados, configuraciones e histÃ³rico financiero relacionado.',
    screenshots: [],
    tier: 'premium',
    icon: 'AlertTriangle',
    color: 'red',
    tags: ['crm', 'risk', 'scoring'],
    dependencies: ['crm'],
    settingsSchema: {
      provider: 'manual',
      minimum_data_points: 3,
    },
  }),
  createCapability({
    id: 'iso_infrastructure',
    name: 'ISO 7.1.3 - Infraestructura',
    description:
      'Gestion de activos e infraestructura segun ISO 9001 clausula 7.1.3',
    tier: 'premium',
    icon: 'Building2',
    color: 'stone',
    tags: ['infraestructura', 'activos', 'mantenimiento'],
    navigation: [
      createNavigationEntry({
        name: 'Infraestructura',
        href: '/iso-infrastructure',
        icon: 'Building2',
        feature: 'iso_infrastructure',
        roles: ['admin', 'gerente', 'super_admin'],
      }),
    ],
    datasets: ['infrastructure_assets'],
    long_description:
      'ISO 7.1.3 - Infraestructura lleva a la plataforma la gestiÃ³n de activos vinculados a edificios, equipos, software, transporte y otros recursos. Permite registrar responsables, ubicaciÃ³n, estado y planificaciÃ³n de mantenimiento dentro de un flujo simple y trazable.\n\nEl objetivo es evidenciar de manera operativa el cumplimiento de la clÃ¡usula 7.1.3, vinculando infraestructura con responsables y eventos de mantenimiento.',
    target_audience:
      'Ideal para organizaciones que necesitan controlar activos e infraestructura con foco en mantenimiento y evidencia de cumplimiento ISO.',
    features: [
      'Alta y gestiÃ³n de activos',
      'ClasificaciÃ³n por tipo y estado',
      'AsignaciÃ³n de responsables',
      'Registro de mantenimientos preventivos y correctivos',
      'Filtros operativos por activo',
    ],
    benefits: [
      'Centraliza informaciÃ³n de infraestructura',
      'Mejora seguimiento de mantenimiento y estado',
      'Aporta evidencia operativa para auditorÃ­as ISO',
    ],
    how_it_works:
      'Se registran activos con su tipo, ubicaciÃ³n, responsable y estado. Luego se agregan mantenimientos sobre cada activo y el sistema conserva el historial para consulta y seguimiento.',
    screenshots: [],
  }),
  createCapability({
    id: 'iso_design_development',
    name: 'ISO 8.3 - Diseno y Desarrollo',
    description:
      'Gestion del ciclo de vida de diseno y desarrollo segun ISO 9001 clausula 8.3.',
    tier: 'premium',
    icon: 'Layers',
    color: 'pink',
    tags: ['design', 'development', 'iso8.3', 'premium'],
    navigation: [
      createNavigationEntry({
        name: 'Diseno y Desarrollo',
        href: '/iso-design',
        icon: 'Layers',
        feature: 'iso_design_development',
        roles: ['admin', 'gerente', 'super_admin'],
      }),
    ],
    datasets: ['design_projects'],
    long_description:
      'ISO 8.3 - Diseno y Desarrollo organiza proyectos de diseÃ±o o desarrollo dentro del sistema con un flujo por etapas. Cada proyecto puede registrar descripciÃ³n, responsable, entradas, salidas y fechas de revisiÃ³n para sostener trazabilidad sobre el ciclo de vida.\n\nEl mÃ³dulo estÃ¡ orientado a evidenciar el control del proceso de diseÃ±o y desarrollo sin convertirlo en un gestor tÃ©cnico complejo. Prioriza orden, seguimiento y cumplimiento.',
    target_audience:
      'Ideal para organizaciones que desarrollan productos o servicios y necesitan documentar el proceso de diseÃ±o conforme a ISO 9001.',
    features: [
      'GestiÃ³n de proyectos de diseÃ±o y desarrollo',
      'Estados por etapa del ciclo',
      'Registro de entradas y salidas',
      'AsignaciÃ³n de responsable',
      'Fechas de revisiÃ³n y seguimiento',
    ],
    benefits: [
      'Ordena el control del proceso de diseÃ±o',
      'Aporta trazabilidad sobre revisiones y entregables',
      'Facilita evidencia de cumplimiento de la clÃ¡usula 8.3',
    ],
    how_it_works:
      'El equipo crea un proyecto, define tipo, descripciÃ³n, responsable, entradas y salidas, y luego sigue su avance por estados. Las fechas de revisiÃ³n permiten mantener control sobre verificaciones y validaciones planificadas.',
    screenshots: [],
  }),
  createCapability({
    id: 'gov_ciudadano_360',
    name: 'Ciudadano 360',
    description: 'Vista integral del ciudadano, tramites, interacciones y contexto.',
    status: 'available',
    tier: 'government',
    icon: 'Users',
    color: 'teal',
    tags: ['government', 'ciudadano', '360'],
  }),
  createCapability({
    id: 'gov_expedientes',
    name: 'Expedientes',
    description: 'Gestion de expedientes, estados, responsables y seguimiento.',
    status: 'available',
    tier: 'government',
    icon: 'FileText',
    color: 'blue',
    tags: ['government', 'expedientes', 'workflow'],
  }),
  createCapability({
    id: 'gov_service_catalog',
    name: 'Catalogo de Servicios',
    description: 'Catalogo municipal de servicios, requisitos, tiempos y canales.',
    status: 'available',
    tier: 'government',
    icon: 'Briefcase',
    color: 'sky',
    tags: ['government', 'servicios', 'catalogo'],
  }),
  createCapability({
    id: 'gov_org_structure',
    name: 'Estructura Organica',
    description: 'Modelado de secretarias, direcciones, areas y dependencias.',
    status: 'available',
    tier: 'government',
    icon: 'Building2',
    color: 'slate',
    tags: ['government', 'organigrama', 'estructura'],
  }),
  createCapability({
    id: 'gov_indicators_kpi',
    name: 'Indicadores y KPI',
    description: 'Tablero de indicadores operativos y de gestion para gobierno local.',
    status: 'available',
    tier: 'government',
    icon: 'BarChart3',
    color: 'emerald',
    tags: ['government', 'kpi', 'indicadores'],
  }),
  createCapability({
    id: 'gov_control_interno',
    name: 'Control Interno',
    description: 'Seguimiento de controles, hallazgos, planes y responsables.',
    status: 'available',
    tier: 'government',
    icon: 'ShieldCheck',
    color: 'indigo',
    tags: ['government', 'control', 'auditoria'],
  }),
  createCapability({
    id: 'gov_normativa',
    name: 'Normativa',
    description: 'Repositorio y trazabilidad de normativa, ordenanzas y resoluciones.',
    status: 'available',
    tier: 'government',
    icon: 'BookOpen',
    color: 'amber',
    tags: ['government', 'normativa', 'legal'],
  }),
  createCapability({
    id: 'gov_maturity_18091',
    name: 'Madurez ISO 18091',
    description: 'Evaluacion de madurez institucional con enfoque ISO 18091.',
    status: 'available',
    tier: 'government',
    icon: 'Compass',
    color: 'emerald',
    tags: ['government', 'iso18091', 'madurez'],
  }),
  createCapability({
    id: 'gov_transparencia',
    name: 'Transparencia',
    description: 'Publicacion y control de informacion para transparencia activa.',
    status: 'available',
    tier: 'government',
    icon: 'Globe',
    color: 'sky',
    tags: ['government', 'transparencia', 'datos'],
  }),
  createCapability({
    id: 'gov_participacion',
    name: 'Participacion',
    description: 'Gestion de iniciativas, consultas y participacion ciudadana.',
    status: 'available',
    tier: 'government',
    icon: 'MessageSquare',
    color: 'teal',
    tags: ['government', 'participacion', 'ciudadania'],
  }),
  createCapability({
    id: 'gov_procurement',
    name: 'Procurement',
    description: 'Seguimiento de compras publicas, proveedores y procesos.',
    status: 'available',
    tier: 'government',
    icon: 'ShoppingCart',
    color: 'orange',
    tags: ['government', 'compras', 'proveedores'],
  }),
  createCapability({
    id: 'gov_territorial_ops',
    name: 'Operaciones Territoriales',
    description: 'Coordinacion de cuadrillas, territorio, incidencias y cobertura.',
    status: 'available',
    tier: 'government',
    icon: 'Compass',
    color: 'teal',
    tags: ['government', 'territorio', 'operaciones'],
  }),
];

const FORMAL_PLUGIN_IDS = new Set(
  PLATFORM_PLUGIN_MANIFESTS.map(manifest => manifest.identity.plugin_id)
);

const LEGACY_SEED_CAPABILITIES = ISO9001_CAPABILITIES.filter(
  capability => !FORMAL_PLUGIN_IDS.has(capability.id)
);

export const POST = withAuth(async () => {
  try {
    await Promise.all(
      LEGACY_SEED_CAPABILITIES.map(capability =>
        CapabilityService.upsertPlatformCapability(capability)
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        seeded: LEGACY_SEED_CAPABILITIES.length,
        skipped_formal_manifests: Array.from(FORMAL_PLUGIN_IDS).sort(),
        capabilities: LEGACY_SEED_CAPABILITIES.map(capability => ({
          id: capability.id,
          tier: capability.tier,
          dependencies: capability.dependencies || [],
        })),
      },
    });
  } catch (error) {
    console.error('[super-admin/capabilities/seed] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo seedear el catalogo de capabilities',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
