import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const CIRCUIT_BREAKERS_COLLECTION = 'system_circuit_breakers';
const CIRCUIT_BREAKER_DOC_ID = 'whatsapp';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failure_threshold: number;
  success_threshold: number;
  timeout_ms: number;
}

interface StoredCircuitBreakerData {
  state: CircuitState;
  failure_count: number;
  success_count: number;
  last_failure_at?: FirebaseFirestore.Timestamp;
  opened_at?: FirebaseFirestore.Timestamp;
}

interface NormalizedCircuitBreakerData {
  state: CircuitState;
  failure_count: number;
  success_count: number;
  last_failure_at: Timestamp | null;
  opened_at: Timestamp | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failure_threshold: 5,
  success_threshold: 2,
  timeout_ms: 60_000,
};

export class CircuitOpenError extends Error {
  public readonly retry_after: number;

  constructor(retryAfterSeconds: number) {
    super('Circuit breaker abierto para WhatsApp');
    this.name = 'CircuitOpenError';
    this.retry_after = retryAfterSeconds;
  }
}

function asTimestamp(value: unknown): Timestamp | null {
  if (value instanceof Timestamp) {
    return value;
  }

  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }

  return null;
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function asState(value: unknown): CircuitState {
  if (value === 'open' || value === 'half-open' || value === 'closed') {
    return value;
  }

  return 'closed';
}

export class WhatsAppCircuitBreaker {
  private readonly mergedConfig: CircuitBreakerConfig;
  private readonly docRef: FirebaseFirestore.DocumentReference;

  constructor(
    private readonly db: FirebaseFirestore.Firestore,
    config: CircuitBreakerConfig
  ) {
    this.mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.docRef = this.db
      .collection(CIRCUIT_BREAKERS_COLLECTION)
      .doc(CIRCUIT_BREAKER_DOC_ID);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureCircuitAllowsExecution();

    try {
      const result = await fn();
      await this.registerSuccess();
      return result;
    } catch (error) {
      await this.registerFailure();
      throw error;
    }
  }

  async getState(): Promise<CircuitState> {
    const snapshot = await this.docRef.get();
    const nowMs = Date.now();
    const data = this.normalizeData(snapshot.data());

    if (data.state !== 'open') {
      return data.state;
    }

    const openedAtMs = data.opened_at?.toMillis() ?? nowMs;
    if (nowMs - openedAtMs >= this.mergedConfig.timeout_ms) {
      return 'half-open';
    }

    return 'open';
  }

  private normalizeData(
    rawData: FirebaseFirestore.DocumentData | undefined
  ): NormalizedCircuitBreakerData {
    return {
      state: asState(rawData?.state),
      failure_count: asCount(rawData?.failure_count),
      success_count: asCount(rawData?.success_count),
      last_failure_at: asTimestamp(rawData?.last_failure_at),
      opened_at: asTimestamp(rawData?.opened_at),
    };
  }

  private async ensureCircuitAllowsExecution(): Promise<void> {
    await this.db.runTransaction(async tx => {
      const snapshot = await tx.get(this.docRef);
      const now = Timestamp.now();
      const nowMs = now.toMillis();
      const current = this.normalizeData(snapshot.data());

      if (current.state === 'open') {
        const openedAtMs = current.opened_at?.toMillis() ?? nowMs;
        const elapsedMs = nowMs - openedAtMs;

        if (elapsedMs < this.mergedConfig.timeout_ms) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil((this.mergedConfig.timeout_ms - elapsedMs) / 1000)
          );
          throw new CircuitOpenError(retryAfterSeconds);
        }

        tx.set(
          this.docRef,
          {
            state: 'half-open' as CircuitState,
            success_count: 0,
          } satisfies Partial<StoredCircuitBreakerData>,
          { merge: true }
        );
        return;
      }

      if (!snapshot.exists) {
        tx.set(
          this.docRef,
          {
            state: 'closed' as CircuitState,
            failure_count: 0,
            success_count: 0,
          } satisfies Partial<StoredCircuitBreakerData>,
          { merge: true }
        );
      }
    });
  }

  private async registerSuccess(): Promise<void> {
    await this.db.runTransaction(async tx => {
      const snapshot = await tx.get(this.docRef);
      const current = this.normalizeData(snapshot.data());

      if (current.state === 'half-open') {
        const nextSuccessCount = current.success_count + 1;

        if (nextSuccessCount >= this.mergedConfig.success_threshold) {
          tx.set(
            this.docRef,
            {
              state: 'closed' as CircuitState,
              failure_count: 0,
              success_count: 0,
              opened_at: FieldValue.delete(),
            } satisfies Omit<Partial<StoredCircuitBreakerData>, 'opened_at'> & {
              opened_at: FirebaseFirestore.FieldValue;
            },
            { merge: true }
          );
          return;
        }

        tx.set(
          this.docRef,
          {
            success_count: nextSuccessCount,
          } satisfies Partial<StoredCircuitBreakerData>,
          { merge: true }
        );
        return;
      }

      if (current.failure_count > 0) {
        tx.set(
          this.docRef,
          {
            failure_count: 0,
          } satisfies Partial<StoredCircuitBreakerData>,
          { merge: true }
        );
      }
    });
  }

  private async registerFailure(): Promise<void> {
    await this.db.runTransaction(async tx => {
      const snapshot = await tx.get(this.docRef);
      const now = Timestamp.now();
      const current = this.normalizeData(snapshot.data());

      if (current.state === 'half-open') {
        tx.set(
          this.docRef,
          {
            state: 'open' as CircuitState,
            failure_count: 1,
            success_count: 0,
            last_failure_at: now,
            opened_at: now,
          } satisfies Partial<StoredCircuitBreakerData>,
          { merge: true }
        );
        return;
      }

      const nextFailureCount = current.failure_count + 1;
      const shouldOpen = nextFailureCount >= this.mergedConfig.failure_threshold;

      tx.set(
        this.docRef,
        {
          state: shouldOpen ? ('open' as CircuitState) : ('closed' as CircuitState),
          failure_count: nextFailureCount,
          success_count: 0,
          last_failure_at: now,
          opened_at: shouldOpen ? now : FieldValue.delete(),
        } satisfies Omit<Partial<StoredCircuitBreakerData>, 'opened_at'> & {
          opened_at: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
        },
        { merge: true }
      );
    });
  }
}
