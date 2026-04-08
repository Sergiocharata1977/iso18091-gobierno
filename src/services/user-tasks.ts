/**
 * Servicio para gestionar tareas privadas del usuario
 */

import { db } from '@/lib/firebase';
import type {
  UserPrivateTask,
  UserPrivateTaskFormData,
} from '@/types/private-sections';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

/**
 * Obtener todas las tareas del usuario
 */
export async function getUserTasks(
  userId: string,
  filters?: {
    status?: UserPrivateTask['status'][];
    priority?: UserPrivateTask['priority'][];
    type?: UserPrivateTask['type'][];
  }
): Promise<UserPrivateTask[]> {
  const tasksRef = collection(db, `users/${userId}/private`);

  let q = query(
    tasksRef,
    where(
      'type',
      'in',
      filters?.type || [
        'task',
        'finding_review',
        'audit_preparation',
        'document_review',
      ]
    )
  );

  if (filters?.status) {
    q = query(q, where('status', 'in', filters.status));
  }

  q = query(q, orderBy('due_date', 'asc'), limit(50));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    created_at: (doc.data().created_at as Timestamp)?.toDate(),
    updated_at: (doc.data().updated_at as Timestamp)?.toDate(),
    due_date: (doc.data().due_date as Timestamp)?.toDate(),
  })) as UserPrivateTask[];
}

/**
 * Crear una nueva tarea
 */
export async function createUserTask(
  userId: string,
  data: UserPrivateTaskFormData
): Promise<string> {
  const tasksRef = collection(db, `users/${userId}/private`);

  const docRef = await addDoc(tasksRef, {
    ...data,
    type: data.type || 'task',
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Actualizar una tarea
 */
export async function updateUserTask(
  userId: string,
  taskId: string,
  data: Partial<UserPrivateTaskFormData>
): Promise<void> {
  const taskRef = doc(db, `users/${userId}/private`, taskId);

  await updateDoc(taskRef, {
    ...data,
    updated_at: serverTimestamp(),
  });
}

/**
 * Eliminar una tarea
 */
export async function deleteUserTask(
  userId: string,
  taskId: string
): Promise<void> {
  const taskRef = doc(db, `users/${userId}/private`, taskId);
  await deleteDoc(taskRef);
}

/**
 * Obtener tareas urgentes (vencen en menos de 3 días)
 */
export async function getUrgentTasks(
  userId: string
): Promise<UserPrivateTask[]> {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const tasksRef = collection(db, `users/${userId}/private`);
  const q = query(
    tasksRef,
    where('status', 'in', ['pending', 'in_progress']),
    where('due_date', '<=', threeDaysFromNow),
    orderBy('due_date', 'asc'),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    created_at: (doc.data().created_at as Timestamp)?.toDate(),
    updated_at: (doc.data().updated_at as Timestamp)?.toDate(),
    due_date: (doc.data().due_date as Timestamp)?.toDate(),
  })) as UserPrivateTask[];
}

/**
 * Obtener estadísticas de tareas
 */
export async function getTaskStats(userId: string) {
  const tasks = await getUserTasks(userId);

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    urgent: tasks.filter(t => {
      if (!t.due_date) return false;
      const daysUntilDue = Math.ceil(
        (t.due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue <= 3 && t.status !== 'completed';
    }).length,
  };
}
