import { Timestamp } from 'firebase-admin/firestore';

const RATE_LIMITS_COLLECTION = 'system_rate_limits';
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface RateLimitConfig {
  max_per_hour: number;
  max_per_minute: number;
}

interface RateLimitDoc {
  count_hour: number;
  count_minute: number;
  window_hour_start: FirebaseFirestore.Timestamp;
  window_minute_start: FirebaseFirestore.Timestamp;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  max_per_hour: 100,
  max_per_minute: 10,
};

export class RateLimitError extends Error {
  public readonly retry_after: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retry_after = retryAfterSeconds;
  }
}

function asMillis(value: unknown, fallback: number): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export class WhatsAppRateLimiter {
  private readonly mergedConfig: RateLimitConfig;

  constructor(
    private readonly db: FirebaseFirestore.Firestore,
    config: RateLimitConfig
  ) {
    this.mergedConfig = { ...DEFAULT_CONFIG, ...config };
  }

  async checkAndIncrement(orgId: string): Promise<void> {
    const docRef = this.db
      .collection(RATE_LIMITS_COLLECTION)
      .doc(`${orgId}_whatsapp`);

    await this.db.runTransaction(async tx => {
      const nowMs = Date.now();
      const snapshot = await tx.get(docRef);
      const data = snapshot.data();

      let countHour = asCount(data?.count_hour);
      let countMinute = asCount(data?.count_minute);
      let hourWindowStartMs = asMillis(data?.window_hour_start, nowMs);
      let minuteWindowStartMs = asMillis(data?.window_minute_start, nowMs);

      if (nowMs - hourWindowStartMs >= HOUR_MS) {
        countHour = 0;
        hourWindowStartMs = nowMs;
      }

      if (nowMs - minuteWindowStartMs >= MINUTE_MS) {
        countMinute = 0;
        minuteWindowStartMs = nowMs;
      }

      if (countHour >= this.mergedConfig.max_per_hour) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((hourWindowStartMs + HOUR_MS - nowMs) / 1000)
        );
        throw new RateLimitError(
          'Límite de mensajes por hora excedido',
          retryAfterSeconds
        );
      }

      if (countMinute >= this.mergedConfig.max_per_minute) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((minuteWindowStartMs + MINUTE_MS - nowMs) / 1000)
        );
        throw new RateLimitError(
          'Límite de mensajes por minuto excedido',
          retryAfterSeconds
        );
      }

      const nextData: RateLimitDoc = {
        count_hour: countHour + 1,
        count_minute: countMinute + 1,
        window_hour_start: Timestamp.fromMillis(hourWindowStartMs),
        window_minute_start: Timestamp.fromMillis(minuteWindowStartMs),
      };

      tx.set(docRef, nextData, { merge: true });
    });
  }

  async getRemainingQuota(
    orgId: string
  ): Promise<{ per_hour: number; per_minute: number }> {
    const docRef = this.db
      .collection(RATE_LIMITS_COLLECTION)
      .doc(`${orgId}_whatsapp`);

    const snapshot = await docRef.get();
    const nowMs = Date.now();
    const data = snapshot.data();

    const hourWindowStartMs = asMillis(data?.window_hour_start, nowMs);
    const minuteWindowStartMs = asMillis(data?.window_minute_start, nowMs);

    const effectiveHourCount =
      nowMs - hourWindowStartMs >= HOUR_MS ? 0 : asCount(data?.count_hour);
    const effectiveMinuteCount =
      nowMs - minuteWindowStartMs >= MINUTE_MS ? 0 : asCount(data?.count_minute);

    return {
      per_hour: Math.max(0, this.mergedConfig.max_per_hour - effectiveHourCount),
      per_minute: Math.max(
        0,
        this.mergedConfig.max_per_minute - effectiveMinuteCount
      ),
    };
  }
}
