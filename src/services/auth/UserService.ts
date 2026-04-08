// Service for managing users collection

import { db } from '@/firebase/config';
import { TIPO_PERSONAL_TO_ROL, User } from '@/types/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
// Note: PersonnelService removed - use fetch API instead to avoid Admin SDK in client context

const COLLECTION_NAME = 'users';

export class UserService {
  /**
   * @deprecated Para nuevos registros de clientes usar SelfRegistrationService.register()
   * Este método establece status: 'pending_approval' y activo: false - es el flujo LEGACY
   * de alta manual que requiere aprobación de administrador.
   * Mantener para compatibilidad con cuentas existentes y flujo super-admin.
   */
  static async createUser(authUser: {
    uid: string;
    email: string;
    organization_id?: string; // Requerido para multi-tenant (opcional para registro inicial)
    modulos_habilitados?: string[] | null;
  }): Promise<User> {
    try {
      const modulosHabilitados =
        authUser.modulos_habilitados === undefined
          ? null
          : authUser.modulos_habilitados;
      const userData = {
        email: authUser.email,
        personnel_id: null,
        rol: 'operario' as const,
        activo: false, // Default: inactivo hasta aprobación
        status: 'pending_approval' as const,
        planType: 'none' as const,
        organization_id: authUser.organization_id || null,
        modulos_habilitados: modulosHabilitados, // null = acceso completo por defecto
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const userRef = doc(db, COLLECTION_NAME, authUser.uid);
      await setDoc(userRef, userData);

      return {
        id: authUser.uid,
        ...userData,
        personnel_id: null,
        modulos_habilitados: modulosHabilitados,
        created_at: new Date(),
        updated_at: new Date(),
      } as User;
    } catch (error) {
      console.error('[UserService] Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // ... (otros métodos existentes getById, getByEmail, etc.)

  /**
   * Create a self-registered admin user record
   * @param authUser Firebase Auth user object
   * @returns Created user
   */
  static async createSelfRegisteredUser(authUser: {
    uid: string;
    email: string;
    organization_id: string;
    modulos_habilitados?: string[] | null;
  }): Promise<User> {
    try {
      const modulosHabilitados =
        authUser.modulos_habilitados === undefined
          ? null
          : authUser.modulos_habilitados;
      const userData = {
        email: authUser.email,
        personnel_id: null,
        rol: 'admin' as const,
        activo: true,
        status: 'active' as const,
        planType: 'trial' as const,
        organization_id: authUser.organization_id,
        modulos_habilitados: modulosHabilitados,
        is_first_login: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const userRef = doc(db, COLLECTION_NAME, authUser.uid);
      await setDoc(userRef, userData);

      return {
        id: authUser.uid,
        ...userData,
        personnel_id: null,
        modulos_habilitados: modulosHabilitados,
        created_at: new Date(),
        updated_at: new Date(),
      } as User;
    } catch (error) {
      console.error('[UserService] Error creating self-registered user:', error);
      throw new Error('Failed to create self-registered user');
    }
  }

  /**
   * Approve user and start trial
   * @param userId User ID
   * @param trialDays Number of days for the trial (default 30)
   */
  static async approveUser(
    userId: string,
    trialDays: number = 30
  ): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION_NAME, userId);
      const now = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(now.getDate() + trialDays);

      await updateDoc(userRef, {
        activo: true,
        status: 'active',
        planType: 'trial',
        trialStartDate: serverTimestamp(),
        expirationDate: expirationDate, // Firestore convierte Date a Timestamp automáticamente
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error approving user:', error);
      throw new Error('Failed to approve user');
    }
  }

  /**
   * Extend user trial or subscription
   * @param userId User ID
   * @param extraDays Number of days to add
   */
  static async extendTrial(userId: string, extraDays: number): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION_NAME, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) throw new Error('User not found');

      const currentExpiry =
        userDoc.data().expirationDate?.toDate() || new Date();
      // Si ya expiró, extender desde hoy. Si no, sumar a la fecha actual.
      const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;

      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + extraDays);

      // Si estaba expirado, lo reactivamos
      const updates: any = {
        expirationDate: newExpiry,
        updated_at: serverTimestamp(),
      };

      if (userDoc.data().status === 'expired') {
        updates.status = 'active';
        updates.activo = true;
      }

      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error extending trial:', error);
      throw new Error('Failed to extend trial');
    }
  }

  /**
   * Reject/Disable user
   * @param userId User ID
   */
  static async rejectUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION_NAME, userId);
      await updateDoc(userRef, {
        activo: false,
        status: 'suspended', // O 'pending_approval' si quieres devolverlo a revisión
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw new Error('Failed to reject user');
    }
  }

  // Métodos originales continuan abajo...
  /**
   * Assign personnel to user and auto-assign role
   * @param userId Firebase Auth UID
   * @param personnelId Personnel ID
   */

  /**
   * Get user by Firebase Auth UID
   * @param userId Firebase Auth UID
   * @returns User or null if not found
   */
  static async getById(userId: string): Promise<User | null> {
    try {
      // Use document ID directly
      const userRef = doc(db, COLLECTION_NAME, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();

      // Validar que el usuario tenga organization_id (excepto super_admin)
      let organizationId = data.organization_id || null;

      if (!data.organization_id && data.rol !== 'super_admin') {
        console.warn(`[UserService] User ${userId} has no organization_id`);
      }

      return {
        id: userDoc.id,
        email: data.email,
        personnel_id: data.personnel_id || null,
        rol: data.rol,
        activo: data.activo,
        organization_id: organizationId,
        modulos_habilitados: data.modulos_habilitados || null,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as User;
    } catch (error) {
      console.error('[UserService] Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param email User email
   * @returns User or null if not found
   */
  static async getByEmail(email: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        email: data.email,
        personnel_id: data.personnel_id || null,
        rol: data.rol,
        activo: data.activo,
        organization_id: data.organization_id || null,
        modulos_habilitados: data.modulos_habilitados || null,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to get user');
    }
  }

  /**
   * Assign personnel to user and auto-assign role
   * @param userId Firebase Auth UID
   * @param personnelId Personnel ID
   */
  static async assignPersonnel(
    userId: string,
    personnelId: string
  ): Promise<void> {
    try {
      // Validate personnel exists via API (avoid Admin SDK import)
      const response = await fetch(`/api/rrhh/personnel/${personnelId}`);
      if (!response.ok) {
        throw new Error('Personnel not found');
      }
      const personnel = await response.json();

      // Determine role based on tipo_personal
      const rol = TIPO_PERSONAL_TO_ROL[personnel.tipo_personal] || 'operario';

      // Use document ID directly
      const userRef = doc(db, COLLECTION_NAME, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Update user
      await updateDoc(userRef, {
        personnel_id: personnelId,
        rol: rol,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error assigning personnel:', error);
      throw new Error('Failed to assign personnel');
    }
  }

  /**
   * Update user role
   * @param userId Firebase Auth UID
   * @param rol New role
   */
  static async updateRole(userId: string, rol: User['rol']): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION_NAME, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      await updateDoc(userRef, {
        rol: rol,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating role:', error);
      throw new Error('Failed to update role');
    }
  }

  /**
   * Activate or deactivate user
   * @param userId Firebase Auth UID
   * @param activo Active status
   */
  static async setActive(userId: string, activo: boolean): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION_NAME, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      await updateDoc(userRef, {
        activo: activo,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error setting active status:', error);
      throw new Error('Failed to set active status');
    }
  }

  /**
   * Get users without personnel assigned
   * @returns Array of users without personnel
   */
  static async getUsersWithoutPersonnel(): Promise<User[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('personnel_id', '==', '')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // Usar doc.id en lugar de data.id
          email: data.email,
          personnel_id: data.personnel_id || null,
          rol: data.rol,
          activo: data.activo,
          organization_id: data.organization_id || null,
          modulos_habilitados: data.modulos_habilitados || null,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as User;
      });
    } catch (error) {
      console.error('Error getting users without personnel:', error);
      throw new Error('Failed to get users without personnel');
    }
  }

  /**
   * Get all users
   * @returns Array of all users
   */
  static async getAll(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          personnel_id: data.personnel_id || null,
          rol: data.rol,
          activo: data.activo,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as User;
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to get users');
    }
  }
}

