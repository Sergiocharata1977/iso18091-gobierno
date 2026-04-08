import { BaseDocument } from '../../base/types';

export interface AnalisisFODA extends BaseDocument {
  title: string;
  description: string;
  fortalezas: string[];
  oportunidades: string[];
  debilidades: string[];
  amenazas: string[];
}

export interface CreateAnalisisFODAInput {
  title: string;
  description: string;
  fortalezas?: string[];
  oportunidades?: string[];
  debilidades?: string[];
  amenazas?: string[];
}

export interface UpdateAnalisisFODAInput {
  title?: string;
  description?: string;
  fortalezas?: string[];
  oportunidades?: string[];
  debilidades?: string[];
  amenazas?: string[];
}
