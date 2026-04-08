import { LucideIcon } from 'lucide-react';

export type ProcessLevel = 1 | 2 | 3 | 4;

export interface ProcessNode {
  id: string;
  title: string;
  level: ProcessLevel;
  iconName?: string; // name of the lucide-react icon
  description?: string;
  parentId?: string; // reference to a parent node, useful for rendering connections
  order?: number; // to sort horizontally
}

export interface ProcessMapData {
  nodes: ProcessNode[];
}
