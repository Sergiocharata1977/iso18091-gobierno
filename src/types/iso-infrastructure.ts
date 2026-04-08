export interface MaintenanceRecord {
  date: string;
  type: 'preventive' | 'corrective';
  description: string;
  performedBy: string;
  cost?: number;
}

export interface InfraAsset {
  id: string;
  organizationId: string;
  name: string;
  type: 'building' | 'equipment' | 'software' | 'transport' | 'other';
  location: string;
  responsibleId: string;
  status: 'active' | 'maintenance' | 'inactive' | 'disposed';
  acquisitionDate: string;
  nextMaintenanceDate?: string;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
