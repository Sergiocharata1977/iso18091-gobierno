import { QualityMeasurementOverdueReminderHandler } from '@/services/agents/handlers/QualityMeasurementOverdueReminderHandler';
import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import { AgentJob } from '@/types/agents';

jest.mock('@/services/whatsapp/WhatsAppService', () => ({
  sendMessage: jest.fn(),
}));

describe('QualityMeasurementOverdueReminderHandler', () => {
  const mockSendMessage = sendMessage as jest.MockedFunction<
    typeof sendMessage
  >;
  const handler = new QualityMeasurementOverdueReminderHandler();

  const buildJob = (payload: Record<string, any>): AgentJob => ({
    id: 'job-measurement-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    agent_instance_id: 'agent-1',
    intent: 'quality.measurement.overdue.reminder',
    payload,
    status: 'queued',
    priority: 'high',
    attempts: 0,
    max_attempts: 3,
    created_at: new Date('2026-02-23T10:00:00Z'),
    updated_at: new Date('2026-02-23T10:00:00Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unit', () => {
    it('throws when phone is missing', async () => {
      await expect(
        handler.handle(
          buildJob({
            indicator_id: 'ind-1',
            indicator_name: 'Tiempo de entrega',
          })
        )
      ).rejects.toThrow(
        'quality.measurement.overdue.reminder requiere responsible_phone/responsable_phone/phone'
      );

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('skips sending when cooldown is active to avoid repeated spam', async () => {
      const lastSent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = await handler.handle(
        buildJob({
          responsible_phone: '+5491112345678',
          indicator_id: 'ind-1',
          measurement_id: 'm-1',
          last_reminder_sent_at: lastSent,
          reminder_cooldown_hours: 24,
        })
      );

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          action: 'measurement_overdue_reminder',
          status: 'skipped',
          reason: 'cooldown_active',
          evidence_refs: expect.arrayContaining([
            expect.objectContaining({
              type: 'agent_job',
              id: 'job-measurement-1',
            }),
            expect.objectContaining({ type: 'quality_measurement', id: 'm-1' }),
          ]),
        })
      );
    });
  });

  describe('integration (WhatsAppService mocked)', () => {
    it('sends reminder and returns structured traceable output', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        message_id: 'wa-msg-1',
        twilio_sid: 'SM123',
        conversation_id: 'conv-1',
      });

      const result = await handler.handle(
        buildJob({
          responsible_phone: '+5491112345678',
          responsible_name: 'Ana',
          responsible_user_id: 'user-resp-1',
          indicator_id: 'ind-1',
          indicator_name: 'Cumplimiento de calibracion',
          indicator_code: 'IND-CAL-01',
          measurement_id: 'med-1',
          measurement_due_date: '2026-02-20',
          days_overdue: 2,
          measurement_frequency: 'mensual',
          process_name: 'Metrologia',
          deep_link: '/quality/indicators/ind-1',
        })
      );

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          to: '+5491112345678',
          template_name: 'quality.measurement.overdue.reminder',
          sender_name: 'Sistema Calidad',
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          action: 'measurement_overdue_reminder',
          status: 'completed',
          target: expect.objectContaining({
            channel: 'whatsapp',
            phone: '+5491112345678',
            indicator_id: 'ind-1',
            measurement_id: 'med-1',
          }),
          delivery: expect.objectContaining({
            status: 'sent',
            twilio_sid: 'SM123',
            conversation_id: 'conv-1',
          }),
          escalation: expect.objectContaining({
            status: 'not_required',
          }),
          evidence_refs: expect.arrayContaining([
            expect.objectContaining({
              type: 'agent_job',
              id: 'job-measurement-1',
            }),
            expect.objectContaining({
              type: 'quality_measurement',
              id: 'med-1',
            }),
            expect.objectContaining({ type: 'quality_indicator', id: 'ind-1' }),
            expect.objectContaining({
              type: 'whatsapp_message',
              id: 'wa-msg-1',
            }),
            expect.objectContaining({
              type: 'whatsapp_conversation',
              id: 'conv-1',
            }),
          ]),
          trace: expect.objectContaining({
            org_id: 'org-1',
            job_id: 'job-measurement-1',
            intent: 'quality.measurement.overdue.reminder',
          }),
        })
      );
    });

    it('returns pending_approval strategy when escalation is sensitive', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        message_id: 'wa-msg-2',
        twilio_sid: 'SM999',
        conversation_id: 'conv-9',
      });

      const result = await handler.handle(
        buildJob({
          responsable_phone: '+5491199999999',
          responsable_nombre: 'Carlos',
          indicator_id: 'ind-77',
          indicator_name: 'Entregas a tiempo',
          measurement_id: 'med-77',
          days_overdue: 8,
          reminder_count: 3,
          escalation: {
            enabled: true,
            threshold_days: 5,
            threshold_reminders: 2,
            impact: 'high',
            approver_role: 'quality_manager',
            proposed_action: 'Crear accion correctiva y notificar supervisor',
            auto_create_action: true,
          },
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          action: 'measurement_overdue_reminder',
          status: 'pending_approval',
          escalation: expect.objectContaining({
            status: 'pending_approval',
            reason: 'sensitive_escalation_requires_gate',
            approval_gate: expect.objectContaining({
              required_role: 'quality_manager',
              impact: 'high',
            }),
          }),
        })
      );
    });

    it('throws when WhatsAppService fails to send', async () => {
      mockSendMessage.mockResolvedValue({
        success: false,
        error: 'twilio timeout',
      });

      await expect(
        handler.handle(
          buildJob({
            responsible_phone: '+5491112345678',
            indicator_id: 'ind-2',
          })
        )
      ).rejects.toThrow('twilio timeout');
    });
  });
});
