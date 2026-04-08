interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
}

export function EmptyState({ icon = '📋', title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      )}
      <p className="text-gray-600 max-w-md">{message}</p>
    </div>
  );
}
