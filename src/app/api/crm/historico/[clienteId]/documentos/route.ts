import { withAuth } from '@/lib/api/withAuth';
import { HistoricoService } from '@/services/crm/HistoricoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, _auth) => {
    try {
      const { clienteId } = await params;
      const { searchParams } = new URL(request.url);
      const soloActuales = searchParams.get('actuales') !== 'false';

      const documentos = await HistoricoService.getDocumentos(
        clienteId,
        soloActuales
      );
      return NextResponse.json({
        success: true,
        data: documentos,
        count: documentos.length,
      });
    } catch (error: any) {
      console.error(
        'Error in GET /api/crm/historico/[clienteId]/documentos:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get documentos' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { clienteId } = await params;
      const body = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? body.organizationId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organizationId es requerido' },
          { status: 400 }
        );
      }
      if (!body.documentoBaseId || !body.nombreArchivo || !body.storageUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'documentoBaseId, nombreArchivo y storageUrl son requeridos',
          },
          { status: 400 }
        );
      }

      const documentoId = await HistoricoService.addDocumentoVersion(
        organizationId,
        clienteId,
        {
          documentoBaseId: body.documentoBaseId,
          nombreArchivo: body.nombreArchivo,
          tipoDocumento: body.tipoDocumento || 'otro',
          descripcion: body.descripcion,
          storageUrl: body.storageUrl,
          tamaño: body.tamano || 0,
          mimeType: body.mimeType || 'application/octet-stream',
          fechaDocumento: body.fechaDocumento,
          fechaCarga: new Date().toISOString(),
        },
        {
          userId: auth.uid,
          nombre: body.subidoPor?.nombre || auth.email || 'Sistema',
        }
      );

      return NextResponse.json({
        success: true,
        data: { id: documentoId },
        message: 'Documento versionado exitosamente',
      });
    } catch (error: any) {
      console.error(
        'Error in POST /api/crm/historico/[clienteId]/documentos:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to add documento' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
