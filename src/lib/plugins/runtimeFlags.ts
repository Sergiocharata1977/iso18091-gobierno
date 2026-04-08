export function isDynamicNavEnabled(): boolean {
  const explicitFlag = process.env.NEXT_PUBLIC_USE_DYNAMIC_NAV;

  if (explicitFlag === 'true') {
    return true;
  }

  if (explicitFlag === 'false') {
    return false;
  }

  return process.env.VERCEL_ENV === 'preview';
}
