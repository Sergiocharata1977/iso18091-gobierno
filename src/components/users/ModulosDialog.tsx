'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MODULE_ACCESS_OPTIONS } from '@/config/navigation';
import { useEffect, useState } from 'react';

const MODULOS_DISPONIBLES = MODULE_ACCESS_OPTIONS;

interface ModulosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentModulos?: string[] | null;
  onSuccess: () => void;
}

export function ModulosDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentModulos,
  onSuccess,
}: ModulosDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModulos, setSelectedModulos] = useState<Set<string>>(
    new Set()
  );
  const [allEnabled, setAllEnabled] = useState(true);

  useEffect(() => {
    if (currentModulos && currentModulos.length > 0) {
      setSelectedModulos(new Set(currentModulos));
      setAllEnabled(false);
      return;
    }

    setAllEnabled(true);
    setSelectedModulos(new Set(MODULOS_DISPONIBLES.map(m => m.id)));
  }, [currentModulos, open]);

  const handleToggleModulo = (moduloId: string) => {
    const newSet = new Set(selectedModulos);
    if (newSet.has(moduloId)) {
      newSet.delete(moduloId);
    } else {
      newSet.add(moduloId);
    }
    setSelectedModulos(newSet);
    setAllEnabled(false);
  };

  const handleToggleAll = () => {
    if (allEnabled) {
      setSelectedModulos(new Set());
      setAllEnabled(false);
    } else {
      setAllEnabled(true);
      setSelectedModulos(new Set(MODULOS_DISPONIBLES.map(m => m.id)));
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const modulosToSave = allEnabled ? null : Array.from(selectedModulos);

      const response = await fetch(`/api/users/${userId}/modulos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulos_habilitados: modulosToSave }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      toast({
        title: 'Exito',
        description: 'Modulos actualizados correctamente',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los modulos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modulos Habilitados</DialogTitle>
          <DialogDescription>
            Selecciona los modulos a los que <strong>{userEmail}</strong> tendra
            acceso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-3 mb-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-blue-900">Acceso Completo</p>
              <p className="text-xs text-blue-600">
                El usuario puede ver todos los modulos
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allEnabled}
                onChange={handleToggleAll}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {MODULOS_DISPONIBLES.map(modulo => (
              <label
                key={modulo.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModulos.has(modulo.id)
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                } ${allEnabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedModulos.has(modulo.id)}
                    onChange={() => handleToggleModulo(modulo.id)}
                    disabled={allEnabled}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{modulo.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {modulo.descripcion}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            {allEnabled ? (
              <span className="text-blue-600 font-medium">
                Acceso completo a todos los modulos
              </span>
            ) : (
              <span>
                {selectedModulos.size} de {MODULOS_DISPONIBLES.length} modulos
                habilitados
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
