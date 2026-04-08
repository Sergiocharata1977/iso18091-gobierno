// Types for organizational structure

export interface OrganizationalStructure {
  id: string;
  departments: Array<{
    id: string;
    name: string;
    description?: string;
    positions: Array<{
      id: string;
      name: string;
      level: 'operativo' | 'tecnico' | 'gerencial';
      personnel_count: number;
    }>;
  }>;
  total_personnel: number;
  total_positions: number;
  total_departments: number;
  created_at: Date;
  updated_at: Date;
}
