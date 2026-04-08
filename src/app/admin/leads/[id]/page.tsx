// Página de detalle de lead - Ver conversación y gestionar
'use client';

import { Button } from '@/components/ui/button';
import { DonCandidoAvatar } from '@/components/ui/DonCandidoAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LandingLead, LeadStatus } from '@/types/landing-lead';
import { PRIORITY_CONFIG } from '@/types/landing-lead';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<LandingLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLead = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/landing/leads/${params.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setLead(data.data);
      setInternalNotes(data.data.internalNotes || '');
      setError(null);
    } catch (err: any) {
      console.error('Error loading lead:', err);
      setError(err.message || 'Error al cargar lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
  }, [params.id]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/landing/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLead(prev => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Error al actualizar estado');
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/landing/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert('Notas guardadas correctamente');
    } catch (err: any) {
      console.error('Error saving notes:', err);
      alert('Error al guardar notas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Error: {error || 'Lead no encontrado'}
          </p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const priorityConfig =
    PRIORITY_CONFIG[lead.qualification?.priority || 'baja'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.name || lead.company || 'Lead Anónimo'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">ID: {lead.id}</p>
          </div>

          {/* Badge de prioridad */}
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${priorityConfig.bgColor} ${priorityConfig.color}`}
          >
            {priorityConfig.icon} {priorityConfig.label}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Conversación */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversación del chat */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Conversación del Chat
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {lead.chatHistory && lead.chatHistory.length > 0 ? (
                lead.chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 flex-shrink-0">
                        <DonCandidoAvatar
                          mood="chatbot"
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-emerald-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}
                      >
                        {message.timestamp &&
                          format(new Date(message.timestamp), 'HH:mm', {
                            locale: es,
                          })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Sin mensajes</p>
              )}
            </div>
          </div>

          {/* Notas internas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notas Internas
            </h2>
            <Textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Agregar notas sobre este lead..."
              rows={4}
              className="mb-3"
            />
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Notas'}
            </Button>
          </div>
        </div>

        {/* Columna derecha: Información del lead */}
        <div className="space-y-6">
          {/* Datos de contacto */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos de Contacto
            </h2>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead.company}</span>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.company && (
                <p className="text-gray-500 text-sm">Sin datos de contacto</p>
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Estado del Lead
            </h2>
            <Select
              value={lead.status}
              onValueChange={value => handleStatusChange(value as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">🆕 Nuevo</SelectItem>
                <SelectItem value="contacted">📞 Contactado</SelectItem>
                <SelectItem value="demo_scheduled">📅 Demo Agendada</SelectItem>
                <SelectItem value="converted">✅ Convertido</SelectItem>
                <SelectItem value="lost">❌ Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calificación */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Calificación
            </h2>
            <div className="space-y-2 text-sm">
              {lead.qualification?.companySize && (
                <div>
                  <span className="text-gray-500">Tamaño:</span>{' '}
                  <span className="font-medium">
                    {lead.qualification.companySize} empleados
                  </span>
                </div>
              )}
              {lead.qualification?.industry && (
                <div>
                  <span className="text-gray-500">Industria:</span>{' '}
                  <span className="font-medium">
                    {lead.qualification.industry}
                  </span>
                </div>
              )}
              {lead.qualification?.urgency && (
                <div>
                  <span className="text-gray-500">Urgencia:</span>{' '}
                  <span className="font-medium">
                    {lead.qualification.urgency}
                  </span>
                </div>
              )}
              {lead.qualification?.hasISO !== undefined && (
                <div>
                  <span className="text-gray-500">Tiene ISO:</span>{' '}
                  <span className="font-medium">
                    {lead.qualification.hasISO ? 'Sí' : 'No'}
                  </span>
                </div>
              )}
              {lead.qualification?.needsCertification !== undefined && (
                <div>
                  <span className="text-gray-500">Necesita certificación:</span>{' '}
                  <span className="font-medium">
                    {lead.qualification.needsCertification ? 'Sí' : 'No'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Creado:</span>{' '}
                <span className="font-medium">
                  {lead.createdAt &&
                    formatDistanceToNow(new Date(lead.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Última actividad:</span>{' '}
                <span className="font-medium">
                  {lead.lastMessageAt &&
                    formatDistanceToNow(new Date(lead.lastMessageAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Mensajes:</span>{' '}
                <span className="font-medium">
                  {lead.chatHistory?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
