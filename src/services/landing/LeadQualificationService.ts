// Servicio de calificación de leads - Categorías Alta/Media/Baja
import type { ChatMessage, LeadQualification } from '@/types/landing-lead';

export class LeadQualificationService {
  /**
   * Analiza el historial de chat y determina la prioridad del lead
   * Categorías: Alta, Media, Baja
   */
  static qualifyLead(chatHistory: ChatMessage[]): LeadQualification {
    const conversationText = chatHistory
      .map(m => m.content.toLowerCase())
      .join(' ');

    let points = 0;
    const qualification: LeadQualification = {
      priority: 'baja',
    };

    // 1. Tamaño de empresa (0-30 pts)
    if (
      conversationText.match(
        /\b(200|500|1000)\s*(empleados|trabajadores|personas)/i
      )
    ) {
      points += 30;
      qualification.companySize = '200+';
    } else if (
      conversationText.match(
        /\b(50|100|150)\s*(empleados|trabajadores|personas)/i
      )
    ) {
      points += 25;
      qualification.companySize = '51-200';
    } else if (
      conversationText.match(
        /\b(10|20|30|40)\s*(empleados|trabajadores|personas)/i
      )
    ) {
      points += 15;
      qualification.companySize = '11-50';
    } else if (
      conversationText.match(
        /\b(1|2|3|4|5|6|7|8|9|10)\s*(empleados|trabajadores|personas)/i
      )
    ) {
      points += 5;
      qualification.companySize = '1-10';
    }

    // 2. Industria relevante (0-25 pts)
    const relevantIndustries = [
      {
        keywords: [
          'alimento',
          'comida',
          'panadería',
          'frigorífico',
          'conserva',
        ],
        name: 'alimentos',
        points: 25,
      },
      {
        keywords: ['manufactura', 'fábrica', 'producción', 'industrial'],
        name: 'manufactura',
        points: 25,
      },
      {
        keywords: ['salud', 'clínica', 'hospital', 'laboratorio', 'farmacia'],
        name: 'salud',
        points: 25,
      },
      {
        keywords: ['construcción', 'obra', 'ingeniería'],
        name: 'construcción',
        points: 20,
      },
      {
        keywords: ['servicio', 'consultoría', 'asesoría'],
        name: 'servicios',
        points: 15,
      },
    ];

    for (const industry of relevantIndustries) {
      if (industry.keywords.some(kw => conversationText.includes(kw))) {
        points += industry.points;
        qualification.industry = industry.name;
        break;
      }
    }

    // 3. Urgencia (0-30 pts)
    if (
      conversationText.match(/(urgente|inmediato|ya|ahora|pronto|este mes)/i)
    ) {
      points += 30;
      qualification.urgency = 'inmediata';
    } else if (
      conversationText.match(/(próximo|siguiente|3 meses|6 meses|este año)/i)
    ) {
      points += 20;
      qualification.urgency = '3-6 meses';
    } else if (
      conversationText.match(/(explorando|investigando|viendo|futuro)/i)
    ) {
      points += 10;
      qualification.urgency = 'explorando';
    }

    // 4. Necesidad de certificación (0-15 pts)
    if (
      conversationText.match(/(certificar|certificación|auditoría|norma|iso)/i)
    ) {
      points += 15;
      qualification.needsCertification = true;
    }

    // 5. Ya tiene ISO (bonus +10 pts si NO tiene, porque es oportunidad)
    if (
      conversationText.match(
        /(no tenemos|no tiene|sin iso|no estamos certificados)/i
      )
    ) {
      points += 10;
      qualification.hasISO = false;
    } else if (
      conversationText.match(/(tenemos iso|certificados|ya tenemos)/i)
    ) {
      qualification.hasISO = true;
    }

    // 6. Menciona presupuesto o inversión (+15 pts)
    if (
      conversationText.match(/(presupuesto|inversión|costo|precio|cotización)/i)
    ) {
      points += 15;
    }

    // 7. Solicita demo o reunión (+20 pts)
    if (
      conversationText.match(
        /(demo|demostración|reunión|agendar|contacto|llamar)/i
      )
    ) {
      points += 20;
    }

    // Determinar prioridad basada en puntos
    if (points >= 60) {
      qualification.priority = 'alta';
    } else if (points >= 30) {
      qualification.priority = 'media';
    } else {
      qualification.priority = 'baja';
    }

    return qualification;
  }

  /**
   * Detecta si el lead ha proporcionado datos de contacto
   */
  static extractContactInfo(chatHistory: ChatMessage[]): {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  } {
    const conversationText = chatHistory.map(m => m.content).join('\n');

    const contactInfo: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    } = {};

    // Email
    const emailMatch = conversationText.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    );
    if (emailMatch) {
      contactInfo.email = emailMatch[0];
    }

    // Teléfono (Argentina)
    const phoneMatch = conversationText.match(
      /\b(\+?54\s?)?(\d{2,4})?\s?\d{6,8}\b/
    );
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0];
    }

    // Empresa (después de "empresa:", "trabajo en", etc.)
    const companyMatch = conversationText.match(
      /(?:empresa|compañía|trabajo en|soy de)\s*:?\s*([A-Za-z0-9\s]+)/i
    );
    if (companyMatch) {
      contactInfo.company = companyMatch[1].trim();
    }

    // Nombre (después de "me llamo", "soy", "mi nombre es")
    const nameMatch = conversationText.match(
      /(?:me llamo|soy|mi nombre es)\s+([A-Za-z\s]+)/i
    );
    if (nameMatch) {
      contactInfo.name = nameMatch[1].trim();
    }

    return contactInfo;
  }

  /**
   * Determina si el lead está listo para ser guardado
   * (tiene suficiente información y prioridad media o alta)
   */
  static shouldSaveLead(
    chatHistory: ChatMessage[],
    qualification: LeadQualification
  ): boolean {
    // Guardar si:
    // 1. Tiene prioridad media o alta
    // 2. O tiene al menos 3 mensajes de conversación
    // 3. O ha proporcionado datos de contacto

    if (
      qualification.priority === 'alta' ||
      qualification.priority === 'media'
    ) {
      return true;
    }

    if (chatHistory.length >= 6) {
      // 3 intercambios (user + assistant)
      return true;
    }

    const contactInfo = this.extractContactInfo(chatHistory);
    if (contactInfo.email || contactInfo.phone) {
      return true;
    }

    return false;
  }
}
