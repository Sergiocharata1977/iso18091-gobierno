/**
 * Abstracción de Base de Datos Vectorial (Memoria de Agentes)
 *
 * Permite almacenar y buscar "embeddings" de texto para dar contexto a los agentes.
 * Implementación base: In-Memory (fallback local).
 * Futuro: Pinecone, ChromaDB, pgvector.
 */

export interface VectorDocument {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding?: number[]; // Vector numérico (opcional en input si se genera dentro)
  score?: number; // Similitud (retornado en búsqueda)
}

export interface VectorStore {
  /**
   * Busca documentos relevantes para una consulta de texto.
   */
  search(
    query: string,
    limit?: number,
    filter?: Record<string, any>
  ): Promise<VectorDocument[]>;

  /**
   * Agrega documentos a la memoria.
   * (Debería generar embeddings automáticamente si usa un provider)
   */
  addDocuments(documents: VectorDocument[]): Promise<void>;

  /**
   * Elimina documentos por ID.
   */
  deleteDocuments(ids: string[]): Promise<void>;
}

/**
 * Implementación Mock (In-Memory) para desarrollo inicial.
 * No persiste entre reinicios del servidor, pero sirve para probar la lógica.
 */
export class InMemoryVectorStore implements VectorStore {
  private documents: VectorDocument[] = [];

  async search(
    query: string,
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorDocument[]> {
    // Búsqueda de texto simple por ahora (includes)
    // En producción esto usaría similitud de coseno con embeddings reales
    const lowerQuery = query.toLowerCase();

    const results = this.documents
      .filter(doc => {
        if (!filter) return true;

        return Object.entries(filter).every(([key, value]) => {
          if (key === 'organizationId') {
            return (
              doc.metadata?.organizationId === value ||
              doc.metadata?.organization_id === value
            );
          }

          return doc.metadata?.[key] === value;
        });
      })
      .map(doc => ({
        ...doc,
        // Score ficticio: 1 si contiene el texto exacto, 0.5 si contiene palabras clave...
        score: doc.text.toLowerCase().includes(lowerQuery) ? 0.9 : 0.0,
      }))
      .filter(doc => doc.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);

    return results;
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    this.documents.push(...documents);
    console.log(
      `[VectorStore] Added ${documents.length} docs. Total: ${this.documents.length}`
    );
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    this.documents = this.documents.filter(doc => !ids.includes(doc.id));
  }
}
