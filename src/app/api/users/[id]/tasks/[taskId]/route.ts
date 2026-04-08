import { withAuth } from '@/lib/api/withAuth';
import { deleteUserTask, updateUserTask } from '@/services/user-tasks';
import type { UserPrivateTaskFormData } from '@/types/private-sections';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(async (req, { params }, auth) => {
  try {
    const { id: userId, taskId } = await params;

    if (auth.uid !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const data: Partial<UserPrivateTaskFormData> = await req.json();
    await updateUserTask(userId, taskId, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tarea' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (_req, { params }, auth) => {
  try {
    const { id: userId, taskId } = await params;

    if (auth.uid !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await deleteUserTask(userId, taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return NextResponse.json(
      { error: 'Error al eliminar tarea' },
      { status: 500 }
    );
  }
});
