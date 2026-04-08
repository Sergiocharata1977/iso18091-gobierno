'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export function PostHogProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!apiKey || typeof window === 'undefined' || window.posthog) {
      return;
    }

    posthog.init(apiKey, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    });

    window.posthog = posthog;
  }, []);

  return null;
}
