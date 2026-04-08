import { UserContext } from '@/types/context';
import { InfoItem } from './InfoItem';

interface InformacionPersonalCardProps {
  contexto: UserContext;
}

export function InformacionPersonalCard({
  contexto,
}: InformacionPersonalCardProps) {
  const { personnel, position, department, supervisor } = contexto;

  if (!personnel) {
    return null;
  }

  const nombreCompleto = `${personnel.nombres} ${personnel.apellidos}`;
  const supervisorInfo = supervisor
    ? `${supervisor.nombres} ${supervisor.apellidos}`
    : 'N/A';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">👤</span>
        <h2 className="text-xl font-bold text-gray-900">
          Información Personal
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem label="Nombre" value={nombreCompleto} />
        <InfoItem label="Puesto" value={position?.nombre} />
        <InfoItem label="Departamento" value={department?.nombre} />
        <InfoItem label="Supervisor" value={supervisorInfo} />
        <InfoItem label="Tipo de Personal" value={personnel.tipo_personal} />
        <InfoItem label="Estado" value={personnel.estado} />
      </div>
    </div>
  );
}
