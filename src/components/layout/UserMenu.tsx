'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PersonnelInfo {
  nombres: string;
  apellidos: string;
}

export function UserMenu() {
  const [personnelInfo, setPersonnelInfo] = useState<PersonnelInfo | null>(
    null
  );
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchPersonnelInfo() {
      if (!user?.personnel_id) return;
      try {
        const response = await fetch(
          `/api/rrhh/personnel/${user.personnel_id}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.data) {
          setPersonnelInfo({
            nombres: data.data.nombres,
            apellidos: data.data.apellidos,
          });
        }
      } catch (error) {
        console.error('Error fetching personnel info:', error);
      }
    }

    fetchPersonnelInfo();
  }, [user?.personnel_id]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  if (!user) return null;

  const avatarLetter = personnelInfo
    ? personnelInfo.nombres.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  const displayName = personnelInfo
    ? `${personnelInfo.nombres} ${personnelInfo.apellidos}`
    : user.email;

  return (
    <DropdownMenu modal={false}>
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {displayName}
          </p>
          {personnelInfo && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {user.email}
            </p>
          )}
        </div>

        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white text-xl font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-xl hover:scale-105 border-2 border-white ring-2 ring-emerald-100 dark:ring-emerald-900"
            aria-label="Menu de usuario"
          >
            {avatarLetter}
          </button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-64 z-[2147483647] border-border bg-popover p-0"
      >
        <DropdownMenuLabel className="px-4 py-3">
          <p className="text-sm font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {user.email}
          </p>
          {personnelInfo && (
            <p className="text-xs text-emerald-600 mt-1">
              Vinculado a Personal
            </p>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleNavigation('/mi-panel')}
          className="px-4 py-2.5 cursor-pointer gap-3"
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-600" />
          Mi Panel
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="px-4 py-2.5 cursor-pointer gap-3 text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
