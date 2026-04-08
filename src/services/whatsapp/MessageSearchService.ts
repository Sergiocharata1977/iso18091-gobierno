import { FieldValue } from 'firebase-admin/firestore';

export class MessageSearchService {
  constructor(private db: FirebaseFirestore.Firestore) {}

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    if (!normalized) {
      return [];
    }

    const words = normalized.split(' ').filter(w => w.length > 2);
    const unigrams = words;
    const bigrams = words
      .slice(0, -1)
      .map((w, i) => `${w}_${words[i + 1]}`);

    return [...new Set([...unigrams, ...bigrams])];
  }

  async indexMessage(
    orgId: string,
    conversationId: string,
    messageId: string,
    text: string
  ): Promise<void> {
    const tokens = this.tokenize(text);
    if (!tokens.length) {
      return;
    }

    const messageRef = this.db
      .collection('organizations')
      .doc(orgId)
      .collection('whatsapp_conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId);

    await messageRef.set(
      {
        search_tokens: FieldValue.arrayUnion(...tokens),
      },
      { merge: true }
    );
  }

  async searchInConversation(
    orgId: string,
    conversationId: string,
    query: string,
    limit?: number
  ): Promise<string[]> {
    const tokens = this.tokenize(query);
    const firstToken = tokens[0];
    if (!firstToken) {
      return [];
    }

    const max = Math.min(Math.max(limit ?? 20, 1), 200);

    const snapshot = await this.db
      .collection('organizations')
      .doc(orgId)
      .collection('whatsapp_conversations')
      .doc(conversationId)
      .collection('messages')
      .where('search_tokens', 'array-contains', firstToken)
      .orderBy('created_at', 'desc')
      .limit(max)
      .get();

    const required = new Set(tokens);
    return snapshot.docs
      .filter(doc => {
        const data = doc.data() as { search_tokens?: unknown };
        const currentTokens = Array.isArray(data.search_tokens)
          ? new Set(data.search_tokens.filter(token => typeof token === 'string'))
          : new Set<string>();
        for (const token of required) {
          if (!currentTokens.has(token)) {
            return false;
          }
        }
        return true;
      })
      .map(doc => doc.id);
  }

  async searchAcrossOrg(
    orgId: string,
    query: string,
    limit?: number
  ): Promise<Array<{ conversationId: string; messageId: string }>> {
    const tokens = this.tokenize(query);
    const firstToken = tokens[0];
    if (!firstToken) {
      return [];
    }

    const max = Math.min(Math.max(limit ?? 20, 1), 200);

    const snapshot = await this.db
      .collectionGroup('messages')
      .where('organization_id', '==', orgId)
      .where('search_tokens', 'array-contains', firstToken)
      .orderBy('created_at', 'desc')
      .limit(max)
      .get();

    const required = new Set(tokens);
    return snapshot.docs
      .filter(doc => {
        const data = doc.data() as { search_tokens?: unknown };
        const currentTokens = Array.isArray(data.search_tokens)
          ? new Set(data.search_tokens.filter(token => typeof token === 'string'))
          : new Set<string>();
        for (const token of required) {
          if (!currentTokens.has(token)) {
            return false;
          }
        }
        return true;
      })
      .map(doc => ({
        conversationId: doc.ref.parent.parent?.id || '',
        messageId: doc.id,
      }))
      .filter(row => row.conversationId.length > 0);
  }
}
