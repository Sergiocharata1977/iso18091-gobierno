import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/lib/firebase';
import { Timestamp, collection, doc, writeBatch } from 'firebase/firestore';
import { NextResponse } from 'next/server';

const SEED_ROLES = ['admin', 'super_admin'] as const;

export const POST = withAuth(
  async (_request, _context, auth) => {
    try {
      const organizationId = auth.organizationId;
      const userId = auth.uid;
      const responsibleUserName = auth.email || 'Usuario administrador';

      const now = Timestamp.now();
      const nowDate = new Date();
      const events = [
        {
          title: 'Auditoria Interna ISO 9001',
          description:
            'Auditoria de seguimiento del sistema de gestion de calidad',
          type: 'audit',
          date: Timestamp.fromDate(
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 15)
          ),
          status: 'scheduled',
          priority: 'high',
          sourceModule: 'audits',
          sourceRecordId: 'audit_001',
          sourceRecordNumber: 'AUD-2025-001',
          organizationId,
          responsibleUserId: userId,
          responsibleUserName,
          isSystemGenerated: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          title: 'Auditoria de Procesos',
          description: 'Revision de procesos operativos',
          type: 'audit',
          date: Timestamp.fromDate(
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 25)
          ),
          status: 'scheduled',
          priority: 'medium',
          sourceModule: 'audits',
          sourceRecordId: 'audit_002',
          sourceRecordNumber: 'AUD-2025-002',
          organizationId,
          responsibleUserId: userId,
          responsibleUserName,
          isSystemGenerated: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          title: 'Vencimiento: Manual de Calidad',
          description: 'Revision anual del manual de calidad',
          type: 'document_expiry',
          date: Timestamp.fromDate(
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 5)
          ),
          status: 'scheduled',
          priority: 'critical',
          sourceModule: 'documents',
          sourceRecordId: 'doc_001',
          sourceRecordNumber: 'DOC-MC-001',
          organizationId,
          responsibleUserId: userId,
          responsibleUserName,
          isSystemGenerated: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const batch = writeBatch(db);
      let count = 0;

      for (const event of events) {
        const docRef = doc(collection(db, 'calendar_events'));
        batch.set(docRef, event);
        count++;
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${count} eventos de prueba creados exitosamente`,
        count,
      });
    } catch (error) {
      console.error('Error seeding calendar events:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al crear eventos de prueba',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SEED_ROLES] }
);
