import { getAdminFirestore } from '@/lib/firebase/admin';
import { NormCategory } from '@/types/normPoints';
import { Timestamp } from 'firebase-admin/firestore';

interface SeedNormPointsInput {
  organizationId: string;
  clauses: string[];
  createdBy: string;
}

function mapClauseToCategory(chapter: number): NormCategory {
  switch (chapter) {
    case 4:
      return 'contexto';
    case 5:
      return 'liderazgo';
    case 6:
      return 'planificacion';
    case 7:
      return 'soporte';
    case 8:
      return 'operacion';
    case 9:
      return 'evaluacion';
    case 10:
      return 'mejora';
    default:
      return 'operacion';
  }
}

function parseChapter(code: string): number {
  const first = Number(code.split('.')[0]);
  return Number.isFinite(first) && first >= 4 && first <= 10 ? first : 8;
}

export class NormPointSeedService {
  static async seedFromClauses(
    input: SeedNormPointsInput
  ): Promise<{ created: number; skipped: number }> {
    const db = getAdminFirestore();
    const uniqueClauses = [...new Set(input.clauses)].filter(Boolean);

    if (uniqueClauses.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const snapshot = await db.collection('normPoints').get();
    const existingCodes = new Set(
      snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.organization_id === input.organizationId)
        .map(data => `${data.tipo_norma || ''}:${data.code || ''}`)
    );

    const now = Timestamp.now();
    let created = 0;
    let skipped = 0;

    for (const clause of uniqueClauses) {
      const code = clause.trim();
      const compound = `iso_9001:${code}`;

      if (existingCodes.has(compound)) {
        skipped += 1;
        continue;
      }

      const chapter = parseChapter(code);
      const category = mapClauseToCategory(chapter);

      await db.collection('normPoints').add({
        organization_id: input.organizationId,
        code,
        title: `ISO 9001 - Clausula ${code}`,
        description: `Punto de norma ISO 9001 clausula ${code}`,
        requirement: `Cumplir con los requisitos de la clausula ${code}.`,
        tipo_norma: 'iso_9001',
        chapter,
        category,
        is_mandatory: true,
        priority: 'alta',
        created_by: input.createdBy,
        updated_by: input.createdBy,
        created_at: now,
        updated_at: now,
      });

      existingCodes.add(compound);
      created += 1;
    }

    return { created, skipped };
  }
}
