import { OutboxService } from '@/lib/accounting/outbox/OutboxService';
import type { AccountingEvent } from '@/types/accounting';

export async function emitAccountingEvent(event: AccountingEvent) {
  return OutboxService.processEvent(event);
}
