/**
 * Cross-browser smooth scroll to a section by ID.
 * - Modern browsers: uses scrollIntoView({ behavior: 'smooth' })
 * - Safari < 15.4 / older browsers: falls back to instant scroll
 */
export function scrollToSection(id: string): void {
  if (typeof window === 'undefined') return;
  const element = document.getElementById(id);
  if (!element) return;

  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    // Fallback for browsers that don't support smooth behavior
    element.scrollIntoView();
  }
}
