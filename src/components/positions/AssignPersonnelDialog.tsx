'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Personnel } from '@/types/rrhh';

interface AssignPersonnelDialogProps {
  open: boolean;
  onClose: () => void;
  positionId: string;
  positionName: string;
  onAssign: (personnelIds: string[]) => Promise<void>;
}

export function AssignPersonnelDialog({
  open,
  onClose,
  positionId,
  positionName,
  onAssign,
}: AssignPersonnelDialogProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailablePersonnel();
    }
  }, [open]);

  const loadAvailablePersonnel = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/personnel');
      if (res.ok) {
        const data = await res.json();
        // Filtrar solo personal sin puesto o con puesto diferente
        const available = data.filter(
          (p: Personnel) => !p.puesto || p.puesto !== positionId
        );
        setPersonnel(available);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;

    try {
      setSaving(true);
      await onAssign(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch (error) {
      console.error('Error assigning personnel:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Personal a {positionName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona el personal que deseas asignar a este puesto. Heredarán
            automáticamente los procesos, objetivos e indicadores del puesto.
          </p>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando personal disponible...</p>
            </div>
          ) : personnel.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay personal disponible para asignar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Personal Disponible ({personnel.length})</Label>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {personnel.map(person => (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(person.id!)}
                      onChange={() => handleToggle(person.id!)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {person.nombres} {person.apellidos}
                      </p>
                      <p className="text-sm text-gray-500">
                        {person.email}
                        {person.puesto && (
                          <span className="ml-2 text-orange-600">
                            (Actualmente en otro puesto)
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{selectedIds.length}</strong> persona(s) seleccionada(s)
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.length === 0 || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving
                ? 'Asignando...'
                : `Asignar ${selectedIds.length || ''} Persona(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
