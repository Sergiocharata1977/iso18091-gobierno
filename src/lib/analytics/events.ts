type AnalyticsProperties = Record<string, unknown>;

function mirrorEvent(event: string, properties?: AnalyticsProperties) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    event,
    properties: properties ?? {},
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/track', blob);
    return;
  }

  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Best effort only.
  });
}

export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }

  mirrorEvent(event, properties);
};

export const EVENTS = {
  ONBOARDING_STEP: 'onboarding_step_completed',
  DOC_HELP_OPENED: 'doc_help_opened',
  CAPABILITY_INSTALLED: 'capability_installed',
  CRM_PLUGIN_INSTALLED: 'crm_plugin_installed',
  CRM_PLUGIN_UNINSTALLED: 'crm_plugin_uninstalled',
  AI_CONVERSATION_STARTED: 'ai_conversation_started',
} as const;
