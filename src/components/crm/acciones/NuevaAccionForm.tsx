'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  CRMAccionCanal,
  CRMAccionResultado,
  CRMAccionTipo,
} from '@/types/crmAcciones';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';

interface NuevaAccionFormProps {
  clientes: { id: string; nombre: string }[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NuevaAccionForm({
  clientes,
  onSubmit,
  onCancel,
  loading = false,
}: NuevaAccionFormProps) {
  const [formData, setFormData] = useState({
    tipo: 'visita' as CRMAccionTipo,
    clienteId: '',
    titulo: '',
    descripcion: '',
    resultado: 'realizada' as CRMAccionResultado,
    canal: 'presencial' as CRMAccionCanal,
  });

  const handleTipoChange = (value: CRMAccionTipo) => {
    let canal: CRMAccionCanal = 'otro';
    switch (value) {
      case 'visita':
        canal = 'presencial';
        break;
      case 'llamada':
        canal = 'telefono';
        break;
      case 'mail':
        canal = 'email';
        break;
      case 'whatsapp':
        canal = 'whatsapp';
        break;
      case 'reunion':
        canal = 'meet';
        break;
    }

    setFormData(prev => ({
      ...prev,
      tipo: value,
      canal,
      // Auto-update titulo if empty or generic
      titulo:
        prev.titulo === '' || prev.titulo.startsWith('Nueva')
          ? `Nueva ${value}`
          : prev.titulo,
    }));
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setFormData(prev => ({
      ...prev,
      clienteId,
      titulo: cliente
        ? `${prev.tipo.charAt(0).toUpperCase() + prev.tipo.slice(1)} a ${cliente.nombre}`
        : prev.titulo,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de Tipo (Tabs visuales) */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            id: 'visita',
            icon: MapPin,
            label: 'Visita',
            color: 'bg-blue-100 text-blue-700 border-blue-200',
          },
          {
            id: 'llamada',
            icon: Phone,
            label: 'Llamada',
            color: 'bg-green-100 text-green-700 border-green-200',
          },
          {
            id: 'whatsapp',
            icon: MessageCircle,
            label: 'WhatsApp',
            color: 'bg-green-50 text-green-600 border-green-100',
          },
          {
            id: 'mail',
            icon: Mail,
            label: 'Mail',
            color: 'bg-purple-100 text-purple-700 border-purple-200',
          },
        ].map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => handleTipoChange(type.id as CRMAccionTipo)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
              ${
                formData.tipo === type.id
                  ? `${type.color} border-current ring-2 ring-offset-1 ring-current/20`
                  : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            <type.icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{type.label}</span>
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-none bg-transparent sm:bg-white sm:border sm:shadow">
        <CardContent className="p-0 sm:p-6 space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente / Organización</Label>
            <Select
              value={formData.clienteId}
              onValueChange={handleClienteChange}
            >
              <SelectTrigger id="cliente" className="h-12 bg-white">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Asunto</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={e =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              className="h-12 bg-white"
              placeholder="Ej: Visita mensual de control..."
            />
          </div>

          {/* Resultado */}
          <div className="space-y-2">
            <Label htmlFor="resultado">Resultado</Label>
            <Select
              value={formData.resultado}
              onValueChange={v =>
                setFormData({ ...formData, resultado: v as CRMAccionResultado })
              }
            >
              <SelectTrigger id="resultado" className="h-12 bg-white">
                <SelectValue placeholder="Seleccionar resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizada">
                  ✅ Realizada con éxito
                </SelectItem>
                <SelectItem value="pendiente">
                  ⏳ Pendiente / Programada
                </SelectItem>
                <SelectItem value="reprogramada">📅 Reprogramada</SelectItem>
                <SelectItem value="no_contesta">📞 No contesta</SelectItem>
                <SelectItem value="interesado">⭐️ Interesado</SelectItem>
                <SelectItem value="venta">💰 Venta Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Notas / Detalles</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={e =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              className="min-h-[120px] bg-white text-base"
              placeholder="Detalles importantes de la interacción..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="pt-4 flex gap-3 sticky bottom-0 bg-gray-50 p-4 border-t sm:static sm:bg-transparent sm:border-0 sm:p-0">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 bg-primary text-lg"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Acción'}
        </Button>
      </div>
    </form>
  );
}
