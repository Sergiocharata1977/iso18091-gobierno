import { getAdminFirestore } from '@/lib/firebase/admin';
import { WhatsAppCircuitBreaker } from './CircuitBreaker';

export class WhatsAppClient {
  private static readonly apiVersion = 'v19.0';
  private static circuitBreaker: WhatsAppCircuitBreaker | null = null;

  private static getCircuitBreaker(): WhatsAppCircuitBreaker {
    if (!this.circuitBreaker) {
      this.circuitBreaker = new WhatsAppCircuitBreaker(getAdminFirestore(), {
        failure_threshold: 5,
        success_threshold: 2,
        timeout_ms: 60_000,
      });
    }

    return this.circuitBreaker;
  }

  static async sendTextMessage(
    to: string,
    text: string,
    phoneNumberId: string,
    accessToken?: string
  ): Promise<void> {
    const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;

    if (!token) {
      throw new Error(
        '[WhatsAppClient] No hay access token disponible. Configurá WHATSAPP_ACCESS_TOKEN o conectá la cuenta.'
      );
    }

    await this.getCircuitBreaker().execute(async () => {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
              body: text,
              preview_url: false,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `WhatsApp Graph API error ${response.status}: ${errorBody || 'unknown_error'}`
        );
      }
    });
  }
}
