interface InfoItemProps {
  label: string;
  value: string | number | undefined;
}

export function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || 'N/A'}</span>
    </div>
  );
}
