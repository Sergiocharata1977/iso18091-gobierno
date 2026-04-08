import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { z } from 'zod';

// Tipos de rol
export type UserRole = 'admin' | 'auditor' | 'manager' | 'user' | 'viewer';

// Permisos disponibles
export type Permission =
  | 'create_audit'
  | 'edit_audit'
  | 'delete_audit'
  | 'view_audit'
  | 'create_finding'
  | 'edit_finding'
  | 'delete_finding'
  | 'create_action'
  | 'edit_action'
  | 'delete_action'
  | 'manage_users'
  | 'view_reports'
  | 'export_data'
  | 'manage_roles';

// Interfaz de perfil de usuario
export interface UserProfile {
  id?: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  lastLogin?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  deletedAt?: Timestamp | Date | null;
}

// Interfaz de cambio de usuario
export interface UserChange {
  id?: string;
  userId: string;
  changedBy: string;
  changeType:
    | 'profile_update'
    | 'role_change'
    | 'permission_change'
    | 'status_change';
  oldValue?: any;
  newValue?: any;
  description: string;
  createdAt?: Timestamp | Date;
}

// Schema de validación
const userProfileSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'auditor', 'manager', 'user', 'viewer']),
  permissions: z.array(z.string()).default([]),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

export class UserProfileService {
  protected collectionName = 'userProfiles';
  protected changesCollectionName = 'userChanges';
  protected schema = userProfileSchema;

  /**
   * Crear perfil de usuario
   */
  async createUserProfile(
    data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserProfile> {
    const validated = this.schema.parse(data);
    const db = getFirestore();

    const docRef = await addDoc(collection(db, this.collectionName), {
      ...validated,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      deletedAt: null,
    });

    return {
      id: docRef.id,
      ...validated,
      permissions: validated.permissions as Permission[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Obtener perfil de usuario por ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as UserProfile;
  }

  /**
   * Obtener perfil por email
   */
  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('email', '==', email),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as UserProfile;
  }

  /**
   * Obtener todos los usuarios
   */
  async getAllUsers(activeOnly: boolean = true): Promise<UserProfile[]> {
    const db = getFirestore();
    let q;

    if (activeOnly) {
      q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        where('deletedAt', '==', null)
      );
    } else {
      q = query(
        collection(db, this.collectionName),
        where('deletedAt', '==', null)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as UserProfile
    );
  }

  /**
   * Obtener usuarios por rol
   */
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('role', '==', role),
      where('isActive', '==', true),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as UserProfile
    );
  }

  /**
   * Obtener usuarios por departamento
   */
  async getUsersByDepartment(department: string): Promise<UserProfile[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('department', '==', department),
      where('isActive', '==', true),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as UserProfile
    );
  }

  /**
   * Actualizar perfil de usuario
   */
  async updateUserProfile(
    userId: string,
    data: Partial<UserProfile>
  ): Promise<UserProfile> {
    const db = getFirestore();
    const profile = await this.getUserProfile(userId);

    if (!profile || !profile.id) {
      throw new Error('User profile not found');
    }

    const docRef = doc(db, this.collectionName, profile.id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });

    return {
      ...profile,
      ...data,
      updatedAt: new Date(),
    };
  }

  /**
   * Cambiar rol de usuario
   */
  async changeUserRole(
    userId: string,
    newRole: UserRole,
    changedBy: string
  ): Promise<UserProfile> {
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    const oldRole = profile.role;

    // Registrar cambio
    await this.recordUserChange({
      userId,
      changedBy,
      changeType: 'role_change',
      oldValue: oldRole,
      newValue: newRole,
      description: `Role changed from ${oldRole} to ${newRole}`,
    });

    // Actualizar rol
    return this.updateUserProfile(userId, { role: newRole });
  }

  /**
   * Cambiar permisos de usuario
   */
  async changeUserPermissions(
    userId: string,
    permissions: Permission[],
    changedBy: string
  ): Promise<UserProfile> {
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    const oldPermissions = profile.permissions;

    // Registrar cambio
    await this.recordUserChange({
      userId,
      changedBy,
      changeType: 'permission_change',
      oldValue: oldPermissions,
      newValue: permissions,
      description: `Permissions updated`,
    });

    // Actualizar permisos
    return this.updateUserProfile(userId, { permissions });
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(
    userId: string,
    isActive: boolean,
    changedBy: string
  ): Promise<UserProfile> {
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    // Registrar cambio
    await this.recordUserChange({
      userId,
      changedBy,
      changeType: 'status_change',
      oldValue: profile.isActive,
      newValue: isActive,
      description: `User ${isActive ? 'activated' : 'deactivated'}`,
    });

    // Actualizar estado
    return this.updateUserProfile(userId, { isActive });
  }

  /**
   * Registrar cambio de usuario
   */
  async recordUserChange(
    data: Omit<UserChange, 'id' | 'createdAt'>
  ): Promise<UserChange> {
    const db = getFirestore();

    const docRef = await addDoc(collection(db, this.changesCollectionName), {
      ...data,
      createdAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
    };
  }

  /**
   * Obtener historial de cambios de usuario
   */
  async getUserChangeHistory(
    userId: string,
    limit: number = 50
  ): Promise<UserChange[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.changesCollectionName),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as UserChange
      )
      .sort((a, b) => {
        const dateA =
          a.createdAt instanceof Timestamp
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
        const dateB =
          b.createdAt instanceof Timestamp
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Verificar si usuario tiene permiso
   */
  async hasPermission(
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return false;

    // Admin tiene todos los permisos
    if (profile.role === 'admin') return true;

    return profile.permissions.includes(permission);
  }

  /**
   * Verificar si usuario tiene rol
   */
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return false;

    return profile.role === role;
  }

  /**
   * Obtener permisos por rol
   */
  getPermissionsByRole(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
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

    return rolePermissions[role] || [];
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId: string): Promise<UserProfile> {
    return this.updateUserProfile(userId, {
      lastLogin: new Date(),
    });
  }

  /**
   * Eliminar perfil de usuario (soft delete)
   */
  async deleteUserProfile(userId: string): Promise<boolean> {
    const db = getFirestore();
    const profile = await this.getUserProfile(userId);

    if (!profile || !profile.id) {
      return false;
    }

    const docRef = doc(db, this.collectionName, profile.id);
    await updateDoc(docRef, {
      deletedAt: Timestamp.now(),
      isActive: false,
    });

    return true;
  }
}
