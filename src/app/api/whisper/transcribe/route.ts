// API endpoint for Groq Whisper transcription

import Groq from 'groq-sdk';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { withAuth } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';

interface TranscriptionResponse {
  text: string;
  language?: string;
}

// Lazy init
let groqInstance: Groq | null = null;
const getGroqClient = () => {
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
    });
  }
  return groqInstance;
};

export const POST = withAuth(
  async (req: NextRequest, _context, auth) => {
    const startTime = Date.now();
    const rateLimitResponse = checkRateLimit(req, {
      maxRequests: 6,
      windowSeconds: 60,
      identifier: `whisper-transcribe:${auth.organizationId || 'no-org'}:${auth.uid}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    try {
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;

      if (!audioFile) {
        return NextResponse.json(
          { error: 'No audio file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!audioFile.type.startsWith('audio/')) {
        return NextResponse.json(
          { error: 'Invalid file type. Must be audio file' },
          { status: 400 }
        );
      }

      // Validate file size (max 25MB for Whisper)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audioFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Audio file too large. Maximum size is 25MB' },
          { status: 400 }
        );
      }

      console.log(
        '[API /whisper/transcribe] Starting transcription with Groq...'
      );
      console.log(
        '[API /whisper/transcribe] File size:',
        audioFile.size,
        'bytes'
      );
      console.log('[API /whisper/transcribe] File type:', audioFile.type);

      // Call Groq Whisper API
      const groq = getGroqClient();
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        language: 'es', // Spanish
        response_format: 'json',
        temperature: 0.0,
      });

      const totalLatencyMs = Date.now() - startTime;

      console.log('[API /whisper/transcribe] Success');
      console.log(
        '[API /whisper/transcribe] Transcription:',
        transcription.text.substring(0, 100) + '...'
      );
      console.log(
        '[API /whisper/transcribe] Total latency:',
        totalLatencyMs,
        'ms'
      );

      return NextResponse.json({
        text: transcription.text,
        language: 'es',
        latencyMs: totalLatencyMs,
      });
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;
      console.error('[API /whisper/transcribe] Error:', error);
      console.error(
        '[API /whisper/transcribe] Failed after:',
        totalLatencyMs,
        'ms'
      );

      return NextResponse.json(
        {
          error: 'Transcription failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          latencyMs: totalLatencyMs,
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

// Increase max duration for audio processing
export const maxDuration = 60; // 60 seconds
