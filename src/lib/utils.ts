import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha para mostrar en la UI
 * Soporta: string, Date, Firebase Timestamp, null, undefined
 */
export function formatDate(
  date: string | Date | { toDate: () => Date } | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (
    typeof date === 'object' &&
    'toDate' in date &&
    typeof date.toDate === 'function'
  ) {
    // Firebase Timestamp
    dateObj = date.toDate();
  } else {
    return '-';
  }

  if (isNaN(dateObj.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return dateObj.toLocaleDateString('es-AR', defaultOptions);
}
