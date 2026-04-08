/**
 * CRMSidebar - Modulo CRM (Gestion de Clientes)
 * Migrado al Design System SidebarShell (light theme)
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import {
  Activity,
  Briefcase,
  Building2,
  DollarSign,
  Map,
  MessageSquare,
  Target,
  Users,
} from 'lucide-react';

const menuItems: SidebarNavItem[] = [
  {
    label: 'CRM / Ventas',
    href: '/crm',
    icon: Target,
    badge: 'Kanban',
  },
  {
    label: 'Gestion Crediticia',
    href: '/crm/gestion-crediticia',
    icon: DollarSign,
  },
  {
    label: 'Clientes',
    href: '/crm/clientes',
    icon: Building2,
  },
  {
    label: 'Contactos',
    href: '/crm/contactos',
    icon: Users,
  },
  {
    label: 'WhatsApp',
    href: '/crm/whatsapp',
    icon: MessageSquare,
    badge: 'Chat',
  },
  {
    label: 'Mapa Vendedores',
    href: '/crm/mapa',
    icon: Map,
  },
  {
    label: 'Lista Vendedores',
    href: '/crm/vendedores',
    icon: Users,
  },
  {
    label: 'Acciones',
    href: '/crm/acciones',
    icon: Activity,
  },
];

export function CRMSidebar() {
  return (
    <ModuleSidebar
      moduleName="CRM"
      subtitle="Ventas y riesgo"
      moduleIcon={<Briefcase className="w-4 h-4" />}
      items={menuItems}
      accent="blue"
      docModule="crm"
      footer={
        <div className="rounded-lg bg-gradient-to-r from-blue-900/30 to-sky-900/30 p-3">
          <p className="text-xs font-medium text-blue-400">
            Gestion Comercial
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Ventas · Credito · Clientes
          </p>
        </div>
      }
    />
  );
}
