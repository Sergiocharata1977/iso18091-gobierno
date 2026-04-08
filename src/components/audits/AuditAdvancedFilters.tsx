'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuditStatus, AuditType } from '@/lib/sdk/modules/audits/types';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

export interface AuditFiltersState {
  searchText?: string;
  status?: AuditStatus[];
  auditType?: AuditType[];
  type?: AuditType[];
  dateRange?: { start: Date; end: Date };
  year?: number;
}

interface AuditAdvancedFiltersProps {
  onFiltersChange: (filters: AuditFiltersState) => void;
  isLoading?: boolean;
}

export function AuditAdvancedFilters({
  onFiltersChange,
  isLoading = false,
}: AuditAdvancedFiltersProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AuditStatus[]>([]);
  const [selectedType, setSelectedType] = useState<AuditType[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = (value: string) => {
    setSearchText(value);
    applyFilters({ searchText: value });
  };

  const toggleStatus = (status: AuditStatus) => {
    const newStatus = selectedStatus.includes(status)
      ? selectedStatus.filter(s => s !== status)
      : [...selectedStatus, status];
    setSelectedStatus(newStatus);
    applyFilters({ status: newStatus });
  };

  const toggleType = (type: AuditType) => {
    const newType = selectedType.includes(type)
      ? selectedType.filter(t => t !== type)
      : [...selectedType, type];
    setSelectedType(newType);
    applyFilters({ type: newType });
  };

  const handleYearChange = (year: number | undefined) => {
    setSelectedYear(year);
    applyFilters({ year });
  };

  const applyFilters = (updates: Partial<AuditFiltersState>) => {
    const filters: AuditFiltersState = {
      searchText: updates.searchText ?? searchText,
      status: updates.status ?? selectedStatus,
      auditType: updates.type ?? selectedType,
      year: updates.year ?? selectedYear,
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      key =>
        filters[key as keyof AuditFiltersState] === undefined &&
        delete filters[key as keyof AuditFiltersState]
    );

    onFiltersChange(filters);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedStatus([]);
    setSelectedType([]);
    setSelectedYear(undefined);
    onFiltersChange({});
  };

  const hasActiveFilters =
    searchText ||
    selectedStatus.length > 0 ||
    selectedType.length > 0 ||
    selectedYear;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar auditorías por título, número o alcance..."
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isLoading}
        >
          {showAdvanced ? 'Ocultar' : 'Filtros'} Avanzados
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <div className="flex flex-wrap gap-2">
              {(['planned', 'in_progress', 'completed'] as AuditStatus[]).map(
                status => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatus.includes(status)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-600'
                    }`}
                  >
                    {status === 'planned'
                      ? 'Planificada'
                      : status === 'in_progress'
                        ? 'En Progreso'
                        : 'Completada'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <div className="flex flex-wrap gap-2">
              {(['complete', 'partial'] as AuditType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedType.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-600'
                  }`}
                >
                  {type === 'complete' ? 'Completa' : 'Parcial'}
                </button>
              ))}
            </div>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Año
            </label>
            <select
              value={selectedYear ?? ''}
              onChange={e =>
                handleYearChange(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Todos los años</option>
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i
              ).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchText && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
              Búsqueda: {searchText}
              <button
                onClick={() => handleSearch('')}
                className="hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {selectedStatus.map(status => (
            <div
              key={status}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {status === 'planned'
                ? 'Planificada'
                : status === 'in_progress'
                  ? 'En Progreso'
                  : 'Completada'}
              <button
                onClick={() => toggleStatus(status)}
                className="hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedType.map(type => (
            <div
              key={type}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {type === 'complete' ? 'Completa' : 'Parcial'}
              <button
                onClick={() => toggleType(type)}
                className="hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedYear && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
              Año: {selectedYear}
              <button
                onClick={() => handleYearChange(undefined)}
                className="hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
