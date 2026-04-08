import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import { randomUUID } from 'crypto';
import type {
  QuestionResponse,
  Survey,
  SurveyFormData,
  SurveyResponseData,
  SurveyResponseFormData,
} from '@/types/surveys';
import {
  CITIZEN_PARTICIPATION_QUESTIONS,
  CUSTOMER_SATISFACTION_QUESTIONS,
  getSurveyAudience,
  getSurveyChannel,
} from '@/types/surveys';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'surveys';
const RESPONSES_COLLECTION = 'survey_responses';

export class SurveyService {
  private static normalizeSurvey(
    id: string,
    data: Record<string, unknown>
  ): Survey {
    const type = data.type as Survey['type'];

    return {
      id,
      ...(data as Omit<Survey, 'id'>),
      audience: (data.audience as Survey['audience']) ?? getSurveyAudience(type),
      channel: (data.channel as Survey['channel']) ?? getSurveyChannel(type),
    };
  }

  // ============================================
  // CREATE SURVEY
  // ============================================
  static async create(
    data: SurveyFormData,
    organizationId: string,
    userId: string,
    userName: string
  ): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const surveyNumber = await TraceabilityService.generateNumber(
        'ENC',
        year
      );

      const now = Timestamp.now();
      const audience = data.audience ?? getSurveyAudience(data.type);
      const channel = data.channel ?? getSurveyChannel(data.type);
      const questions =
        audience === 'ciudadania'
          ? CITIZEN_PARTICIPATION_QUESTIONS
          : CUSTOMER_SATISFACTION_QUESTIONS;

      const surveyData: Omit<Survey, 'id'> = {
        organization_id: organizationId,
        surveyNumber,
        title: data.title,
        type: data.type,
        audience,
        channel,
        status: 'active',
        trigger: data.trigger || 'manual',
        questions,
        responseCount: 0,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
        createdBy: userId,
        createdByName: userName,
        externalToken: randomUUID(),
        crm_cliente_id: data.crm_cliente_id ?? null,
        crm_contacto_id: data.crm_contacto_id ?? null,
        targetClientName: data.targetClientName ?? null,
        targetClientEmail: data.targetClientEmail ?? null,
        relatedOrderId: data.relatedOrderId,
        relatedOrderNumber: data.relatedOrderNumber,
        relatedServiceId: data.relatedServiceId,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), surveyData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating survey:', error);
      throw new Error('Error al crear la encuesta');
    }
  }

  // ============================================
  // GET SURVEY BY ID
  // ============================================
  static async getById(id: string): Promise<Survey | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.normalizeSurvey(docSnap.id, docSnap.data() as Record<string, unknown>);
    } catch (error) {
      console.error('Error getting survey:', error);
      throw new Error('Error al obtener la encuesta');
    }
  }

  // ============================================
  // LIST SURVEYS
  // ============================================
  static async list(): Promise<Survey[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc =>
        this.normalizeSurvey(doc.id, doc.data() as Record<string, unknown>)
      );
    } catch (error) {
      console.error('Error listing surveys:', error);
      throw new Error('Error al listar encuestas');
    }
  }

  // ============================================
  // ADD RESPONSE
  // ============================================
  static async addResponse(
    surveyId: string,
    data: SurveyResponseFormData
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const survey = await this.getById(surveyId);

      if (!survey) {
        throw new Error('Encuesta no encontrada');
      }

      const responseData: Omit<SurveyResponseData, 'id'> = {
        surveyId,
        organization_id: survey.organization_id,
        clientId: data.clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        crm_cliente_id: data.crm_cliente_id ?? survey.crm_cliente_id ?? null,
        crm_contacto_id: data.crm_contacto_id ?? survey.crm_contacto_id ?? null,
        responses: data.responses,
        comments: data.comments,
        externalToken: data.externalToken,
        responseChannel: data.externalToken
          ? survey.channel === 'publico'
            ? 'public_portal'
            : 'external_token'
          : 'internal',
        npsScore: survey.audience === 'cliente' ? data.npsScore : undefined,
        createdAt: now.toDate(),
      };

      const docRef = await addDoc(
        collection(db, RESPONSES_COLLECTION),
        responseData
      );

      // Update survey response count and average
      await this.updateSurveyStats(surveyId);

      if (data.externalToken) {
        await updateDoc(doc(db, COLLECTION_NAME, surveyId), {
          status: 'completed',
          respondedAt: now.toDate(),
          updatedAt: now.toDate(),
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding survey response:', error);
      throw new Error('Error al guardar la respuesta');
    }
  }

  // ============================================
  // GET RESPONSES FOR SURVEY
  // ============================================
  static async getResponses(surveyId: string): Promise<SurveyResponseData[]> {
    try {
      const q = query(
        collection(db, RESPONSES_COLLECTION),
        where('surveyId', '==', surveyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as SurveyResponseData
      );
    } catch (error) {
      console.error('Error getting survey responses:', error);
      throw new Error('Error al obtener respuestas');
    }
  }

  // ============================================
  // UPDATE SURVEY STATS
  // ============================================
  private static async updateSurveyStats(surveyId: string): Promise<void> {
    try {
      const responses = await this.getResponses(surveyId);
      const responseCount = responses.length;

      // Calculate average rating across all questions and responses
      let totalRating = 0;
      let totalQuestions = 0;

      responses.forEach(response => {
        response.responses.forEach((qr: QuestionResponse) => {
          // Only count scale responses for average
          if (qr.type === 'scale') {
            totalRating += qr.value;
            totalQuestions++;
          }
        });
      });

      const averageRating =
        totalQuestions > 0 ? totalRating / totalQuestions : undefined;

      const docRef = doc(db, COLLECTION_NAME, surveyId);
      await updateDoc(docRef, {
        responseCount,
        averageRating,
        updatedAt: Timestamp.now().toDate(),
      });
    } catch (error) {
      console.error('Error updating survey stats:', error);
    }
  }

  // ============================================
  // COMPLETE SURVEY
  // ============================================
  static async complete(surveyId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, surveyId);
      await updateDoc(docRef, {
        status: 'completed',
        updatedAt: Timestamp.now().toDate(),
      });
    } catch (error) {
      console.error('Error completing survey:', error);
      throw new Error('Error al completar la encuesta');
    }
  }

  // ============================================
  // DELETE SURVEY
  // ============================================
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw new Error('Error al eliminar la encuesta');
    }
  }
}
