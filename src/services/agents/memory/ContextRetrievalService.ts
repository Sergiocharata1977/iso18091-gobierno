/**
 * Servicio de Recuperacion de Contexto (RAG)
 *
 * Antes de que un agente ejecute una tarea, este servicio busca informacion relevante:
 * 1. Documentos ISO relacionados.
 * 2. Decisiones pasadas en casos similares (memoria episodica).
 * 3. Preferencias del usuario.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentJob } from '@/types/agents';
import { FirestoreVectorStore } from './FirestoreVectorStore';
import { VectorDocument, VectorStore } from './VectorStore';

// Singleton persistente para memoria compartida entre reinicios.
const globalVectorStore = new FirestoreVectorStore();

export interface RetrievedContextBundle {
  summary: string;
  sources: string[];
  confidence: number;
}

export class ContextRetrievalService {
  private vectorStore: VectorStore;

  constructor(store: VectorStore = globalVectorStore) {
    this.vectorStore = store;
  }

  /**
   * Recupera contexto textual para un intent y payload especificos.
   */
  async retrieveContext(
    intent: string,
    payload: any,
    organizationId: string
  ): Promise<string> {
    const bundle = await this.retrieveContextBundle(
      intent,
      payload,
      organizationId
    );
    return bundle.summary;
  }

  /**
   * Recupera contexto estructurado para uso en respuestas y trazabilidad.
   */
  async retrieveContextBundle(
    intent: string,
    payload: any,
    organizationId: string
  ): Promise<RetrievedContextBundle> {
    const query = this.buildQueryFromPayload(intent, payload);

    console.log(`[ContextRetrieval] Buscando contexto para: "${query}"...`);

    const docs = await this.vectorStore.search(query, 3, { organizationId });
    const domainContext = await this.resolveDomainContext(
      intent,
      payload,
      organizationId
    );

    const vectorContext = docs
      .map(doc => `- [${doc.metadata.type}] ${doc.text} (Score: ${doc.score})`)
      .join('\n');

    const sections: string[] = [];
    const sources: string[] = [];

    if (vectorContext) {
      sections.push(`Memoria previa:\n${vectorContext}`);
      sources.push(
        ...docs.map(
          doc => `memory:${doc.metadata.type || 'unknown'}:${doc.id || 'no-id'}`
        )
      );
    }

    if (domainContext.summary) {
      sections.push(domainContext.summary);
      sources.push(...domainContext.sources);
    }

    if (sections.length === 0) {
      return {
        summary: 'No se encontro contexto previo relevante.',
        sources: [],
        confidence: 0.2,
      };
    }

    return {
      summary: `Informacion relevante encontrada:\n${sections.join('\n\n')}`,
      sources,
      confidence: this.estimateConfidence(
        docs.length,
        domainContext.sources.length
      ),
    };
  }

  /**
   * Guarda el resultado de una ejecucion exitosa en la memoria.
   */
  async memorizaExecution(
    jobId: string,
    intent: string,
    input: any,
    result: any,
    organizationId: string
  ): Promise<void> {
    const textToEmbed = `Action: ${intent}\nInput: ${JSON.stringify(input)}\nResult: ${JSON.stringify(result)}`;

    const doc: VectorDocument = {
      id: jobId,
      text: textToEmbed,
      metadata: {
        type: 'execution_history',
        organizationId,
        intent,
        timestamp: new Date().toISOString(),
      },
    };

    await this.vectorStore.addDocuments([doc]);
    console.log(`[ContextRetrieval] Ejecucion ${jobId} memorizada.`);
  }

  /**
   * Enriquece el payload del job con contexto segun el dominio del intent.
   */
  async enrichPayload(job: AgentJob): Promise<any> {
    const payload = job.payload || {};
    const context = await this.retrieveContextBundle(
      job.intent,
      payload,
      job.organization_id
    );

    return {
      ...payload,
      _rag_context: context.summary,
      _rag_sources: context.sources,
      _rag_confidence: context.confidence,
    };
  }

  /**
   * Decide y recupera contexto de Firestore segun prefijo del intent.
   */
  private async resolveDomainContext(
    intent: string,
    payload: any,
    organizationId: string
  ): Promise<{ summary: string; sources: string[] }> {
    if (intent.startsWith('crm.')) {
      return this.fetchCrmContext(payload, organizationId);
    }

    if (intent.startsWith('iso.')) {
      return this.fetchIsoContext(payload, organizationId);
    }

    return { summary: '', sources: [] };
  }

  /**
   * Recupera contexto CRM desde `crm_organizaciones`.
   */
  private async fetchCrmContext(
    payload: any,
    organizationId: string
  ): Promise<{ summary: string; sources: string[] }> {
    const db = getAdminFirestore();
    const sources: string[] = [];
    const lines: string[] = [];
    const requestedClientId = payload?.cliente_id || payload?.client_id;

    if (typeof requestedClientId === 'string' && requestedClientId.trim()) {
      const doc = await db
        .collection('crm_organizaciones')
        .doc(requestedClientId)
        .get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.organization_id === organizationId) {
          lines.push(
            `Cliente foco: ${data.razon_social || doc.id} | riesgo ${data.categoria_riesgo || 'N/D'} | ultima interaccion ${data.ultima_interaccion || 'N/D'}`
          );
          sources.push(`crm_organizaciones:${doc.id}`);
        }
      }
    }

    const snapshot = await db
      .collection('crm_organizaciones')
      .where('organization_id', '==', organizationId)
      .limit(3)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const row = `${data.razon_social || doc.id} (${data.tipo_cliente || 'tipo N/D'})`;
      lines.push(row);
      sources.push(`crm_organizaciones:${doc.id}`);
    }

    if (lines.length === 0) {
      return {
        summary: 'Contexto CRM: sin clientes relevantes disponibles.',
        sources: [],
      };
    }

    return {
      summary: `Contexto CRM:\n- ${lines.join('\n- ')}`,
      sources: Array.from(new Set(sources)),
    };
  }

  /**
   * Recupera contexto ISO desde procesos y hallazgos.
   */
  private async fetchIsoContext(
    payload: any,
    organizationId: string
  ): Promise<{ summary: string; sources: string[] }> {
    const db = getAdminFirestore();
    const sources: string[] = [];
    const lines: string[] = [];
    const queryText = String(
      payload?.query || payload?.topic || ''
    ).toLowerCase();

    const processSnapshot = await db
      .collection('processDefinitions')
      .where('organization_id', '==', organizationId)
      .where('activo', '==', true)
      .limit(5)
      .get();

    for (const doc of processSnapshot.docs) {
      const data = doc.data();
      const processName = String(data.nombre || '').toLowerCase();
      if (!queryText || processName.includes(queryText)) {
        lines.push(
          `Proceso: ${data.nombre || doc.id} | objetivo: ${data.objetivo || 'N/D'}`
        );
        sources.push(`processDefinitions:${doc.id}`);
      }
    }

    const findingsSnapshot = await db
      .collection('findings')
      .where('organization_id', '==', organizationId)
      .where('isActive', '==', true)
      .limit(5)
      .get();

    for (const doc of findingsSnapshot.docs) {
      const data = doc.data();
      lines.push(
        `Hallazgo: ${data.findingNumber || doc.id} | estado: ${data.status || 'N/D'} | proceso: ${data.registration?.processName || 'N/D'}`
      );
      sources.push(`findings:${doc.id}`);
    }

    if (lines.length === 0) {
      return {
        summary:
          'Contexto ISO: sin procesos/hallazgos relevantes en la organizacion.',
        sources: [],
      };
    }

    return {
      summary: `Contexto ISO:\n- ${lines.join('\n- ')}`,
      sources: Array.from(new Set(sources)),
    };
  }

  /**
   * Estima confianza global en rango 0-1.
   */
  private estimateConfidence(
    vectorMatches: number,
    domainSources: number
  ): number {
    const score = 0.2 + vectorMatches * 0.15 + domainSources * 0.1;
    return Number(Math.min(0.95, score).toFixed(2));
  }

  /**
   * Construye query de busqueda basada en intent y payload.
   */
  private buildQueryFromPayload(intent: string, payload: any): string {
    const keywords = [];
    if (payload.process_name) keywords.push(payload.process_name);
    if (payload.client_name) keywords.push(payload.client_name);
    if (payload.topic) keywords.push(payload.topic);
    if (payload.query) keywords.push(payload.query);

    return `${intent} ${keywords.join(' ')}`;
  }
}
