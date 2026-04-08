import { Timestamp } from 'firebase-admin/firestore';

export interface ExecutiveAlert {
  id: string;
  severity: 'critica' | 'alta' | 'media';
  source: 'strategic_analysis' | 'agentic_center' | 'aging' | 'confidence';
  source_ref_id?: string;
  title: string;
  description: string;
  affected_entity?: string;
  requires_human_decision: boolean;
  recommended_action?: string;
  expires_at?: Timestamp;
  created_at: Timestamp;
  org_id: string;
}
