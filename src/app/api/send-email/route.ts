import { checkRateLimit } from '@/lib/api/rateLimit';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { analyzeDemoRequestSpam } from '@/lib/super-admin/demoRequestsSpam';
import { NextRequest, NextResponse } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      company,
      whatsapp,
      employees,
      hasISO,
      message,
      website,
      _ts,
    } = body;

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const normalizedWhatsapp = String(whatsapp || '').trim();
    const normalizedName = String(name || '').trim();
    const normalizedCompany = String(company || '').trim();
    const normalizedMessage = String(message || '').trim();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedCompany ||
      !normalizedWhatsapp
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Correo electronico invalido' },
        { status: 400 }
      );
    }

    const spamCheck = analyzeDemoRequestSpam({
      name: normalizedName,
      email: normalizedEmail,
      company: normalizedCompany,
      whatsapp: normalizedWhatsapp,
      message: normalizedMessage,
      website: website || '',
      _ts: _ts || undefined,
    });

    if (spamCheck.isLikelySpam) {
      return NextResponse.json(
        { error: 'Solicitud bloqueada por filtros anti-spam' },
        { status: 422 }
      );
    }

    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 20,
      windowSeconds: 3600,
      identifier: `send-email:${normalizedEmail}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const db = getAdminFirestore();
    const demoRequestsRef = db.collection('demo_requests');
    const docRef = await demoRequestsRef.add({
      name: normalizedName,
      email: normalizedEmail,
      company: normalizedCompany,
      whatsapp: normalizedWhatsapp,
      employees: employees || 'No especificado',
      hasISO: Boolean(hasISO),
      message: normalizedMessage,
      status: 'pending', // pending, contacted, closed, activated
      organization_id: null,
      created_by: 'landing_public',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Solicitud guardada correctamente',
    });
  } catch (error) {
    console.error('Error guardando solicitud de demo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
