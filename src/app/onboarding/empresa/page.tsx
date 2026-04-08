import { OrganizationBootstrapForm } from '@/components/onboarding/OrganizationBootstrapForm';
import type { Edition } from '@/types/edition';

type Props = {
  searchParams?: {
    email?: string;
    ownerName?: string;
    edition?: string;
  };
};

export default function OnboardingEmpresaPage({ searchParams }: Props) {
  const initialEdition: Edition | null =
    searchParams?.edition === 'government' ? 'government' : null;

  return (
    <OrganizationBootstrapForm
      initialEmail={searchParams?.email}
      initialOwnerName={searchParams?.ownerName}
      initialEdition={initialEdition}
    />
  );
}
