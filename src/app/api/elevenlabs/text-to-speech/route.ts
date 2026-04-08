// API endpoint for ElevenLabs Text-to-Speech

import { ElevenLabsService } from '@/lib/elevenlabs/client';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { withAuth } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';

interface TTSRequest {
  text: string;
  voiceId?: string;
}

export const POST = withAuth(
  async (req: NextRequest, _context, auth) => {
    const startTime = Date.now();
    const rateLimitResponse = checkRateLimit(req, {
      maxRequests: 8,
      windowSeconds: 60,
      identifier: `elevenlabs-tts:${auth.organizationId || 'no-org'}:${auth.uid}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    try {
      const body: TTSRequest = await req.json();
      const { text, voiceId } = body;

      if (!text) {
        return NextResponse.json(
          { error: 'Text is required' },
          { status: 400 }
        );
      }

      console.log(
        '[API /elevenlabs/text-to-speech] Converting text to speech...'
      );
      console.log('[API /elevenlabs/text-to-speech] Text length:', text.length);
      console.log(
        '[API /elevenlabs/text-to-speech] Voice ID:',
        voiceId || 'default'
      );

      // Convert text to speech
      const audioBuffer = await ElevenLabsService.textToSpeech({
        text,
        voiceId,
      });

      const totalLatencyMs = Date.now() - startTime;

      console.log('[API /elevenlabs/text-to-speech] Success');
      console.log(
        '[API /elevenlabs/text-to-speech] Total latency:',
        totalLatencyMs,
        'ms'
      );
      console.log(
        '[API /elevenlabs/text-to-speech] Audio size:',
        audioBuffer.byteLength,
        'bytes'
      );

      // Return audio as response with latency header
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'X-Latency-Ms': totalLatencyMs.toString(),
          'X-Character-Count': text.length.toString(),
        },
      });
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;
      console.error('[API /elevenlabs/text-to-speech] Error:', error);
      console.error(
        '[API /elevenlabs/text-to-speech] Failed after:',
        totalLatencyMs,
        'ms'
      );

      return NextResponse.json(
        {
          error: 'Error generating speech',
          message: error instanceof Error ? error.message : 'Unknown error',
          latencyMs: totalLatencyMs,
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
