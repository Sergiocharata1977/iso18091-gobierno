import * as Sentry from '@sentry/nextjs';

/**
 * Monitoring utilities for error tracking and performance monitoring
 */

/**
 * Track custom error with Sentry
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error tracked:', error, context);
  }
}

/**
 * Track custom event with Sentry
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackEvent(eventName: string, data?: Record<string, any>) {
  Sentry.captureMessage(eventName, {
    level: 'info',
    extra: data,
  });
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Track performance metric
 */
export function trackPerformance(
  metricName: string,
  value: number,
  unit: string = 'ms'
) {
  // Send to Sentry as breadcrumb
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${metricName}: ${value}${unit}`,
    level: 'info',
    data: {
      metric: metricName,
      value,
      unit,
    },
  });

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metricName}: ${value}${unit}`);
  }
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    trackPerformance(`api_${apiName}`, duration);

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    trackError(error as Error, {
      api: apiName,
      duration,
    });

    throw error;
  }
}

/**
 * Track Firestore query performance
 */
export function trackFirestoreQuery(
  collection: string,
  operation: string,
  duration: number
) {
  trackPerformance(`firestore_${collection}_${operation}`, duration);

  // Add breadcrumb for debugging
  Sentry.addBreadcrumb({
    category: 'firestore',
    message: `${operation} on ${collection}`,
    level: 'info',
    data: {
      collection,
      operation,
      duration,
    },
  });
}

/**
 * Monitor critical business metrics
 */
export function trackBusinessMetric(
  metricName: string,
  value: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'business',
    message: `${metricName}: ${value}`,
    level: 'info',
    data: {
      metric: metricName,
      value,
      ...metadata,
    },
  });
}

/**
 * Track user action for analytics
 */
export function trackUserAction(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: `${category}: ${action}`,
    level: 'info',
    data: {
      action,
      category,
      label,
      value,
    },
  });
}
