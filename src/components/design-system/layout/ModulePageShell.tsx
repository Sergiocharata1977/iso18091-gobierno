import { cn } from '@/lib/utils';

interface ModulePageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClassName?: string;
}

export function ModulePageShell({
  children,
  className,
  contentClassName,
  maxWidthClassName = 'max-w-7xl',
}: ModulePageShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f3_42%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto w-full px-4 py-8 sm:px-6 lg:px-8',
          maxWidthClassName,
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface ModuleStatePanelProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function ModuleStatePanel({
  icon,
  title,
  description,
  actions,
  className,
}: ModuleStatePanelProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80',
        className
      )}
    >
      {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {actions ? <div className="mt-5 flex justify-center">{actions}</div> : null}
    </div>
  );
}
