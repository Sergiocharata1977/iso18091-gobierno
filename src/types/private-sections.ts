import type { Edition } from '@/types/edition';
import type { OrganizationAIPlanOverride } from '@/types/ai-pricing';

// Tipos para secciones privadas por usuario y multi-tenant

export interface Organization {
  id: string;
  name: string;
  edition?: Edition;
  plan: 'free' | 'professional' | 'enterprise';
  ai_plan_id?: string;
  ai_plan_override?: OrganizationAIPlanOverride;
  settings: {
    timezone: string;
    currency: string;
    language: string;
  };
  features: {
    private_sections: boolean;
    ai_assistant: boolean;
    max_users: number;
  };
  created_at: Date;
  updated_at: Date;
}

export interface UserPrivateTask {
  id: string;
  title: string;
  description?: string;
  type: 'task' | 'finding_review' | 'audit_preparation' | 'document_review';
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  related_items?: {
    finding_id?: string;
    audit_id?: string;
    action_id?: string;
    document_id?: string;
  };
  assigned_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPrivateGoal {
  id: string;
  title: string;
  description?: string;
  type:
    | 'quality_improvement'
    | 'personal_development'
    | 'team_goal'
    | 'compliance';
  target_value: number;
  current_value: number;
  unit: string;
  period: string; // e.g., "Q1-2024", "2024"
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  kpis?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UserPrivateReport {
  id: string;
  title: string;
  type: 'monthly_summary' | 'quarterly_review' | 'annual_report' | 'custom';
  period: string;
  content: {
    tasks_completed?: number;
    findings_resolved?: number;
    audits_participated?: number;
    training_hours?: number;
    [key: string]: any;
  };
  generated_by: 'system' | 'user';
  visibility: 'private' | 'shared';
  created_at: Date;
}

export interface UserPrivateDocument {
  id: string;
  title: string;
  type: 'training_certificate' | 'evidence' | 'personal_note' | 'other';
  file_path: string;
  storage_url: string;
  mime_type: string;
  size_bytes: number;
  tags?: string[];
  shared_with?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SharedItem {
  id: string;
  item_type:
    | 'private_task'
    | 'private_document'
    | 'private_goal'
    | 'private_report';
  item_id: string;
  owner_id: string;
  shared_with: {
    users: string[];
    roles: string[];
  };
  permissions: ('read' | 'write' | 'delete')[];
  expires_at?: Date;
  created_at: Date;
}

// Extender tipo User existente
export interface UserWithOrganization {
  id: string;
  clerk_id?: string;
  organization_id: string; // NUEVO
  personnel_id?: string;
  email: string;
  name: string;
  rol: 'admin' | 'gerente' | 'jefe' | 'operario' | 'auditor';
  permissions?: {
    audits: string[];
    findings: string[];
    documents: string[];
    actions: string[];
  };
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

// Tipos para formularios
export interface UserPrivateTaskFormData {
  title: string;
  description?: string;
  type: UserPrivateTask['type'];
  status: UserPrivateTask['status'];
  priority: UserPrivateTask['priority'];
  due_date?: Date;
  related_items?: UserPrivateTask['related_items'];
}

export interface UserPrivateGoalFormData {
  title: string;
  description?: string;
  type: UserPrivateGoal['type'];
  target_value: number;
  unit: string;
  period: string;
  kpis?: string[];
}

export interface SharedItemFormData {
  item_type: SharedItem['item_type'];
  item_id: string;
  shared_with: {
    users: string[];
    roles: string[];
  };
  permissions: SharedItem['permissions'];
  expires_at?: Date;
}

// Tipos para dashboard
export interface UserDashboardSummary {
  pending_tasks: number;
  active_goals: number;
  upcoming_audits: number;
  open_findings: number;
}

export interface UserDashboardData {
  summary: UserDashboardSummary;
  tasks: UserPrivateTask[];
  goals: UserPrivateGoal[];
  recent_activity: {
    type: string;
    title: string;
    date: Date;
  }[];
}
