'use client';

import { OrganizationSubscriptionPanel } from '@/components/billing/OrganizationSubscriptionPanel';

interface SubscriptionPanelProps {
  userId: string;
  userEmail: string;
  userName?: string;
  currentPlan?: 'trial' | 'basic' | 'premium' | 'none';
}

// Legacy wrapper: mantiene compatibilidad mientras la UX migra a billing por organizacion.
export function SubscriptionPanel(_props: SubscriptionPanelProps) {
  return <OrganizationSubscriptionPanel />;
}
