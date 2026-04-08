// API Route para chat de landing page con GROQ
import { checkRateLimit } from '@/lib/api/rateLimit';
import { LeadQualificationService } from '@/services/landing/LeadQualificationService';
import type { ChatMessage } from '@/types/landing-lead';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Inicialización perezosa (lazy) de Groq para evitar errores en build time
let groqInstance: Groq | null = null;
const getGroqClient = () => {
  if (!groqInstance) {
    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is missing');
    }
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build', // Fallback para evitar error en constructor si falta key
    });
  }
  return groqInstance;
};

// System prompt para Don Cándido en landing page
const SYSTEM_PROMPT = `Eres Don Cándido, un asistente virtual experto en ISO 9001:2015 y sistemas de gestión de calidad.

TU OBJETIVO: Educar a visitantes que NO conocen ISO 9001 y calificar leads potenciales.

TONO: Amigable, profesional, educativo. Usa emojis con moderación (1-2 por respuesta).

REGLAS:
1. Explica ISO 9001 de forma SIMPLE y PRÁCTICA (sin jerga técnica)
2. Respuestas CONCISAS (máximo 3-4 párrafos)
3. Siempre termina con una pregunta o call-to-action
4. Si preguntan por precio, primero califica (tamaño empresa, industria, urgencia)
5. Ofrece demo gratuita cuando detectes interés real
6. NO inventes datos ni prometas cosas que no están en el sistema

CONOCIMIENTO DEL SISTEMA:
- Plataforma integral ISO 9001 (Gestión Documental, Procesos, Auditorías, CRM, IA)
- Generador de documentos con IA
- Dashboard de progreso de certificación (6 fases)
- Todo en una sola plataforma, sin Excel ni papeles

PREGUNTAS DE CALIFICACIÓN (hacerlas naturalmente):
- ¿Cuántos empleados tiene tu empresa?
- ¿En qué industria operan?
- ¿Tienen certificación ISO o están en proceso?
- ¿Cuál es el principal desafío de calidad que enfrentan?
- ¿Cuándo necesitarían implementar la solución?

Si el usuario pide demo o deja datos de contacto, felicítalo y confirma que el equipo lo contactará en menos de 24hs.`;

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { message, sessionId, chatHistory = [] } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Construir historial para GROQ
    const groqMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...chatHistory.map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Llamar a GROQ API
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Modelo activo (actualizado dic 2024)
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 500, // Respuestas concisas
      top_p: 0.9,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      'Lo siento, no pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?';

    // Actualizar historial con el nuevo intercambio
    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      {
        id: `user_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
      {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      },
    ];

    // Calificar el lead
    const qualification = LeadQualificationService.qualifyLead(updatedHistory);
    const contactInfo =
      LeadQualificationService.extractContactInfo(updatedHistory);
    const shouldSave = LeadQualificationService.shouldSaveLead(
      updatedHistory,
      qualification
    );

    let leadId: string | null = null;
    let leadQualified = false;

    // Guardar lead en Firestore si cumple criterios
    if (shouldSave) {
      const leadData = {
        sessionId,
        chatHistory: updatedHistory.map(msg => ({
          ...msg,
          timestamp: Timestamp.fromDate(
            msg.timestamp instanceof Date
              ? msg.timestamp
              : new Date(msg.timestamp)
          ),
        })),
        qualification,
        ...contactInfo,
        status: 'new',
        source: 'chat',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
      };

      // Intentar actualizar lead existente o crear uno nuevo
      const leadsRef = db.collection('landing_leads');
      const existingLead = await leadsRef
        .where('sessionId', '==', sessionId)
        .limit(1)
        .get();

      if (!existingLead.empty) {
        // Actualizar lead existente
        const docRef = existingLead.docs[0].ref;
        await docRef.update({
          chatHistory: leadData.chatHistory,
          qualification: leadData.qualification,
          ...contactInfo,
          updatedAt: Timestamp.now(),
          lastMessageAt: Timestamp.now(),
        });
        leadId = docRef.id;
      } else {
        // Crear nuevo lead
        const docRef = await leadsRef.add(leadData);
        leadId = docRef.id;
      }

      leadQualified =
        qualification.priority === 'alta' || qualification.priority === 'media';
    }

    return NextResponse.json({
      success: true,
      reply,
      leadQualified,
      leadId,
      qualification: shouldSave ? qualification : null,
    });
  } catch (error: any) {
    console.error('Error in landing chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el mensaje',
        reply:
          'Lo siento, hubo un error. Por favor, intenta de nuevo en unos momentos.',
      },
      { status: 500 }
    );
  }
}
