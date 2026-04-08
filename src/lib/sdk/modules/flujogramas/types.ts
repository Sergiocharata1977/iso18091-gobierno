import { BaseDocument } from '../../base/types';

export interface Flujograma extends BaseDocument {
  title: string;
  description: string;
  steps: FlujogramaStep[];
  version: number;
}

export interface FlujogramaStep {
  id: string;
  name: string;
  description: string;
  order: number;
  type: 'process' | 'decision' | 'start' | 'end';
  nextStepId?: string;
  alternativeStepId?: string;
}

export interface CreateFlujogramaInput {
  title: string;
  description: string;
  steps: FlujogramaStep[];
}

export interface UpdateFlujogramaInput {
  title?: string;
  description?: string;
  steps?: FlujogramaStep[];
  version?: number;
}
