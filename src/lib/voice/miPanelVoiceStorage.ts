/**
 * DEPRECATED (OLA 2 - IA unificada):
 * `localStorage` de voz se mantiene solo como fallback temporal.
 * El estado principal (saludo/ultima interaccion) debe vivir en `ai_user_profiles`.
 */
const LAST_GREETING_KEY = 'miPanelVoiceLastGreeting';

function isBrowserStorageAvailable(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getTodayLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function readLastGreetingDate(): string | null {
  if (!isBrowserStorageAvailable()) {
    return null;
  }

  try {
    return window.localStorage.getItem(LAST_GREETING_KEY);
  } catch {
    return null;
  }
}

export function shouldGreetToday(): boolean {
  const todayKey = getTodayLocalDateKey();
  const lastGreetingDate = readLastGreetingDate();

  return lastGreetingDate !== todayKey;
}

export function markGreetingDone(): void {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_GREETING_KEY, getTodayLocalDateKey());
  } catch {
    // Ignore storage failures to avoid breaking voice UX.
  }
}

export function getGreetingMessage(userName?: string | null): string {
  const hour = new Date().getHours();
  const normalizedName = userName?.trim();
  const nameSuffix = normalizedName ? `, ${normalizedName}` : '';

  if (hour >= 5 && hour < 12) {
    return `Buenos dias${nameSuffix}`;
  }

  if (hour >= 12 && hour < 20) {
    return `Buenas tardes${nameSuffix}`;
  }

  return `Buenas noches${nameSuffix}`;
}
