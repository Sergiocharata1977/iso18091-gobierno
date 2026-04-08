import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { withAuth } from '@/lib/api/withAuth';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 8,
      windowSeconds: 60,
      identifier: `elevenlabs-speech:${auth.organizationId || 'no-org'}:${auth.uid}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    try {
      const { text, voiceId } = await request.json();

      if (!text) {
        return NextResponse.json(
          { error: 'Text is required' },
          { status: 400 }
        );
      }

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'ElevenLabs API key not configured' },
          { status: 500 }
        );
      }

      // Default voice ID if not provided (Rachel)
      // Spanish optimized voice is recommended, e.g., 'ErXwobaYiN019PkySvjV' (Antoni)
      // or use the one from config
      const targetVoiceId =
        voiceId || process.env.ELEVENLABS_VOICE_ID || 'kulszILr6ees0ArU8miO';

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2', // Best for Spanish
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.detail?.message || 'Error from ElevenLabs' },
          { status: response.status }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString(),
        },
      });
    } catch (error) {
      console.error('[API /elevenlabs/speech] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
