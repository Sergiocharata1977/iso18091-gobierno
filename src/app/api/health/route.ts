import { checkRateLimit } from '@/lib/api/rateLimit';
import { NextRequest } from 'next/server';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request, {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      firebase: 'unknown',
      claude: 'unknown',
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check Firebase connection
    try {
      // Try a simple query to verify connection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(1));
      await getDocs(q);
      checks.services.firebase = 'healthy';
    } catch {
      checks.services.firebase = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check Claude API configuration
    if (process.env.ANTHROPIC_API_KEY) {
      checks.services.claude = 'configured';
    } else {
      checks.services.claude = 'not_configured';
      checks.status = 'degraded';
    }

    const statusCode = checks.status === 'healthy' ? 200 : 503;
    return Response.json(checks, { status: statusCode });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
