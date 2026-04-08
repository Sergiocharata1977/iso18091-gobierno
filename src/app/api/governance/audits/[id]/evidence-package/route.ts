import { withAuth } from '@/lib/api/withAuth';
import { GovernancePhase3Service } from '@/services/governance/GovernancePhase3Service';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const searchParams = request.nextUrl.searchParams;
      const format = searchParams.get('format') || 'json';

      const organizationId =
        auth.organizationId || searchParams.get('organization_id');
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const evidencePackage =
        await GovernancePhase3Service.generateAuditEvidencePackage(
          organizationId,
          id
        );

      if (format === 'json') {
        return NextResponse.json({
          success: true,
          data: evidencePackage,
        });
      }

      if (format === 'csv') {
        const rows = [
          ['section', 'field', 'value'],
          [
            'summary',
            'findings_count',
            String(evidencePackage.summary.findings_count),
          ],
          [
            'summary',
            'actions_count',
            String(evidencePackage.summary.actions_count),
          ],
          [
            'summary',
            'evidence_files_count',
            String(evidencePackage.summary.evidence_files_count),
          ],
          [
            'summary',
            'open_findings_count',
            String(evidencePackage.summary.open_findings_count),
          ],
          [
            'summary',
            'open_actions_count',
            String(evidencePackage.summary.open_actions_count),
          ],
        ];
        const csv = rows
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="audit-evidence-package-${id}.csv"`,
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Formato no soportado' },
        { status: 400 }
      );
    } catch (error) {
      console.error(
        'Error in GET /api/governance/audits/[id]/evidence-package:',
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
