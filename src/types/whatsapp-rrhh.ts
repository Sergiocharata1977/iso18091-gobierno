export type EmployeeResponseIntent =
  | 'confirm_task'
  | 'reject_task'
  | 'ask_question'
  | 'report_issue'
  | 'request_deadline'
  | 'unknown';

export interface EmployeeResponseContext {
  phone_e164: string;
  organization_id: string;
  message_text: string;
  message_id: string;
  conversation_id: string;
  detected_intent: EmployeeResponseIntent;
  confidence: number;
  related_task_id?: string;
  related_job_id?: string;
}

export interface RhrResponseResult {
  intent: EmployeeResponseIntent;
  action_taken:
    | 'task_confirmed'
    | 'task_rejected'
    | 'question_queued'
    | 'issue_logged'
    | 'reply_sent'
    | 'ignored';
  reply_message?: string;
  task_updated?: boolean;
  error?: string;
}
