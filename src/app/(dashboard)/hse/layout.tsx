import { HSECapabilityGate } from './_components/HSECapabilityGate';

export const dynamic = 'force-dynamic';

export default function HseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <HSECapabilityGate>
        {children}
      </HSECapabilityGate>
    </div>
  );
}
