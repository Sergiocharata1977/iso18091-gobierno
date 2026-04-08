import { getAdminFirestore } from '@/lib/firebase/admin';
import type { Firestore } from 'firebase-admin/firestore';

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

const capabilityCache = new Map<
  string,
  { installed: boolean; timestamp: number }
>();

function getCacheKey(organizationId: string, capabilityId: string): string {
  return `${organizationId}:${capabilityId}`;
}

function getCachedCapability(
  organizationId: string,
  capabilityId: string
): boolean | null {
  const key = getCacheKey(organizationId, capabilityId);
  const cached = capabilityCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.installed;
  }

  if (cached) {
    capabilityCache.delete(key);
  }

  return null;
}

function setCachedCapability(
  organizationId: string,
  capabilityId: string,
  installed: boolean
): void {
  if (capabilityCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = capabilityCache.keys().next().value;
    if (oldestKey) {
      capabilityCache.delete(oldestKey);
    }
  }

  capabilityCache.set(getCacheKey(organizationId, capabilityId), {
    installed,
    timestamp: Date.now(),
  });
}

export async function isCapabilityInstalled(
  db: Firestore,
  organizationId: string,
  capabilityId: string
): Promise<boolean> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  if (!capabilityId) {
    throw new Error('capabilityId is required');
  }

  const cached = getCachedCapability(organizationId, capabilityId);
  if (cached !== null) {
    return cached;
  }

  const doc = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('installed_capabilities')
    .doc(capabilityId)
    .get();

  const installed = doc.exists;
  setCachedCapability(organizationId, capabilityId, installed);
  return installed;
}

export async function requireCapability(
  organizationId: string,
  capabilityId: string
): Promise<void>;
export async function requireCapability(
  db: Firestore,
  organizationId: string,
  capabilityId: string
): Promise<void>;
export async function requireCapability(
  dbOrOrganizationId: Firestore | string,
  organizationIdOrCapabilityId: string,
  maybeCapabilityId?: string
): Promise<void> {
  const db =
    typeof dbOrOrganizationId === 'string'
      ? getAdminFirestore()
      : dbOrOrganizationId;
  const organizationId =
    typeof dbOrOrganizationId === 'string'
      ? dbOrOrganizationId
      : organizationIdOrCapabilityId;
  const capabilityId =
    typeof dbOrOrganizationId === 'string'
      ? maybeCapabilityId
      : maybeCapabilityId;

  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  if (!capabilityId) {
    throw new Error('capabilityId is required');
  }

  const installed = await isCapabilityInstalled(db, organizationId, capabilityId);

  if (!installed) {
    throw new Error(`Capability "${capabilityId}" is not installed`);
  }
}

export function invalidateCapabilityCache(
  organizationId: string,
  capabilityId: string
): void {
  capabilityCache.delete(getCacheKey(organizationId, capabilityId));
}

export function clearCapabilityCache(): void {
  capabilityCache.clear();
}
