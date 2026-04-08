import { redirect } from 'next/navigation';

export default function DashboardMiPanelAliasPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach(v => params.append(key, v));
      else if (typeof value === 'string') params.set(key, value);
    });
  }
  redirect(`/mi-panel${params.toString() ? `?${params}` : ''}`);
}
