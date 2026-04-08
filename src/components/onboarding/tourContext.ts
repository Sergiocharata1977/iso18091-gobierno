export type TourContext = 'mi-sgc' | 'general';

export function getTourContext(pathname: string): TourContext {
  return pathname.startsWith('/mi-sgc') ? 'mi-sgc' : 'general';
}

export function getTourKey(pathname: string): string {
  return `tour_don_candido_v3_${getTourContext(pathname)}_last_seen_at`;
}
