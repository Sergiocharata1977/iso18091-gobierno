import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { NotificationService } from '@/lib/sdk/modules/calendar/NotificationService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const notificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    'audit_scheduled',
    'audit_upcoming',
    'action_due',
    'action_overdue',
    'conformity_alert',
    'finding_registered',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'sent', 'read', 'archived']).optional(),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const GET = withAuth(async request => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const notificationService = new NotificationService();

    let notifications;
    if (type) {
      notifications = await notificationService.getNotificationsByType(
        userId,
        type as any
      );
    } else if (status) {
      notifications = await notificationService.getNotificationsByUser(
        userId,
        status as any
      );
    } else {
      notifications = await notificationService.getNotificationsByUser(userId);
    }

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return errorHandler(error);
  }
});

export const POST = withAuth(async request => {
  try {
    const body = await request.json();
    const validated = notificationSchema.parse(body);

    const notificationService = new NotificationService();
    const notification = await notificationService.createNotification({
      ...validated,
      status: validated.status || 'pending',
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
