'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  CreatePoliticaData,
  Politica,
} from '@/types/planificacion-revision-direccion';
import { useState } from 'react';

interface PoliticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePoliticaData) => Promise<void>;
  editingPolitica?: Politica | null;
}

export function PoliticaModal({
  isOpen,
  onClose,
  onSave,
  editingPolitica,
}: PoliticaModalProps) {
  const [formData, setFormData] = useState<CreatePoliticaData>({
    codigo: editingPolitica?.codigo || '',
    titulo: editingPolitica?.titulo || '',
    descripcion: editingPolitica?.descripcion || '',
    contenido: editingPolitica?.contenido || '',
    estado: editingPolitica?.estado || 'borrador',
    version: editingPolitica?.version || '1.0',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving política:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">
            {editingPolitica ? 'Editar Política' : 'Nueva Política'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={e =>
                setFormData({ ...formData, codigo: e.target.value })
              }
              placeholder="POL-QMS-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={e =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              placeholder="Política de Calidad"
              required
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={e =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Descripción breve de la política"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              value={formData.contenido || ''}
              onChange={e =>
                setFormData({ ...formData, contenido: e.target.value })
              }
              placeholder="Contenido completo de la política"
              rows={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estado">Estado *</Label>
              <select
                id="estado"
                value={formData.estado}
                onChange={e =>
                  setFormData({
                    ...formData,
                    estado: e.target.value as
                      | 'borrador'
                      | 'en_revision'
                      | 'vigente'
                      | 'obsoleta',
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="borrador">Borrador</option>
                <option value="en_revision">En Revisión</option>
                <option value="vigente">Vigente</option>
                <option value="obsoleta">Obsoleta</option>
              </select>
            </div>

            <div>
              <Label htmlFor="version">Versión</Label>
              <Input
                id="version"
                value={formData.version || '1.0'}
                onChange={e =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="1.0"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving
                ? 'Guardando...'
                : editingPolitica
                  ? 'Guardar Cambios'
                  : 'Crear Política'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
