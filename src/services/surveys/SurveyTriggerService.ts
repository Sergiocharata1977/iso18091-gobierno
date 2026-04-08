import { getAdminFirestore } from '@/lib/firebase/admin';
import { randomUUID } from 'crypto';
import type {
  Survey,
  SurveyFormData,
  SurveyResponseData,
  SurveyResponseFormData,
} from '@/types/surveys';
import {
  getSurveyAudience,
  getSurveyChannel,
  requiresNpsScore,
} from '@/types/surveys';

const SURVEYS_COLLECTION = 'surveys';
const RESPONSES_COLLECTION = 'survey_responses';

type FirestoreDate =
  | Date
  | { toDate?: () => Date }
  | string
  | number
  | null
  | undefined;

function asDate(value: FirestoreDate): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function normalizeSurvey(id: string, data: Record<string, unknown>): Survey {
  const type = data.type as Survey['type'];

  return {
    id,
    ...(data as Omit<Survey, 'id'>),
    audience: (data.audience as Survey['audience']) ?? getSurveyAudience(type),
    channel: (data.channel as Survey['channel']) ?? getSurveyChannel(type),
    createdAt: asDate(data.createdAt as FirestoreDate),
    updatedAt: asDate(data.updatedAt as FirestoreDate),
    respondedAt: data.respondedAt
      ? asDate(data.respondedAt as FirestoreDate)
      : undefined,
  };
}

function normalizeResponse(
  id: string,
  data: Record<string, unknown>
): SurveyResponseData {
  return {
    id,
    ...(data as Omit<SurveyResponseData, 'id'>),
    createdAt: asDate(data.createdAt as FirestoreDate),
  };
}

export class SurveyTriggerService {
  static buildExternalSurveyPath(token: string, survey?: Pick<Survey, 'type'>): string {
    if (survey?.type === 'ciudadana') {
      return `/participacion?token=${token}`;
    }

    return `/app-cliente/encuesta/${token}`;
  }

  static async createTriggeredSurvey(input: {
    organizationId: string;
    createdBy: string;
    createdByName: string;
    title: string;
    type: SurveyFormData['type'];
    trigger: SurveyFormData['trigger'];
    audience?: SurveyFormData['audience'];
    channel?: SurveyFormData['channel'];
    crm_cliente_id: string;
    crm_contacto_id?: string | null;
    targetClientName?: string | null;
    targetClientEmail?: string | null;
    relatedOrderId?: string;
    relatedOrderNumber?: string;
    relatedServiceId?: string;
    questions: Survey['questions'];
    surveyNumber: string;
  }): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date();
    const audience = input.audience ?? getSurveyAudience(input.type);
    const channel = input.channel ?? getSurveyChannel(input.type);

    const docRef = await db.collection(SURVEYS_COLLECTION).add({
      organization_id: input.organizationId,
      surveyNumber: input.surveyNumber,
      title: input.title,
      type: input.type,
      audience,
      channel,
      status: 'active',
      trigger: input.trigger,
      questions: input.questions,
      responseCount: 0,
      averageRating: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      externalToken: randomUUID(),
      crm_cliente_id: input.crm_cliente_id,
      crm_contacto_id: input.crm_contacto_id ?? null,
      targetClientName: input.targetClientName ?? null,
      targetClientEmail: input.targetClientEmail ?? null,
      relatedOrderId: input.relatedOrderId ?? null,
      relatedOrderNumber: input.relatedOrderNumber ?? null,
      relatedServiceId: input.relatedServiceId ?? null,
    });

    return docRef.id;
  }

  static async createAndPrepareDispatch(
    input: Parameters<typeof SurveyTriggerService.createTriggeredSurvey>[0] & {
      baseUrl?: string;
    }
  ) {
    const surveyId = await this.createTriggeredSurvey(input);
    const survey = await this.getSurveyById(surveyId);

    if (!survey || !survey.externalToken) {
      throw new Error('No se pudo preparar el enlace de la encuesta');
    }

    const path = this.buildExternalSurveyPath(survey.externalToken, survey);

    return {
      surveyId,
      externalToken: survey.externalToken,
      path,
      url: input.baseUrl
        ? `${input.baseUrl.replace(/\/$/, '')}${path}`
        : path,
    };
  }

  static async getSurveyById(id: string): Promise<Survey | null> {
    const db = getAdminFirestore();
    const snapshot = await db.collection(SURVEYS_COLLECTION).doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    return normalizeSurvey(id, snapshot.data() as Record<string, unknown>);
  }

  static async getSurveyByExternalToken(token: string): Promise<Survey | null> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(SURVEYS_COLLECTION)
      .where('externalToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return normalizeSurvey(doc.id, doc.data() as Record<string, unknown>);
  }

  static async getPendingSurveyForCustomer(input: {
    organizationId: string;
    crmClienteId: string;
    crmContactoId?: string | null;
    type?: Survey['type'];
  }): Promise<Survey | null> {
    const db = getAdminFirestore();
    const baseQuery = db
      .collection(SURVEYS_COLLECTION)
      .where('organization_id', '==', input.organizationId)
      .where('status', '==', 'active')
      .where('crm_cliente_id', '==', input.crmClienteId)
      .orderBy('createdAt', 'desc')
      .limit(10);

    const snapshot = await baseQuery.get();

    const surveys = snapshot.docs
      .map(doc => normalizeSurvey(doc.id, doc.data() as Record<string, unknown>))
      .filter(
        survey =>
          Boolean(survey.externalToken) &&
          (!input.type || survey.type === input.type) &&
          (!survey.crm_contacto_id ||
            !input.crmContactoId ||
            survey.crm_contacto_id === input.crmContactoId)
      );

    return surveys[0] ?? null;
  }

  static async submitExternalResponse(
    token: string,
    data: SurveyResponseFormData
  ): Promise<{ survey: Survey; responseId: string }> {
    const db = getAdminFirestore();
    const survey = await this.getSurveyByExternalToken(token);

    if (!survey) {
      throw new Error('Encuesta no encontrada');
    }

    if (survey.status !== 'active') {
      throw new Error('La encuesta ya fue respondida o no esta disponible');
    }

    const now = new Date();
    const responseRef = await db.collection(RESPONSES_COLLECTION).add({
      surveyId: survey.id,
      organization_id: survey.organization_id ?? null,
      clientId: data.clientId ?? null,
      clientName: data.clientName,
      clientEmail: data.clientEmail ?? null,
      crm_cliente_id: data.crm_cliente_id ?? survey.crm_cliente_id ?? null,
      crm_contacto_id: data.crm_contacto_id ?? survey.crm_contacto_id ?? null,
      responses: data.responses,
      comments: data.comments ?? null,
      externalToken: token,
      responseChannel:
        survey.channel === 'publico' ? 'public_portal' : 'external_token',
      npsScore:
        requiresNpsScore(survey.type) && typeof data.npsScore === 'number'
          ? data.npsScore
          : null,
      createdAt: now,
    });

    const responses = await db
      .collection(RESPONSES_COLLECTION)
      .where('surveyId', '==', survey.id)
      .get();

    let totalRating = 0;
    let totalQuestions = 0;
    for (const doc of responses.docs) {
      const response = normalizeResponse(doc.id, doc.data() as Record<string, unknown>);
      for (const item of response.responses) {
        if (item.type === 'scale') {
          totalRating += item.value;
          totalQuestions += 1;
        }
      }
    }

    await db.collection(SURVEYS_COLLECTION).doc(survey.id).update({
      status: 'completed',
      responseCount: responses.size,
      averageRating: totalQuestions > 0 ? totalRating / totalQuestions : null,
      respondedAt: now,
      updatedAt: now,
    });

    return {
      survey: {
        ...survey,
        status: 'completed',
        responseCount: responses.size,
        averageRating: totalQuestions > 0 ? totalRating / totalQuestions : undefined,
        respondedAt: now,
        updatedAt: now,
      },
      responseId: responseRef.id,
    };
  }

  static async getNpsDashboard(input: {
    organizationId: string;
    period: 'month' | 'quarter' | 'year';
  }) {
    const db = getAdminFirestore();
    const startDate = new Date();

    if (input.period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (input.period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else {
      startDate.setFullYear(startDate.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const snapshot = await db
      .collection(RESPONSES_COLLECTION)
      .where('organization_id', '==', input.organizationId)
      .where('createdAt', '>=', startDate)
      .orderBy('createdAt', 'desc')
      .get();

    const responses = snapshot.docs
      .map(doc => normalizeResponse(doc.id, doc.data() as Record<string, unknown>))
      .filter(response => typeof response.npsScore === 'number');

    const total = responses.length;
    const promoters = responses.filter(response => (response.npsScore ?? -1) >= 9)
      .length;
    const detractors = responses.filter(response => (response.npsScore ?? 11) <= 6)
      .length;
    const passives = total - promoters - detractors;
    const npsScore =
      total > 0 ? Math.round((promoters / total) * 100 - (detractors / total) * 100) : 0;

    const distribution = Array.from({ length: 11 }, (_, score) => ({
      score,
      count: responses.filter(response => response.npsScore === score).length,
    }));

    const latest = responses.slice(0, 20);

    return {
      period: input.period,
      total,
      npsScore,
      promoters,
      passives,
      detractors,
      distribution,
      recentResponses: latest.map(response => ({
        id: response.id,
        surveyId: response.surveyId,
        clientName: response.clientName,
        clientEmail: response.clientEmail ?? null,
        comments: response.comments ?? null,
        npsScore: response.npsScore ?? null,
        createdAt: response.createdAt.toISOString(),
      })),
    };
  }
}
