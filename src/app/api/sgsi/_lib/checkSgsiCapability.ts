import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';

export async function checkSgsiCapability(
  orgId: string
): Promise<NextResponse | null> {
  const enabled = await CapabilityService.isCapabilityEnabled(
    orgId,
    'iso_sgsi_27001'
  );
  if (!enabled) {
    return NextResponse.json(
      { success: false, error: 'Capability iso_sgsi_27001 no habilitada' },
      { status: 403 }
    );
  }
  return null;
}
