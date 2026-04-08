'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Competence, CompetenceStatus, Personnel } from '@/types/rrhh';
import { ArrowLeft, Download, Filter, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MatrizPolivalenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [persRes, compRes] = await Promise.all([
        fetch('/api/rrhh/personnel'),
        fetch('/api/rrhh/competencias'),
      ]);

      if (persRes.ok) {
        const data = await persRes.json();
        setPersonnel(
          Array.isArray(data)
            ? data.filter((p: Personnel) => p.estado === 'Activo')
            : []
        );
      }
      if (compRes.ok) {
        const data = await compRes.json();
        setCompetences(
          Array.isArray(data) ? data.filter((c: Competence) => c.activo) : []
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = [
    ...new Set(competences.map(c => c.categoriaNombre || c.categoria)),
  ];

  const filteredCompetences = competences.filter(c => {
    const cat = c.categoriaNombre || c.categoria;
    if (filterCategory !== 'all' && cat !== filterCategory) return false;
    if (
      searchTerm &&
      !c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  const getLevel = (person: Personnel, competenceId: string): number => {
    const status = person.competenciasActuales?.find(
      (s: CompetenceStatus) => s.competenciaId === competenceId
    );
    return status?.nivelAlcanzado || 0;
  };

  const getLevelStyle = (nivel: number) => {
    if (nivel === 0) return 'bg-gray-100 text-gray-400';
    if (nivel === 1) return 'bg-red-100 text-red-700';
    if (nivel === 2) return 'bg-orange-100 text-orange-700';
    if (nivel === 3) return 'bg-yellow-100 text-yellow-700';
    if (nivel === 4) return 'bg-lime-100 text-lime-700';
    return 'bg-green-100 text-green-700';
  };

  const getLevelLabel = (nivel: number) => {
    switch (nivel) {
      case 0:
        return '-';
      case 1:
        return 'B';
      case 2:
        return 'I';
      case 3:
        return 'A';
      case 4:
        return 'E';
      case 5:
        return 'M';
      default:
        return nivel.toString();
    }
  };

  const getCategoryColor = (categoria: string) => {
    const colors: Record<string, string> = {
      tecnica: 'bg-blue-500',
      blanda: 'bg-purple-500',
      seguridad: 'bg-red-500',
      iso_9001: 'bg-emerald-500',
      otra: 'bg-gray-500',
    };
    return colors[categoria] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const competencesByCategory = categories
    .map(cat => ({
      category: cat,
      competences: filteredCompetences.filter(
        c => (c.categoriaNombre || c.categoria) === cat
      ),
    }))
    .filter(g => g.competences.length > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-600" />
              Matriz de Polivalencia
            </h1>
            <p className="text-gray-500 text-sm">
              {personnel.length} empleados × {filteredCompetences.length}{' '}
              competencias
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-md">
        <Filter className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar competencia..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Niveles:</span>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded ${getLevelStyle(0)}`}>
            - Sin evaluar
          </span>
          <span className={`px-2 py-1 rounded ${getLevelStyle(1)}`}>
            B Básico
          </span>
          <span className={`px-2 py-1 rounded ${getLevelStyle(2)}`}>
            I Intermedio
          </span>
          <span className={`px-2 py-1 rounded ${getLevelStyle(3)}`}>
            A Avanzado
          </span>
          <span className={`px-2 py-1 rounded ${getLevelStyle(4)}`}>
            E Experto
          </span>
          <span className={`px-2 py-1 rounded ${getLevelStyle(5)}`}>
            M Maestro
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 bg-gray-100 z-10 p-3 text-left min-w-[200px]">
                  Empleado
                </th>
                {competencesByCategory.map(group => (
                  <th
                    key={group.category}
                    colSpan={group.competences.length}
                    className={`p-2 text-center text-white ${getCategoryColor(group.category)}`}
                  >
                    {group.category.charAt(0).toUpperCase() +
                      group.category.slice(1)}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 z-10 p-2"></th>
                {filteredCompetences.map(comp => (
                  <th
                    key={comp.id}
                    className="p-2 text-center min-w-[80px] max-w-[120px]"
                    title={comp.nombre}
                  >
                    <div className="text-xs font-normal truncate">
                      {comp.nombre.length > 12
                        ? comp.nombre.substring(0, 10) + '...'
                        : comp.nombre}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, rowIndex) => (
                <tr
                  key={person.id}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="sticky left-0 bg-inherit z-10 p-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-sm font-bold">
                        {person.nombres?.[0]}
                        {person.apellidos?.[0]}
                      </div>
                      <div>
                        <div className="text-sm">
                          {person.nombres} {person.apellidos}
                        </div>
                        <div className="text-xs text-gray-500">
                          {person.puesto || 'Sin puesto'}
                        </div>
                      </div>
                    </div>
                  </td>
                  {filteredCompetences.map(comp => {
                    const level = getLevel(person, comp.id);
                    return (
                      <td
                        key={comp.id}
                        className={`p-2 text-center ${getLevelStyle(level)}`}
                      >
                        <span className="font-bold">
                          {getLevelLabel(level)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(personnel.length === 0 || filteredCompetences.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay datos para mostrar</p>
          <p className="text-sm">
            Necesitas empleados activos y competencias definidas
          </p>
        </div>
      )}
    </div>
  );
}
