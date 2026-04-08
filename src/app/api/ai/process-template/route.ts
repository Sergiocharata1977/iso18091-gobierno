/**
 * API Endpoint: POST /api/ai/process-template
 * Genera plantilla completa para procesos clásicos ISO 9001
 *
 * Features:
 * - Detecta procesos clásicos ISO 9001 por nombre
 * - Usa plantillas base y las personaliza con datos de la organización
 * - Sugiere responsables basándose en roles existentes
 * - Evita duplicar procesos ya creados
 */

import {
  detectClassicProcess,
  getClassicProcessByKey,
  ISOClassicProcess,
} from '@/types/isoClassicProcesses';
import { PROCESS_CATEGORIES } from '@/types/processRecords';
import { withAuth } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';

interface OrganizationProfile {
  companyName?: string;
  scope?: string;
  industry?: string;
}

interface RoleInfo {
  roleName: string;
  userIds?: string[];
  area?: string;
}

interface ProcessTemplateRequest {
  orgId: string;
  // Puede venir el key detectado o el nombre para detectar
  detectedProcessKey?: string;
  processName?: string;
  // Procesos existentes para evitar duplicados
  existingProcessList?: string[];
  // Perfil de la organización
  organizationProfile?: OrganizationProfile;
  // Roles y usuarios existentes
  rolesAndUsers?: RoleInfo[];
  // Contexto adicional del usuario
  optionalUserContext?: string;
}

interface ProcessTemplateResponse {
  success: boolean;
  detected: boolean;
  processKey?: string;
  processName?: string;
  matchScore?: number;
  template?: {
    title: string;
    isoClauseRefs: string[];
    objective: string;
    scope: string;
    ownerRole: string;
    involvedRoles: string[];
    inputs: string[];
    outputs: string[];
    activities: Array<{
      step: number;
      name: string;
      description: string;
      record?: string;
    }>;
    records: Array<{
      name: string;
      codeSuggestion?: string;
      retention?: string;
    }>;
    indicators: Array<{
      name: string;
      formula?: string;
      frequency?: string;
      target?: string;
    }>;
    risks: Array<{
      risk: string;
      cause?: string;
      control?: string;
    }>;
    interactions: string[];
    notes: string[];
  };
  error?: string;
}

/**
 * Personaliza la plantilla con datos de la organización
 */
function personalizeTemplate(
  process: ISOClassicProcess,
  org: OrganizationProfile | undefined,
  roles: RoleInfo[] | undefined,
  existingProcesses: string[] | undefined,
  userContext: string | undefined
): ProcessTemplateResponse['template'] {
  const template = process.template;
  const notes: string[] = [];

  // Personalizar objetivo con nombre de empresa
  let objective = template.objective;
  if (org?.companyName) {
    objective = objective.replace(
      /la organización|la empresa/gi,
      org.companyName
    );
  }

  // Personalizar alcance
  let scope = template.scope;
  if (org?.scope) {
    scope += ` Alcance SGC: ${org.scope}`;
  }

  // Buscar responsable sugerido en roles existentes
  let ownerRole = template.ownerRole;
  if (roles && roles.length > 0) {
    // Buscar rol que coincida
    const possibleRoles = [
      'calidad',
      'sgc',
      'gestion',
      template.ownerRole.toLowerCase(),
    ];
    const foundRole = roles.find(r =>
      possibleRoles.some(pr => r.roleName.toLowerCase().includes(pr))
    );
    if (foundRole) {
      ownerRole = foundRole.roleName;
    } else {
      notes.push(
        `[REVISAR] Asignar responsable. Sugerido: ${template.ownerRole}`
      );
    }
  } else {
    notes.push(`[REVISAR] Verificar responsable: ${template.ownerRole}`);
  }

  // Filtrar interacciones que ya existen
  const interactions = template.interactions.map(int => {
    if (
      existingProcesses?.some(
        ep =>
          ep.toLowerCase().includes(int.toLowerCase()) ||
          int.toLowerCase().includes(ep.toLowerCase())
      )
    ) {
      return `${int} ✓`;
    }
    return int;
  });

  // Adaptar ejemplos al rubro si está disponible
  if (org?.industry) {
    notes.push(
      `[INFO] Rubro detectado: ${org.industry}. Revisar ejemplos para adecuar a su industria.`
    );
  }

  // Agregar contexto del usuario si existe
  if (userContext) {
    notes.push(`[CONTEXTO USUARIO] ${userContext}`);
  }

  return {
    title: process.name,
    isoClauseRefs: process.isoClause,
    objective,
    scope,
    ownerRole,
    involvedRoles: template.involvedRoles,
    inputs: template.inputs,
    outputs: template.outputs,
    activities: template.activities,
    records: template.records,
    indicators: template.indicators,
    risks: template.risks,
    interactions,
    notes,
  };
}

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body: ProcessTemplateRequest = await request.json();

    // Validar request
    if (!(body.orgId || auth.organizationId)) {
      return NextResponse.json(
        { success: false, error: 'Se requiere orgId' },
        { status: 400 }
      );
    }

    if (!body.detectedProcessKey && !body.processName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere detectedProcessKey o processName',
        },
        { status: 400 }
      );
    }

    body.orgId = body.orgId || auth.organizationId || body.orgId;

    let process: ISOClassicProcess | undefined;
    let matchScore = 0;

    // Si viene el key directamente, usar ese
    if (body.detectedProcessKey) {
      process = getClassicProcessByKey(body.detectedProcessKey);
      matchScore = 100;
    }
    // Si no, detectar por nombre
    else if (body.processName) {
      const detection = detectClassicProcess(body.processName);
      if (detection.process && detection.score >= 50) {
        process = detection.process;
        matchScore = detection.score;
      }
    }

    // Si no se detectó ningún proceso clásico
    if (!process) {
      return NextResponse.json({
        success: true,
        detected: false,
        message:
          'No se detectó un proceso clásico ISO 9001. Puede crear el proceso manualmente.',
      });
    }

    // Generar plantilla personalizada
    const template = personalizeTemplate(
      process,
      body.organizationProfile,
      body.rolesAndUsers,
      body.existingProcessList,
      body.optionalUserContext
    );

    return NextResponse.json({
      success: true,
      detected: true,
      processKey: process.key,
      processName: process.name,
      matchScore,
      categoryId: process.categoryId,
      categoryLabel: PROCESS_CATEGORIES[process.categoryId]?.label,
      isoClause: process.isoClause,
      description: process.description,
      template,
    });
  } catch (error) {
    console.error('Error en /api/ai/process-template:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

/**
 * GET: Detectar proceso clásico por nombre (para UI en tiempo real)
 */
export const GET = withAuth(async request => {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.length < 3) {
    return NextResponse.json({
      detected: false,
      message: 'Nombre muy corto para detectar',
    });
  }

  const detection = detectClassicProcess(name);

  if (detection.process && detection.score >= 50) {
    return NextResponse.json({
      detected: true,
      processKey: detection.process.key,
      processName: detection.process.name,
      matchScore: detection.score,
      matchedAlias: detection.matchedAlias,
      categoryId: detection.process.categoryId,
      categoryLabel: PROCESS_CATEGORIES[detection.process.categoryId]?.label,
      isoClause: detection.process.isoClause,
      description: detection.process.description,
    });
  }

  return NextResponse.json({
    detected: false,
    score: detection.score,
  });
});
