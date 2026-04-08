/**
 * Types for Employee Declarations Module
 * Simple form for employees to report issues/improvements by process
 */

export type DeclarationCategory =
  | 'produccion'
  | 'calidad'
  | 'logistica'
  | 'ventas'
  | 'administracion'
  | 'rrhh'
  | 'mantenimiento'
  | 'otro';

export type DeclarationStatus = 'pending' | 'reviewed' | 'closed';

export interface Declaration {
  id: string;
  declarationNumber: string;

  // Employee info
  employeeName: string;
  employeeId?: string;
  employeeEmail?: string;

  // Declaration details
  category: DeclarationCategory;
  title: string;
  description: string;

  // Status and review
  status: DeclarationStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Finding generated from this declaration
  findingId?: string;
}

export interface DeclarationFormData {
  employeeName: string;
  employeeEmail?: string;
  category: DeclarationCategory;
  title: string;
  description: string;
}

export interface DeclarationReviewData {
  reviewNotes: string;
  createFinding: boolean;
}

// Labels and configurations
export const DECLARATION_CATEGORY_LABELS: Record<DeclarationCategory, string> =
  {
    produccion: 'Producción',
    calidad: 'Calidad',
    logistica: 'Logística',
    ventas: 'Ventas',
    administracion: 'Administración',
    rrhh: 'Recursos Humanos',
    mantenimiento: 'Mantenimiento',
    otro: 'Otro',
  };

export const DECLARATION_STATUS_LABELS: Record<DeclarationStatus, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisada',
  closed: 'Cerrada',
};

export const DECLARATION_STATUS_COLORS: Record<DeclarationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-800',
};
