import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
}));

import CentroAgenticoPage from '@/app/(dashboard)/centro-agentico/page';

describe('CentroAgenticoPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('renderiza el modulo principal con resumen y caso inicial', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            jobs_activos: 4,
            sagas_pausadas: 2,
            direct_actions_pendientes: 3,
            terminales_con_aprobacion: 1,
            personas_impactadas: 5,
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            organizationId: 'org-1',
            generatedAt: '2026-03-29T12:00:00.000Z',
            casos: [
              {
                id: 'case-1',
                titulo: 'Capacitacion vencida - Juan Perez',
                descripcion: 'Se detecto una capacitacion obligatoria vencida.',
                estado: 'esperando',
                timestamp: '2026-03-29T12:00:00.000Z',
                evento_detectado: {
                  id: 'ev-1',
                  tipo: 'Capacitacion vencida',
                  descripcion: 'Juan Perez no completo la capacitacion.',
                  origen: 'agente',
                  timestamp: '2026-03-29T12:00:00.000Z',
                  prioridad: 'alta',
                },
                workflow_pasos: [
                  {
                    paso: 1,
                    label: 'Motor detecta capacitacion vencida',
                    estado: 'completado',
                    timestamp_opcional: '2026-03-29T12:00:00.000Z',
                  },
                  {
                    paso: 2,
                    label: 'Esperando aprobacion',
                    estado: 'activo',
                    timestamp_opcional: '2026-03-29T12:05:00.000Z',
                  },
                ],
                accion_propuesta: {
                  actionId: 'action-1',
                  titulo: 'Inscribir a Juan Perez',
                  descripcion_negocio: 'La IA propone inscribirlo al proximo turno.',
                  entidad: 'Capacitacion',
                  tipo_operacion: 'Inscribir al curso',
                  estado: 'pendiente',
                },
                persona_target: {
                  nombre: 'Juan Perez',
                  puesto: 'Operario',
                  terminal_nombre: 'Terminal Planta 1',
                  canal: 'terminal',
                  estado_terminal: 'Conectado',
                  requiere_aprobacion: true,
                  politica_aplicada: 'Politica Capacitaciones',
                },
                evidencia_final: null,
              },
            ],
          },
        }),
      });

    render(<CentroAgenticoPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Capacitacion vencida - Juan Perez').length
      ).toBeGreaterThan(0);
    });

    expect(screen.getByText('Centro de Ejecucion IA')).toBeInTheDocument();
    expect(screen.getByText('Sistema Kanban de casos IA')).toBeInTheDocument();
    expect(screen.getByLabelText('Tablero kanban centralizado')).toBeInTheDocument();
    expect(screen.queryByText('Registro del proceso')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver detalle/i })).toHaveAttribute(
      'href',
      '/centro-agentico/case-1'
    );
    expect(screen.getAllByText('Inscribir a Juan Perez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Juan Perez').length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/agentic-center/summary', {
      cache: 'no-store',
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/agentic-center/cases', {
      cache: 'no-store',
    });
  });
});
