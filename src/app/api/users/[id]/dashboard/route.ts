import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyTargetUserOrganizationScope } from '@/middleware/verifyOrganization';
import { getTaskStats, getUserTasks } from '@/services/user-tasks';
import { Timestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }, auth) => {
  try {
    const { id: userId } = await params;

    const isOwner = auth.uid === userId;
    const isAdmin = ['admin', 'super_admin'].includes(auth.role);
    if (!isOwner && !isAdmin) {
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

    const [taskStats, urgentTasks, upcomingAudits, openFindings] =
      await Promise.all([
        getTaskStats(userId),
        getUserTasks(userId, { status: ['pending', 'in_progress'] }),
        getUpcomingAudits(userId),
        getOpenFindings(userId),
      ]);

    const summary = {
      pending_tasks: taskStats.pending,
      active_goals: 0,
      upcoming_audits: upcomingAudits.length,
      open_findings: openFindings.length,
    };

    const recent_activity = [
      ...urgentTasks
        .slice(0, 3)
        .map(t => ({ type: 'task', title: t.title, date: t.created_at })),
      ...upcomingAudits.slice(0, 2).map((a: any) => ({
        type: 'audit',
        title: a.title,
        date: a.plannedDate,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return NextResponse.json({
      summary,
      tasks: urgentTasks.slice(0, 5),
      goals: [],
      recent_activity,
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    return NextResponse.json(
      { error: 'Error al obtener dashboard' },
      { status: 500 }
    );
  }
});

async function getUpcomingAudits(userId: string) {
  const now = new Date();
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('audits')
    .where('participants', 'array-contains', userId)
    .where('plannedDate', '>=', now)
    .limit(10)
    .get();

  const audits = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    plannedDate:
      (doc.data().plannedDate as Timestamp | undefined)?.toDate?.() ||
      new Date(),
  }));

  return audits.sort(
    (a: any, b: any) => a.plannedDate.getTime() - b.plannedDate.getTime()
  );
}

async function getOpenFindings(userId: string) {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('findings')
    .where('responsibleId', '==', userId)
    .where('status', '==', 'open')
    .limit(20)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
