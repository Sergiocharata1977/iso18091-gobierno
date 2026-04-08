import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { withAuth } from '@/lib/api/withAuth';

export const GET = withAuth(
  async (request, _context, auth) => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 10,
      windowSeconds: 60,
      identifier: `openai-session:${auth.organizationId || 'no-org'}:${auth.uid}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    try {
      const response = await fetch(
        'https://api.openai.com/v1/realtime/sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-realtime-preview-2024-12-17',
            voice: 'verse',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error generating OpenAI session:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
