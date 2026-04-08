import { withAuth } from '@/lib/api/withAuth';
import { verifyTargetUserOrganizationScope } from '@/middleware/verifyOrganization';
import { createUserTask, getUserTasks } from '@/services/user-tasks';
import type {
  UserPrivateTask,
  UserPrivateTaskFormData,
} from '@/types/private-sections';
import { NextResponse } from 'next/server';

const VALID_TASK_STATUS: UserPrivateTask['status'][] = [
  'pending',
  'in_progress',
  'review',
  'completed',
];

const VALID_TASK_PRIORITY: UserPrivateTask['priority'][] = [
  'low',
  'medium',
  'high',
  'urgent',
];

const VALID_TASK_TYPE: UserPrivateTask['type'][] = [
  'task',
  'finding_review',
  'audit_preparation',
  'document_review',
];

function parseEnumFilter<T extends string>(
  rawValue: string | null,
  allowedValues: readonly T[]
): T[] | undefined {
  if (!rawValue) return undefined;

  const values = rawValue
    .split(',')
    .map(value => value.trim())
    .filter((value): value is T => allowedValues.includes(value as T));

  return values.length > 0 ? values : undefined;
}

export const GET = withAuth(async (req, { params }, auth) => {
  try {
    const { id: userId } = await params;

    const isOwner = auth.uid === userId;
    const canReadForeignTasks = ['admin', 'super_admin'].includes(auth.role);
    if (!isOwner && !canReadForeignTasks) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!isOwner) {
      const scopeCheck = await verifyTargetUserOrganizationScope(auth, userId);
      if (!scopeCheck.ok) {
        return NextResponse.json(
          { error: scopeCheck.error || 'Acceso denegado' },
          { status: scopeCheck.status || 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = parseEnumFilter(
      searchParams.get('status'),
      VALID_TASK_STATUS
    );
    const priorityFilter = parseEnumFilter(
      searchParams.get('priority'),
      VALID_TASK_PRIORITY
    );
    const typeFilter = parseEnumFilter(
      searchParams.get('type'),
      VALID_TASK_TYPE
    );

    const filters: {
      status?: UserPrivateTask['status'][];
      priority?: UserPrivateTask['priority'][];
      type?: UserPrivateTask['type'][];
    } = {};
    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (typeFilter) filters.type = typeFilter;

    const tasks = await getUserTasks(userId, filters);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return NextResponse.json(
      { error: 'Error al obtener tareas' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req, { params }, auth) => {
  try {
    const { id: userId } = await params;

    if (auth.uid !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const data: UserPrivateTaskFormData = await req.json();
    if (!data.title) {
      return NextResponse.json(
        { error: 'El titulo es requerido' },
        { status: 400 }
      );
    }

    const taskId = await createUserTask(userId, data);
    return NextResponse.json({ id: taskId }, { status: 201 });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    return NextResponse.json(
      { error: 'Error al crear tarea' },
      { status: 500 }
    );
  }
});
