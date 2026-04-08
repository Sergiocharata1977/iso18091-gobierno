import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';

/**
 * Verifica que el tenant tenga el capability `pack_hse` habilitado.
 * Retorna un NextResponse 403 si no lo tiene, o null si está habilitado.
 */
export async function checkHseCapability(orgId: string): Promise<NextResponse | null> {
  const enabled = await CapabilityService.isCapabilityEnabled(orgId, 'pack_hse');
  if (!enabled) {
    return NextResponse.json(
      { success: false, error: 'Capability pack_hse no habilitada' },
      { status: 403 }
    );
  }
  return null;
}
