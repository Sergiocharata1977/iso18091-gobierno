'use client';

import { Action, ActionFilters } from '@/types/actions';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionCard } from './ActionCard';
import { ActionFiltersPanel } from './ActionFiltersPanel';

export function ActionList() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActionFilters>({});

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.responsiblePersonId)
        params.append('responsiblePersonId', filters.responsiblePersonId);
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/actions?${params.toString()}`);
      const data = await response.json();

      setActions(data.actions || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ActionFiltersPanel filters={filters} onFiltersChange={setFilters} />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && actions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron acciones</p>
        </div>
      )}

      {/* Grid */}
      {!loading && actions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map(action => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
