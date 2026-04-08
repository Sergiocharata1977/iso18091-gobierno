'use client';

import { PersonnelListing } from '@/components/rrhh/PersonnelListing';

export default function PersonalPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PersonnelListing />
      </div>
    </div>
  );
}
