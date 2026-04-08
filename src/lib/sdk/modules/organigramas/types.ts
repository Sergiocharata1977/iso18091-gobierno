import { BaseDocument } from '../../base/types';

export interface Organigrama extends BaseDocument {
  title: string;
  description: string;
  structure: OrganigramaNode[];
  version: number;
}

export interface OrganigramaNode {
  id: string;
  name: string;
  position: string;
  parentId?: string;
  level: number;
  department?: string;
}

export interface CreateOrganigramaInput {
  title: string;
  description: string;
  structure: OrganigramaNode[];
}

export interface UpdateOrganigramaInput {
  title?: string;
  description?: string;
  structure?: OrganigramaNode[];
  version?: number;
}
