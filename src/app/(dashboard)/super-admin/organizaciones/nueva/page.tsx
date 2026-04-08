import { redirect } from 'next/navigation';

export default function NuevaOrganizacionRedirectPage() {
  redirect('/super-admin/organizaciones?create=1');
}
