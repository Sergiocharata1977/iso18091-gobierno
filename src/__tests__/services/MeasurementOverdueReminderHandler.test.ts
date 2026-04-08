jest.mock('@/services/whatsapp/WhatsAppService', () => ({
  sendMessage: jest.fn(),
}));

import { TaskReminderHandler } from '@/services/agents/handlers/TaskReminderHandler';
import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import type { AgentJob } from '@/types/agents';

describe('QA mediciones vencidas - TaskReminderHandler', () => {
  const mockSendMessage = sendMessage as jest.MockedFunction<
    typeof sendMessage
  >;
  const handler = new TaskReminderHandler();

  const baseJob: AgentJob = {
    id: 'job-measurement-overdue-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    agent_instance_id: 'agent-1',
    intent: 'task.reminder',
    payload: {
      responsable_phone: '+5215512345678',
      task_id: 'measurement-overdue:m-001',
      task_titulo: 'Registrar medicion vencida del indicador Entregas a tiempo',
      fecha_programada: '2026-02-20',
    },
    status: 'queued',
    priority: 'high',
    created_at: new Date('2026-02-23T10:00:00Z'),
    updated_at: new Date('2026-02-23T10:00:00Z'),
    attempts: 0,
    max_attempts: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('happy path: envia recordatorio por WhatsApp para medicion vencida', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      twilio_sid: 'SM123',
      conversation_id: 'conv-1',
      message_id: 'msg-1',
    } as any);

    const result = await handler.handle(baseJob);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        to: '+5215512345678',
        template_name: 'task.reminder',
      })
    );
    expect((result as any).action).toBe('reminder_sent');
    expect((result as any).task_id).toBe('measurement-overdue:m-001');
    expect((result as any).twilio_sid).toBe('SM123');
  });

  it('error WhatsApp: propaga fallo de envio de recordatorio', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: false,
      error: 'Twilio timeout',
    } as any);

    await expect(handler.handle(baseJob)).rejects.toThrow('Twilio timeout');

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
