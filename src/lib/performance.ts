/**
 * Performance monitoring utilities
 */

/**
 * Measure Web Vitals
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vital]', metric.name, metric.value);
  }

  // Send to analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).va) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).va('event', {
      name: metric.name,
      data: {
        value: metric.value,
        id: metric.id,
        label: metric.label,
      },
    });
  }
}

/**
 * Track page load performance
 */
export function trackPageLoad() {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log('[Performance Metrics]', {
      pageLoadTime,
      connectTime,
      renderTime,
    });
  });
}

/**
 * Monitor Firebase Performance
 */
export function initFirebasePerformance() {
  if (typeof window === 'undefined') return;

  // This would be initialized with Firebase Performance SDK
  // For now, we'll track custom metrics
  console.log('[Firebase Performance] Initialized');
}
