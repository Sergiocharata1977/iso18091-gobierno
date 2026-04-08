/**
 * Utilidades para generar tokens y URLs de feed de calendario
 */

/**
 * Generar token de feed para un usuario
 * El token se genera como: base64(userId:organizationId)
 */
export function generateFeedToken(
  userId: string,
  organizationId: string
): string {
  const data = `${userId}:${organizationId}`;
  return Buffer.from(data).toString('base64');
}

/**
 * Generar URL completa del feed
 */
export function generateFeedUrl(
  userId: string,
  organizationId: string,
  baseUrl: string
): string {
  const token = generateFeedToken(userId, organizationId);
  return `${baseUrl}/api/calendar/feed/${token}`;
}
