import {
  publicSolicitudResponseSchema,
  type PublicSolicitudPayload,
  type PublicSolicitudResponse,
} from '@/lib/validations/dealer-solicitudes';

export class PublicSolicitudError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'PublicSolicitudError';
    this.status = status;
    this.details = details;
  }
}

export async function submitPublicSolicitud(
  payload: PublicSolicitudPayload
): Promise<PublicSolicitudResponse> {
  const response = await fetch('/api/public/solicitudes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok) {
    throw new PublicSolicitudError(
      typeof json?.error === 'string'
        ? json.error
        : 'No se pudo enviar la solicitud',
      response.status,
      json?.details
    );
  }

  return publicSolicitudResponseSchema.parse(json);
}
