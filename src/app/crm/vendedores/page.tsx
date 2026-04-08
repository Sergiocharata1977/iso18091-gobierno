'use client';

import { ABMHeader, ABMViewMode } from '@/components/abm';
import { VendedoresGrid } from '@/components/crm/vendedores/VendedoresGrid';
import { VendedoresList } from '@/components/crm/vendedores/VendedoresList';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserData {
  uid: string;
  email: string;
  rol: string;
  personnelData?: {
    nombres: string;
    apellidos: string;
    email: string;
  };
  metadata: {
    lastSignInTime?: string;
  };
}

export default function VendedoresPage() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ABMViewMode>('list');

  useEffect(() => {
    const loadUsers = async () => {
      if (!organizationId) return;
      try {
        const res = await fetch(
          `/api/users/list?organization_id=${organizationId}`
        );
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [organizationId]);

  const comercialUsers = users.filter(u =>
    ['vendedor', 'gerente', 'jefe'].includes((u.rol || '').toLowerCase())
  );
  const usersToDisplay = comercialUsers.length > 0 ? comercialUsers : users;

  const filteredUsers = usersToDisplay.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.personnelData?.nombres || '').toLowerCase().includes(searchLower) ||
      (u.personnelData?.apellidos || '').toLowerCase().includes(searchLower) ||
      (u.rol || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (viewMode) {
      case 'grid':
        return <VendedoresGrid users={filteredUsers} />;
      default:
        return <VendedoresList users={filteredUsers} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ABMHeader
        title="Vendedores"
        subtitle="Equipo comercial y vendedores asignados"
        icon={<Users className="text-blue-600" />}
        searchPlaceholder="Buscar por nombre, email o rol..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        currentView={viewMode}
        onViewChange={setViewMode}
        hasKanban={false}
      />

      <p className="text-sm text-muted-foreground">
        Mostrando {filteredUsers.length} de {usersToDisplay.length} vendedores
      </p>

      {renderView()}
    </div>
  );
}
