import type { AIMaturityBand, AIContractId } from '@/ai/types';

export interface AIContractFieldDoc {
  path: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AIContractDocumentation {
  id: AIContractId;
  version: 'v1';
  title: string;
  objective: string;
  responseMode: 'json' | 'text';
  fields: AIContractFieldDoc[];
  examplesByMaturity: Record<AIMaturityBand, unknown>;
}
