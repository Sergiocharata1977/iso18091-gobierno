'use client';

import { useState } from 'react';
import {
  UserRole,
  Permission,
} from '@/lib/sdk/modules/rrhh/UserProfileService';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw } from 'lucide-react';

interface RolePermissionsManagerProps {
  userId: string;
  currentRole: UserRole;
  currentPermissions: Permission[];
  onSave: (role: UserRole, permissions: Permission[]) => Promise<void>;
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acceso total al sistema',
  auditor: 'Puede crear y editar auditorías',
  manager: 'Puede ver reportes y auditorías',
  user: 'Acceso básico al sistema',
  viewer: 'Solo lectura',
};

const PERMISSION_GROUPS: Record<string, Permission[]> = {
  Auditorías: ['create_audit', 'edit_audit', 'delete_audit', 'view_audit'],
  Hallazgos: ['create_finding', 'edit_finding', 'delete_finding'],
  Acciones: ['create_action', 'edit_action', 'delete_action'],
  Administración: ['manage_users', 'manage_roles'],
  Reportes: ['view_reports', 'export_data'],
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'create_audit',
    'edit_audit',
    'delete_audit',
    'view_audit',
    'create_finding',
    'edit_finding',
    'delete_finding',
    'create_action',
    'edit_action',
    'delete_action',
    'manage_users',
    'view_reports',
    'export_data',
    'manage_roles',
  ],
  auditor: [
    'create_audit',
    'edit_audit',
    'view_audit',
    'create_finding',
    'edit_finding',
    'create_action',
    'edit_action',
    'view_reports',
    'export_data',
  ],
  manager: ['view_audit', 'view_reports', 'export_data'],
  user: ['view_audit'],
  viewer: ['view_audit'],
};

export function RolePermissionsManager({
  userId,
  currentRole,
  currentPermissions,
  onSave,
}: RolePermissionsManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [selectedPermissions, setSelectedPermissions] =
    useState<Permission[]>(currentPermissions);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    // Actualizar permisos según el rol
    setSelectedPermissions(ROLE_PERMISSIONS[role]);
  };

  const handlePermissionToggle = (permission: Permission) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(selectedRole, selectedPermissions);
      toast({
        title: 'Éxito',
        description: 'Rol y permisos actualizados correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedRole(currentRole);
    setSelectedPermissions(currentPermissions);
  };

  const hasChanges =
    selectedRole !== currentRole ||
    JSON.stringify(selectedPermissions.sort()) !==
      JSON.stringify(currentPermissions.sort());

  return (
    <div className="space-y-6">
      {/* Selección de Rol */}
      <Card>
        <CardHeader>
          <CardTitle>Rol del Usuario</CardTitle>
          <CardDescription>
            Selecciona el rol principal del usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(Object.keys(ROLE_DESCRIPTIONS) as UserRole[]).map(role => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === role
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold capitalize">{role}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {ROLE_DESCRIPTIONS[role]}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Permisos</CardTitle>
          <CardDescription>
            Configura los permisos específicos del usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
              <div key={group}>
                <h3 className="font-semibold mb-3">{group}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map(permission => (
                    <div
                      key={permission}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={permission}
                        checked={selectedPermissions.includes(permission)}
                        onCheckedChange={() =>
                          handlePermissionToggle(permission)
                        }
                      />
                      <label
                        htmlFor={permission}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Cambios */}
      {hasChanges && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">
              Cambios Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedRole !== currentRole && (
              <div className="text-sm">
                <span className="font-medium">Rol:</span> {currentRole} →{' '}
                <Badge>{selectedRole}</Badge>
              </div>
            )}
            {JSON.stringify(selectedPermissions.sort()) !==
              JSON.stringify(currentPermissions.sort()) && (
              <div className="text-sm">
                <span className="font-medium">Permisos:</span>{' '}
                {selectedPermissions.length} permisos asignados
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Descartar
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
