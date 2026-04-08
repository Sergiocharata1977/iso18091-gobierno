import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';

// Tipos para las colecciones
export interface Department {
  id?: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id?: string;
  name: string;
  description?: string;
  departmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Personnel {
  id?: string;
  name: string;
  email: string;
  position: string;
  department: string;
  hireDate: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Funciones para Departamentos
export const getDepartments = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'departments'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting departments:', error);
    return [];
  }
};

export const addDepartment = async (
  department: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const docRef = await addDoc(collection(db, 'departments'), {
      ...department,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding department:', error);
    return { success: false, error };
  }
};

// Funciones para Puestos
export const getPositions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'positions'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting positions:', error);
    return [];
  }
};

export const addPosition = async (
  position: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const docRef = await addDoc(collection(db, 'positions'), {
      ...position,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding position:', error);
    return { success: false, error };
  }
};

// Funciones para Personal
export const getPersonnel = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'personnel'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting personnel:', error);
    return [];
  }
};

export const addPersonnel = async (
  personnel: Omit<Personnel, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const docRef = await addDoc(collection(db, 'personnel'), {
      ...personnel,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding personnel:', error);
    return { success: false, error };
  }
};
