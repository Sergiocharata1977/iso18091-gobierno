'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { Personnel } from '@/types/rrhh';

interface UserPersonnelSelectorProps {
  userId: string;
  currentPersonnelId?: string;
  onUpdate?: () => void;
}

export function UserPersonnelSelector({
  userId,
  currentPersonnelId,
  onUpdate,
}: UserPersonnelSelectorProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(
    null
  );
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar personnel actual si existe
      if (currentPersonnelId) {
        const currentRes = await fetch(`/api/users/${userId}/personnel`);
        if (currentRes.ok) {
          const data = await currentRes.json();
          setCurrentPersonnel(data.personnel);
        }
      }

      // Cargar lista de personnel disponibles
      const personnelRes = await fetch('/api/personnel');
      if (personnelRes.ok) {
        const data = await personnelRes.json();
        setPersonnel(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, currentPersonnelId]);

  const handleLink = async () => {
    if (!selectedPersonnelId) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/users/${userId}/personnel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnel_id: selectedPersonnelId }),
      });

      if (res.ok) {
        await loadData();
        setShowSelector(false);
        setSelectedPersonnelId('');
        onUpdate?.();
        alert('Personal vinculado exitosamente');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al vincular personal');
      }
    } catch (error) {
      console.error('Error linking personnel:', error);
      alert('Error al vincular personal');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('¿Estás seguro de que quieres desvincular este personal?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/users/${userId}/personnel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnel_id: null }),
      });

      if (res.ok) {
        setCurrentPersonnel(null);
        onUpdate?.();
        alert('Personal desvinculado exitosamente');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al desvincular personal');
      }
    } catch (error) {
      console.error('Error unlinking personnel:', error);
      alert('Error al desvincular personal');
    } finally {
      setSaving(false);
    }
  };

  // Mostrar todo el personnel disponible
  // La validación de si está asignado se hace en el backend
  const availablePersonnel = personnel;

  if (loading) {
    return (
      <Card className="shadow-lg shadow-green-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Personal Vinculado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg shadow-green-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-green-600" />
          Personal Vinculado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPersonnel ? (
          // Mostrar personnel vinculado
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {currentPersonnel.nombres} {currentPersonnel.apellidos}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPersonnel.email}
                </p>
                {currentPersonnel.puesto && (
                  <div className="mt-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      Puesto: {currentPersonnel.puesto}
                    </Badge>
                  </div>
                )}
                {currentPersonnel.departamento && (
                  <p className="text-sm text-gray-600 mt-1">
                    Departamento: {currentPersonnel.departamento}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/dashboard/rrhh/personal/${currentPersonnel.id}`,
                    '_blank'
                  )
                }
                className="flex-1"
              >
                Ver Detalle
              </Button>
              <Button
                variant="outline"
                onClick={handleUnlink}
                disabled={saving}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desvincular
              </Button>
            </div>
          </div>
        ) : (
          // Mostrar selector para vincular
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  No hay personal vinculado
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Este usuario no tiene un empleado asignado. Vincúlalo para que
                  Don Cándido pueda obtener su contexto de trabajo.
                </p>
              </div>
            </div>

            {!showSelector ? (
              <Button
                onClick={() => setShowSelector(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Vincular Personal
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Seleccionar Personal
                  </label>
                  <select
                    value={selectedPersonnelId}
                    onChange={e => setSelectedPersonnelId(e.target.value)}
                    disabled={saving}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar...</option>
                    {availablePersonnel.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombres} {p.apellidos} - {p.puesto || 'Sin puesto'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSelector(false);
                      setSelectedPersonnelId('');
                    }}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleLink}
                    disabled={!selectedPersonnelId || saving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving ? 'Vinculando...' : 'Vincular'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
