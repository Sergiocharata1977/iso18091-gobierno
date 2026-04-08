import { withAuth } from '@/lib/api/withAuth';
import { DON_CANDIDO_AGENT_CONFIG } from '@/lib/voice/don-candido-agent';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, _context, _auth) => {
    const { required_env_vars: _hidden, ...safeConfig } =
      DON_CANDIDO_AGENT_CONFIG;

    return NextResponse.json({
      success: true,
      data: {
        ...safeConfig,
        env_configured: {
          api_key: !!process.env.ELEVENLABS_API_KEY,
          agent_id: !!process.env.ELEVENLABS_AGENT_ID_DON_CANDIDO,
          whatsapp_number:
            !!process.env.ELEVENLABS_WHATSAPP_PHONE_NUMBER_ID,
        },
        webhook_own_status: 'activo (canal principal multi-tenant)',
        elevenlabs_whatsapp: 'canal adicional (numero separado)',
      },
    });
  },
  { roles: ['admin', 'super_admin'] }
);
