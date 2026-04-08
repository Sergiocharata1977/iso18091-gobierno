/**
 * POST /api/admin/sync-modules
 *
 * Sincroniza modulos_habilitados de todos los usuarios de la organización
 * basándose en los plugins instalados en installed_plugins (Firestore).
 *
 * Resultado: el menú lateral refleja exactamente lo que está instalado.
 * Si no hay plugins instalados → solo muestra core ISO 9001.
 */
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { buildModulosHabilitados } from '@/config/plugins/nav-feature-map';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, _context, auth) => {
    const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
      requireOrg: true,
    });

    if (!orgScope.ok || !orgScope.organizationId) {
      const apiError = toOrganizationApiError(orgScope);
      return NextResponse.json(
        { success: false, error: apiError.error },
        { status: apiError.status }
      );
    }

    const orgId = orgScope.organizationId;
    const db = getAdminFirestore();

    // 1. Leer plugins instalados/habilitados
    const pluginsSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('installed_plugins')
      .where('lifecycle', 'in', ['installed', 'enabled'])
      .get();

    const installedPluginIds = pluginsSnap.docs.map(
      d => d.data().plugin_id as string
    );

    // 2. Calcular modulos_habilitados = core + features de plugins instalados
    const modulosHabilitados = buildModulosHabilitados(installedPluginIds);

    // 3. Actualizar todos los usuarios de la organización en batch
    const usersSnap = await db
      .collection('users')
      .where('organization_id', '==', orgId)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({
        success: true,
        message: 'No hay usuarios en la organización',
        modulos_habilitados: modulosHabilitados,
        users_updated: 0,
      });
    }

    const batch = db.batch();
    usersSnap.docs.forEach(userDoc => {
      batch.update(userDoc.ref, {
        modulos_habilitados: modulosHabilitados,
        updatedAt: new Date(),
      });
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Navegación sincronizada para ${usersSnap.size} usuario(s)`,
      installed_plugins: installedPluginIds,
      modulos_habilitados: modulosHabilitados,
      users_updated: usersSnap.size,
    });
  },
  { roles: ['admin', 'super_admin'] }
);
