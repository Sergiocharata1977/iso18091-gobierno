'use client';

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  Compass,
  Database,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  HardHat,
  Layers,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  Lock,
  MessageSquare,
  Monitor,
  MonitorCheck,
  Package,
  Palette,
  Scale,
  Server,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Target,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import React from 'react';
import type { UserRole } from '@/types/auth';
import type { Edition } from '@/types/edition';

export interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  feature?: string;
  roles?: UserRole[];
  editions?: Edition[];
  children?: MenuItem[];
}

export interface ModuleAccessOption {
  id: string;
  nombre: string;
  descripcion: string;
  selfRegister?: boolean;
}

export const MODULE_ACCESS_OPTIONS: ModuleAccessOption[] = [
  { id: 'noticias', nombre: 'Noticias', descripcion: 'Comunicaciones internas', selfRegister: true },
  { id: 'calendario', nombre: 'Calendario', descripcion: 'Agenda y eventos', selfRegister: true },
  { id: 'dashboard-ejecutivo', nombre: 'Ejecutivo', descripcion: 'Indicadores ejecutivos', selfRegister: true },
  { id: 'mi-sgc', nombre: 'Mi SGC', descripcion: 'Centro de gestión ISO 9001', selfRegister: true },
  { id: 'planificacion', nombre: 'Planificación y revisión', descripcion: 'Planificación estratégica', selfRegister: true },
  { id: 'mejoras', nombre: 'Mejora', descripcion: 'Hallazgos y acciones', selfRegister: true },
  { id: 'documentos', nombre: 'Documentos', descripcion: 'Control documental', selfRegister: true },
  { id: 'puntos-norma', nombre: 'Puntos de norma', descripcion: 'Norma ISO 9001', selfRegister: true },
  { id: 'crm', nombre: 'CRM', descripcion: 'Gestión comercial', selfRegister: true },
  { id: 'dealer_solicitudes', nombre: 'Solicitudes dealer', descripcion: 'Backoffice de solicitudes dealer', selfRegister: true },
  { id: 'rrhh', nombre: 'RRHH', descripcion: 'Recursos humanos', selfRegister: true },
  { id: 'procesos', nombre: 'Procesos', descripcion: 'Mapa y registros de procesos', selfRegister: true },
  { id: 'admin', nombre: 'Administración', descripcion: 'Gestión de usuarios y sistema' },
];

// Navegación principal del sistema: fuente de verdad.
export const navigation: MenuItem[] = [
  { name: 'Noticias', href: '/noticias', icon: MessageSquare, feature: 'noticias' },
  { name: 'Mensajes', href: '/mensajes', icon: MessageSquare },
  { name: 'Mapa de Procesos', href: '/mapa-procesos', icon: Layers, feature: 'mi-sgc' },
  { name: 'Calendario', href: '/calendario', icon: Calendar, feature: 'calendario' },
  {
    name: 'Mi Departamento',
    href: '/mi-departamento',
    icon: Building2,
    feature: 'mi-sgc',
    roles: ['admin', 'gerente', 'jefe', 'super_admin'],
  },
  {
    name: 'Monitor ISO',
    href: '/mi-sgc/monitor',
    icon: MonitorCheck,
    feature: 'mi-sgc',
    roles: ['admin', 'gerente', 'jefe', 'super_admin'],
  },
  {
    name: 'Dirección',
    href: '/planificacion-revision-direccion',
    icon: Award,
    children: [
      { name: 'Planificación', href: '/planificacion-revision-direccion', icon: Compass, feature: 'planificacion' },
      { name: 'Indicadores', href: '/maturity', icon: CheckCircle, feature: 'mi-sgc' },
    ],
  },
  {
    name: 'Procesos',
    href: '/procesos',
    icon: Layers,
    children: [
      { name: 'Definiciones', href: '/procesos/definiciones', icon: FileText, feature: 'procesos' },
      { name: 'Registros', href: '/procesos/registros', icon: ClipboardList, feature: 'procesos' },
      { name: 'Objetivos de Calidad', href: '/procesos/objetivos', icon: Target, feature: 'procesos' },
      { name: 'Indicadores', href: '/procesos/indicadores', icon: BarChart3, feature: 'procesos' },
      { name: 'Puntos de Norma', href: '/puntos-norma', icon: ShieldCheck, feature: 'puntos-norma' },
    ],
  },
  { name: 'Controles', href: '/mejoras', icon: Zap, feature: 'mejoras' },
  {
    name: 'Procesos de Apoyo',
    href: '/rrhh',
    icon: LifeBuoy,
    children: [
      { name: 'RRHH', href: '/rrhh', icon: Users, feature: 'rrhh' },
      {
        name: 'WhatsApp RRHH',
        href: '/rrhh/whatsapp-jobs',
        icon: MessageSquare,
        feature: 'rrhh',
        roles: ['admin', 'gerente'],
      },
      { name: 'Documentación', href: '/documentos', icon: FileText, feature: 'documentos' },
      { name: 'Infraestructura', href: '/iso-infrastructure', icon: ShieldCheck, feature: 'mi-sgc' },
    ],
  },
  {
    name: 'Procesos Operativos',
    href: '/crm',
    icon: Briefcase,
    children: [
      { name: 'CRM / Ventas', href: '/crm', icon: Briefcase, feature: 'crm', editions: ['enterprise'] },
      { name: 'Scoring crediticio', href: '/crm/gestion-crediticia', icon: ShieldCheck, feature: 'crm', editions: ['enterprise'] },
      { name: 'Catálogo de Productos', href: '/dealer/catalogo', icon: Package, feature: 'dealer_solicitudes', editions: ['enterprise'] },
      { name: 'Repuestos', href: '/solicitudes/repuestos', icon: Wrench, feature: 'dealer_solicitudes', editions: ['enterprise'] },
      { name: 'Servicios Técnicos', href: '/solicitudes/servicios', icon: Settings2, feature: 'dealer_solicitudes', editions: ['enterprise'] },
      { name: 'Compras', href: '/compras', icon: ShoppingCart, feature: 'dealer_compras', editions: ['enterprise'] },
      { name: 'Dashboard HSE', href: '/hse', icon: LayoutDashboard, feature: 'pack_hse' },
      { name: 'Incidentes SST', href: '/hse/incidentes', icon: AlertTriangle, feature: 'pack_hse' },
      { name: 'Identificación de Peligros', href: '/hse/peligros', icon: AlertOctagon, feature: 'pack_hse' },
      { name: 'Aspectos Ambientales', href: '/hse/aspectos-ambientales', icon: Leaf, feature: 'pack_hse' },
      { name: 'Objetivos Ambientales', href: '/hse/objetivos-ambientales', icon: Target, feature: 'pack_hse' },
      { name: 'Requisitos Legales', href: '/hse/requisitos-legales', icon: Scale, feature: 'pack_hse' },
      { name: 'EPP', href: '/hse/epp', icon: HardHat, feature: 'pack_hse' },
      { name: 'Ciudadanos', href: '/ciudadanos', icon: Users, editions: ['government'] },
      { name: 'Expedientes', href: '/expedientes', icon: FolderOpen, editions: ['government'] },
      { name: 'Carta de Servicios', href: '/carta-servicios', icon: ClipboardList, editions: ['government'] },
      { name: 'Transparencia', href: '/transparencia', icon: Eye, editions: ['government'] },
      { name: 'Participación Ciudadana', href: '/participacion', icon: MessageSquare, editions: ['government'] },
    ],
  },
  {
    name: 'Configuración',
    href: '/mi-contexto',
    icon: Settings,
    children: [
      { name: 'Capabilities / Plugins', href: '/admin/marketplace', icon: Layers },
      { name: 'Parámetros del sistema', href: '/configuracion/gobernanza', icon: Settings, feature: 'mi-sgc' },
      { name: 'WhatsApp', href: '/configuracion/whatsapp', icon: MessageSquare, feature: 'crm_whatsapp_inbox' },
    ],
  },
  {
    name: 'Seguridad de la Información',
    href: '/sgsi/dashboard',
    icon: ShieldAlert,
    feature: 'isms_compliance_dashboard',
    roles: ['admin', 'gerente', 'super_admin'],
    children: [
      { name: 'Dashboard SGSI', href: '/sgsi/dashboard', icon: Activity, feature: 'isms_compliance_dashboard', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Contexto del SGSI', href: '/sgsi/contexto', icon: Globe, feature: 'isms_contexto', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Gestión de Riesgos', href: '/sgsi/riesgos', icon: AlertTriangle, feature: 'isms_riesgos', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Declaración de Aplicabilidad', href: '/sgsi/soa', icon: CheckCircle, feature: 'isms_soa', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Catálogo de Controles', href: '/sgsi/controles', icon: ShieldCheck, feature: 'isms_controles', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Inventario de Activos', href: '/sgsi/activos', icon: Database, feature: 'isms_activos', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Gestión de Accesos', href: '/sgsi/accesos', icon: Lock, feature: 'isms_accesos', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Incidentes de Seguridad', href: '/sgsi/incidentes', icon: AlertTriangle, feature: 'sec_incident_response', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Log de Auditoría', href: '/sgsi/audit-log', icon: FileText, feature: 'sec_audit_log', roles: ['admin', 'super_admin'] },
      { name: 'Proveedores Críticos', href: '/sgsi/proveedores', icon: Briefcase, feature: 'isms_proveedores', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Continuidad y Backups', href: '/sgsi/continuidad', icon: Server, feature: 'isms_continuidad', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Clasificación de Datos', href: '/sgsi/clasificacion', icon: Layers, feature: 'sec_data_classification', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Vulnerabilidades', href: '/sgsi/vulnerabilidades', icon: ShieldAlert, feature: 'sec_vulnerability_mgmt', roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Mapeo de Frameworks', href: '/sgsi/framework-mapper', icon: BarChart3, feature: 'isms_framework_mapper', roles: ['admin', 'gerente', 'super_admin'] },
    ],
  },
  {
    name: 'Terminales',
    href: '/terminales',
    icon: Monitor,
    roles: ['admin', 'gerente', 'super_admin'],
    children: [
      { name: 'Terminales', href: '/terminales', icon: Monitor, roles: ['admin', 'gerente', 'super_admin'] },
      { name: 'Políticas', href: '/terminales/politicas', icon: ShieldCheck, roles: ['admin', 'gerente', 'super_admin'] },
    ],
  },
  { name: 'Manual del Sistema', href: '/documentacion', icon: BookOpen },
  { name: 'Usuarios y Roles', href: '/admin/usuarios', icon: Users, feature: 'admin' },
];

export const OPERATIVA_NAV_ITEMS: string[] = ['Noticias', 'Mapa de Procesos', 'Calendario', 'Mi Departamento', 'Procesos Operativos'];

export const DEFAULT_OPERATIVA_ROLES: string[] = ['gerente', 'jefe', 'operario'];

export function filterNavigationByEdition(items: MenuItem[], edition: Edition): MenuItem[] {
  return items
    .map(item => {
      if (item.editions && !item.editions.includes(edition)) {
        return null;
      }

      const filteredChildren = item.children
        ? filterNavigationByEdition(item.children, edition)
        : undefined;

      if (item.children) {
        if (!filteredChildren || filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
}

const SUPER_ADMIN_HIDDEN_HREFS = new Set([
  '/super-admin/organizaciones/nueva',
  '/super-admin/organizaciones?create=1',
  '/super-admin/demo-requests',
]);

const SUPER_ADMIN_HIDDEN_NAMES = new Set([
  'Crear Organizacion',
  'Crear Organización',
  'Solicitudes de Demo',
]);

export function filterSuperAdminNavigation(items: MenuItem[]): MenuItem[] {
  return items
    .map(item => {
      if (
        SUPER_ADMIN_HIDDEN_HREFS.has(item.href) ||
        SUPER_ADMIN_HIDDEN_NAMES.has(item.name)
      ) {
        return null;
      }

      const filteredChildren = item.children
        ? filterSuperAdminNavigation(item.children)
        : undefined;

      if (item.children) {
        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
}

export const superAdminNavigation: MenuItem[] = [
  { name: 'Dashboard Super Admin', href: '/super-admin', icon: BarChart3 },
  { name: 'Organizaciones', href: '/super-admin/organizaciones', icon: Building2 },
  { name: 'Catálogo de Powers', href: '/super-admin/capabilities', icon: Layers },
  { name: 'Design System', href: '/super-admin/design-system', icon: Palette },
  {
    name: 'Estadísticas',
    href: '/super-admin/stats',
    icon: BarChart3,
    children: [
      { name: 'Métricas globales', href: '/super-admin/stats', icon: BarChart3 },
      { name: 'Uso por organización', href: '/super-admin/stats/organizaciones', icon: Building2 },
    ],
  },
];

