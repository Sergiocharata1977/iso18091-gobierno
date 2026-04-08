import type { AgentIntent, AgentJob } from '@/types/agents';

describe('Agent intents and job typing', () => {
  it('supports operational intents task.assign and task.reminder', () => {
    const assignIntent: AgentIntent = 'task.assign';
    const reminderIntent: AgentIntent = 'task.reminder';

    expect(assignIntent).toBe('task.assign');
    expect(reminderIntent).toBe('task.reminder');
  });

  it('allows custom string intents for extension', () => {
    const customIntent: AgentIntent = 'sales.opportunity.notify';
    expect(customIntent).toBe('sales.opportunity.notify');
  });

  it('builds a minimal AgentJob shape with required fields', () => {
    const now = new Date();
    const job: AgentJob = {
      id: 'job-1',
      organization_id: 'org-1',
      user_id: 'user-1',
      agent_instance_id: 'agent-1',
      intent: 'task.assign',
      payload: { task_id: 'task-1' },
      status: 'queued',
      priority: 'high',
      created_at: now,
      updated_at: now,
      attempts: 0,
      max_attempts: 3,
    };

    expect(job.status).toBe('queued');
    expect(job.intent).toBe('task.assign');
  });
});
