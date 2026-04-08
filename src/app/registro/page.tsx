import { redirect } from 'next/navigation';

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function toQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function RegistroPage({ searchParams }: Props) {
  redirect(`/onboarding/empresa${toQueryString(searchParams ?? {})}`);
}
