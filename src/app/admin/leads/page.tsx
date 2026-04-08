// Panel de Leads - Versión simplificada del CRM para Super Admin
'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UnifiedKanban from '@/components/ui/unified-kanban';
import type { LandingLead, LeadStatus } from '@/types/landing-lead';
import { PRIORITY_CONFIG } from '@/types/landing-lead';
import type { KanbanColumn, KanbanItem } from '@/types/rrhh';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';

// Estados del Kanban de Leads
const LEAD_KANBAN_STATES: Array<{
  id: LeadStatus;
  name: string;
  color: string;
}> = [
  { id: 'new', name: 'Nuevos', color: '#3b82f6' },
  { id: 'contacted', name: 'Contactados', color: '#8b5cf6' },
  { id: 'demo_scheduled', name: 'Demo Agendada', color: '#f59e0b' },
  { id: 'converted', name: 'Convertidos', color: '#10b981' },
  { id: 'lost', name: 'Perdidos', color: '#6b7280' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPriority !== 'all') {
        params.append('priority', selectedPriority);
      }

      const res = await fetch(`/api/landing/leads?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setLeads(data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading leads:', err);
      setError(err.message || 'Error al cargar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [selectedPriority]);

  // Obtener industrias únicas para filtro
  const uniqueIndustries = Array.from(
    new Set(
      leads.map(l => l.qualification?.industry).filter((i): i is string => !!i)
    )
  ).sort();

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    if (
      selectedIndustry !== 'all' &&
      lead.qualification?.industry !== selectedIndustry
    ) {
      return false;
    }
    return true;
  });

  // Convertir estados a columnas de Kanban
  const kanbanColumns: KanbanColumn[] = LEAD_KANBAN_STATES.map(
    (state, index) => ({
      id: state.id,
      title: state.name,
      color: state.color,
      maxItems: undefined,
      allowDrop: true,
      order: index,
    })
  );

  // Convertir leads a items de Kanban
  const kanbanItems: KanbanItem[] = filteredLeads.map(lead => {
    const lastMessage =
      lead.chatHistory?.[lead.chatHistory.length - 1]?.content ||
      'Sin mensajes';
    const priorityConfig =
      PRIORITY_CONFIG[lead.qualification?.priority || 'baja'];

    return {
      id: lead.id,
      columnId: lead.status,
      title: lead.name || lead.company || 'Lead Anónimo',
      description:
        lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : ''),
      assignee: lead.assignedTo,
      tags: [
        `${priorityConfig.icon} ${priorityConfig.label}`,
        lead.qualification?.industry || 'Sin industria',
      ],
      priority:
        lead.qualification?.priority === 'alta'
          ? 'high'
          : lead.qualification?.priority === 'media'
            ? 'medium'
            : 'low',
      metadata: {
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        createdAt: lead.createdAt,
        lastMessageAt: lead.lastMessageAt,
        messageCount: lead.chatHistory?.length || 0,
      },
    };
  });

  // Handler para mover leads entre estados
  const handleItemMove = async (
    itemId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newIndex: number
  ) => {
    try {
      const res = await fetch(`/api/landing/leads/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetColumnId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Actualizar estado local
      setLeads(prev =>
        prev.map(l =>
          l.id === itemId ? { ...l, status: targetColumnId as LeadStatus } : l
        )
      );
    } catch (err: any) {
      console.error('Error moving lead:', err);
      loadLeads(); // Recargar en caso de error
    }
  };

  // Handler para click en item
  const handleItemClick = (item: KanbanItem) => {
    window.location.href = `/admin/leads/${item.id}`;
  };

  // Renderer de tarjetas SIMPLIFICADO
  const customCardRenderer = (item: KanbanItem) => {
    const metadata = item.metadata as {
      email?: string;
      phone?: string;
      company?: string;
      createdAt?: Date;
      lastMessageAt?: Date;
      messageCount?: number;
    };

    const priorityTag = item.tags?.[0] || '';
    const industryTag = item.tags?.[1] || '';

    return (
      <div className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
        {/* Header simple */}
        <div className="p-4">
          {/* Nombre y badge de prioridad */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {item.title}
              </h4>
              {metadata.company && (
                <p className="text-xs text-gray-500 truncate">
                  {metadata.company}
                </p>
              )}
            </div>

            {/* Badge de prioridad */}
            <span
              className={`shrink-0 px-2 py-1 rounded-lg text-xs font-semibold ${
                item.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : item.priority === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              {priorityTag}
            </span>
          </div>

          {/* Último mensaje */}
          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
            "{item.description}"
          </p>

          {/* Tags de industria */}
          {industryTag && (
            <div className="mb-3">
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {industryTag}
              </span>
            </div>
          )}

          {/* Footer con datos de contacto y fecha */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            {/* Email/Teléfono */}
            {(metadata.email || metadata.phone) && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {metadata.email && (
                  <span className="truncate">📧 {metadata.email}</span>
                )}
                {metadata.phone && (
                  <span className="truncate">📱 {metadata.phone}</span>
                )}
              </div>
            )}

            {/* Fecha y mensajes */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{metadata.messageCount} mensajes</span>
              <span>
                {metadata.lastMessageAt
                  ? formatDistanceToNow(new Date(metadata.lastMessageAt), {
                      addSuffix: true,
                      locale: es,
                    })
                  : 'Sin actividad'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <Button onClick={loadLeads} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Leads - Landing Page
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestión de leads capturados desde el chat de Don Cándido
            </p>
          </div>
          <Button onClick={loadLeads} variant="outline">
            🔄 Actualizar
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 items-center">
        <span className="text-sm font-medium text-gray-500">Filtrar por:</span>

        {/* Filtro Prioridad */}
        <div className="w-48">
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las prioridades</SelectItem>
              <SelectItem value="alta">🔥 Alta Prioridad</SelectItem>
              <SelectItem value="media">⚡ Media Prioridad</SelectItem>
              <SelectItem value="baja">❄️ Baja Prioridad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Industria */}
        <div className="w-48">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Industria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las industrias</SelectItem>
              {uniqueIndustries.map(industry => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contador */}
        <div className="ml-auto text-sm text-gray-500">
          Mostrando {filteredLeads.length} de {leads.length} leads
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <UnifiedKanban
          columns={kanbanColumns}
          items={kanbanItems}
          onItemMove={handleItemMove}
          onItemClick={handleItemClick}
          loading={loading}
          error={error || undefined}
          customCardRenderer={customCardRenderer}
          showActions={false}
        />
      </div>
    </div>
  );
}
