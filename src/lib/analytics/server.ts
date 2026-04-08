import { getAdminFirestore } from '@/lib/firebase/admin';
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null | undefined;

type ServerEventInput = {
  event: string;
  distinctId: string;
  organizationId?: string | null;
  properties?: Record<string, unknown>;
};

function getPostHogClient() {
  if (posthogClient !== undefined) return posthogClient;

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    posthogClient = null;
    return posthogClient;
  }

  posthogClient = new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  });

  return posthogClient;
}

export async function captureServerEvent(input: ServerEventInput) {
  const db = getAdminFirestore();
  const payload = {
    event_name: input.event,
    distinct_id: input.distinctId,
    organization_id: input.organizationId ?? null,
    properties: input.properties ?? {},
    source: 'server',
    created_at: new Date(),
  };

  await db.collection('product_analytics_events').add(payload);

  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: {
      organization_id: input.organizationId ?? null,
      ...(input.properties ?? {}),
    },
  });
}
