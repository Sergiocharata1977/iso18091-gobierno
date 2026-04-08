'use client';

import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Personnel {
  id: string;
  nombre: string;
  apellido?: string;
  departamento?: string;
  puesto?: string;
}

interface PersonnelSelectProps {
  value?: string;
  onChange: (id: string, name: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function PersonnelSelect({
  value,
  onChange,
  label = 'Responsable',
  required = false,
  placeholder = 'Seleccionar persona...',
  className = '',
}: PersonnelSelectProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/rrhh/personnel?organization_id=${organizationId}`
        );
        if (response.ok) {
          const data = await response.json();
          setPersonnel(data.personnel || []);
        } else {
          setError('Error al cargar personal');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchPersonnel();
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPerson = personnel.find(p => p.id === selectedId);
    const fullName = selectedPerson
      ? `${selectedPerson.nombre} ${selectedPerson.apellido || ''}`.trim()
      : '';
    onChange(selectedId, fullName);
  };

  // Si no hay organizationId, mostrar mensaje
  if (!organizationId) {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 mt-1.5 h-10 px-3 py-2 border border-yellow-200 rounded-md bg-yellow-50">
          <span className="text-sm text-yellow-600">Sesión no disponible</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 mt-1.5 h-10 px-3 py-2 border rounded-md bg-gray-50">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Cargando personal...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 mt-1.5 h-10 px-3 py-2 border border-red-200 rounded-md bg-red-50">
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative mt-1.5">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          value={value || ''}
          onChange={handleChange}
          required={required}
          className="w-full h-10 pl-10 pr-3 py-2 border border-input bg-white rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {personnel.map(person => (
            <option key={person.id} value={person.id}>
              {person.nombre} {person.apellido || ''}
              {person.puesto ? ` - ${person.puesto}` : ''}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
