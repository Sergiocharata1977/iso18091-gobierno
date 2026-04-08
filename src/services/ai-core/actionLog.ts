import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ActionLogEntry } from '@/types/ai-core';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'ai_action_logs';

export class AIActionLogService {
  static async write(entry: ActionLogEntry): Promise<string> {
    const db = getAdminFirestore();
    const docRef = await db.collection(COLLECTION).add({
      userId: entry.userId,
      organizationId: entry.organizationId,
      conversationId: entry.conversationId || null,
      channel: entry.channel,
      tool: entry.tool,
      action: entry.action,
      input: entry.input || {},
      result: entry.result,
      traceId: entry.traceId,
      requestedBy: entry.requestedBy,
      timestamp: Timestamp.now(),
    });
    return docRef.id;
  }
}
