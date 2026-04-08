export type DesignProductType = 'product' | 'service';

export type DesignProjectStatus =
  | 'planning'
  | 'design'
  | 'verification'
  | 'validation'
  | 'completed';

export interface DesignProject {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  productType: DesignProductType;
  status: DesignProjectStatus;
  designInputs: string[];
  designOutputs: string[];
  reviewDates: string[];
  verificationDate?: string;
  validationDate?: string;
  responsibleId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DesignProjectInput {
  name: string;
  description: string;
  productType: DesignProductType;
  status?: DesignProjectStatus;
  designInputs?: string[];
  designOutputs?: string[];
  reviewDates?: string[];
  verificationDate?: string;
  validationDate?: string;
  responsibleId: string;
}

export const DESIGN_PROJECT_STATUS_LABELS: Record<DesignProjectStatus, string> =
  {
    planning: 'Planificacion',
    design: 'Diseno',
    verification: 'Verificacion',
    validation: 'Validacion',
    completed: 'Completado',
  };

export const DESIGN_PRODUCT_TYPE_LABELS: Record<DesignProductType, string> = {
  product: 'Producto',
  service: 'Servicio',
};
