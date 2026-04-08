// Tipos para el sistema de Leads de Landing Page

export type LeadPriority = 'alta' | 'media' | 'baja';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'demo_scheduled'
  | 'converted'
  | 'lost';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LeadQualification {
  priority: LeadPriority;
  companySize?: string; // "1-10", "11-50", "51-200", "200+"
  industry?: string; // "alimentos", "manufactura", "servicios", etc.
  urgency?: string; // "inmediata", "3-6 meses", "explorando"
  hasISO?: boolean; // ¿Ya tiene ISO 9001?
  needsCertification?: boolean; // ¿Necesita certificarse?
}

export interface LandingLead {
  id: string;

  // Datos de contacto
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  cuit?: string;

  // Conversación
  chatHistory: ChatMessage[];
  sessionId: string;

  // Calificación
  qualification: LeadQualification;

  // Estado
  status: LeadStatus;
  source: 'chat';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;

  // Notas internas (para el panel de admin)
  internalNotes?: string;
  assignedTo?: string;
}

// Helpers para UI
export const PRIORITY_CONFIG: Record<
  LeadPriority,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  alta: {
    label: 'Alta Prioridad',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🔥',
  },
  media: {
    label: 'Media Prioridad',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: '⚡',
  },
  baja: {
    label: 'Baja Prioridad',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '❄️',
  },
};

export const STATUS_CONFIG: Record<
  LeadStatus,
  {
    label: string;
    color: string;
  }
> = {
  new: { label: 'Nuevo', color: 'bg-blue-500' },
  contacted: { label: 'Contactado', color: 'bg-purple-500' },
  demo_scheduled: { label: 'Demo Agendada', color: 'bg-amber-500' },
  converted: { label: 'Convertido', color: 'bg-green-500' },
  lost: { label: 'Perdido', color: 'bg-gray-500' },
};
