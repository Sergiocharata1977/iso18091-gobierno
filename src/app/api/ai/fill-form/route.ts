import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  extractFieldsFromVoice,
  VoiceFormFillResult,
} from '@/services/ai-core/voiceFormFiller';
import { ChecklistField } from '@/types/checklists';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const FillFormRequestSchema = z.object({
  voice_text: z.string().trim().min(1, 'voice_text requerido'),
  template_id: z.string().trim().min(1, 'template_id requerido'),
});

async function loadTemplateFields(
  organizationId: string,
  templateId: string
): Promise<ChecklistField[] | null> {
  const db = getAdminFirestore();

  const orgTemplateRef = db
    .collection('organizations')
    .doc(organizationId)
    .collection('checklist_templates')
    .doc(templateId);

  const orgTemplateDoc = await orgTemplateRef.get();
  if (orgTemplateDoc.exists) {
    const data = orgTemplateDoc.data() as { campos?: ChecklistField[] } | undefined;
    return Array.isArray(data?.campos) ? data!.campos : [];
  }

  const legacyDoc = await db.collection('checklistTemplates').doc(templateId).get();
  if (!legacyDoc.exists) {
    return null;
  }

  const legacyData = legacyDoc.data() as
    | { campos?: ChecklistField[]; organization_id?: string }
    | undefined;

  if (
    legacyData?.organization_id &&
    legacyData.organization_id !== organizationId
  ) {
    return null;
  }

  return Array.isArray(legacyData?.campos) ? legacyData!.campos : [];
}

const authenticatedPost = withAuth(
  async (request, _context, auth) => {
    const body = FillFormRequestSchema.parse(await request.json());
    const checklistFields = await loadTemplateFields(
      auth.organizationId,
      body.template_id
    );

    if (!checklistFields) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template no encontrada',
        },
        { status: 404 }
      );
    }

    const result: VoiceFormFillResult = await extractFieldsFromVoice(
      body.voice_text,
      checklistFields
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  },
  { roles: ['operario', 'jefe', 'gerente', 'admin'] }
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return authenticatedPost(request, context);
}
