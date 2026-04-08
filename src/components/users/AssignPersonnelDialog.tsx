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
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Personnel {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  puesto?: string;
  departamento?: string;
}

interface AssignPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function AssignPersonnelDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  onSuccess,
}: AssignPersonnelDialogProps) {
  const { toast } = useToast();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (open) {
      fetchPersonnel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchPersonnel = async () => {
    try {
      setIsLoading(true);
      // Get all personnel (max 100 per API validation)
      const response = await fetch('/api/rrhh/personnel?limit=100');
      if (response.ok) {
        const data = await response.json();
        // The API returns paginated data with 'data' property
        setPersonnel(data.data || data.personnel || []);
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el personal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPersonnelId) {
      toast({
        title: 'Error',
        description: 'Selecciona un personal',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAssigning(true);
      const response = await fetch(`/api/users/${userId}/personnel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnel_id: selectedPersonnelId }),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Personal asignado correctamente',
        });
        onSuccess();
        onOpenChange(false);
        setSelectedPersonnelId(null);
        setSearchTerm('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al asignar personal');
      }
    } catch (error) {
      console.error('Error assigning personnel:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo asignar el personal',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredPersonnel = personnel.filter(p =>
    `${p.nombre} ${p.apellido} ${p.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Asignar Personal</DialogTitle>
          <DialogDescription>
            Selecciona el registro de personal para vincular con {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, apellido o email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Personnel List */}
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Cargando personal...
              </div>
            ) : filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontró personal
              </div>
            ) : (
              <div className="divide-y">
                {filteredPersonnel.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonnelId(p.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedPersonnelId === p.id
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedPersonnelId === p.id
                            ? 'bg-blue-500'
                            : 'bg-gray-200'
                        }`}
                      >
                        <User
                          className={`w-5 h-5 ${
                            selectedPersonnelId === p.id
                              ? 'text-white'
                              : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {p.nombre} {p.apellido}
                        </p>
                        {p.email && (
                          <p className="text-sm text-gray-600">{p.email}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {p.puesto && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {p.puesto}
                            </span>
                          )}
                          {p.departamento && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {p.departamento}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedPersonnelId === p.id && (
                        <div className="text-blue-500 font-semibold">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedPersonnelId(null);
              setSearchTerm('');
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedPersonnelId || isAssigning}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isAssigning ? 'Asignando...' : 'Asignar Personal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
