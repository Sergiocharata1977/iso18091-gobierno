import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300;

// GET → capability individual por capability_id (solo activas)
// No requiere auth
export async function GET(
  _request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Power no encontrado' },
        { status: 404 }
      );
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection('platform_capabilities')
      .where('capability_id', '==', id)
      .limit(1)
      .get();

    // También intentar por doc ID (el doc ID es el capability_id)
    let data: Record<string, unknown> | null = null;
    let docId = id;

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      data = doc.data() as Record<string, unknown>;
      docId = doc.id;
    } else {
      // Intentar buscar directamente por doc ID
      const directDoc = await db
        .collection('platform_capabilities')
        .doc(id)
        .get();

      if (directDoc.exists) {
        data = directDoc.data() as Record<string, unknown>;
        docId = directDoc.id;
      }
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Power no encontrado' },
        { status: 404 }
      );
    }

    // Si no está activa, devolver 404
    if (data.status !== 'active' && data.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Power no encontrado' },
        { status: 404 }
      );
    }

    // Excluir manifest.navigation de la respuesta (info técnica interna)
    const { manifest, ...rest } = data;
    const { navigation: _nav, ...safeManifest } = (manifest as Record<string, unknown>) || {};

    return NextResponse.json({
      success: true,
      data: { ...rest, id: docId, manifest: safeManifest },
    });
  } catch (error) {
    console.error('[public/capabilities/[id] GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener la capability' },
      { status: 500 }
    );
  }
}
