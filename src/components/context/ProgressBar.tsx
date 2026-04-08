interface ProgressBarProps {
  value: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-300 ${colorClasses[color]}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
