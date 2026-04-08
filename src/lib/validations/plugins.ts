import { z } from 'zod';
import type {
  AvailableCapabilitiesRequest,
  CapabilityTier,
  DeleteCapabilityRequest,
  InstallCapabilityRequest,
  PlatformCapabilityStatus,
  ToggleCapabilityRequest,
  UpdateCapabilitySettingsRequest,
} from '@/types/plugins';

export const capabilityTierSchema = z.enum([
  'base',
  'opcional',
  'premium',
  'government',
]);
export const platformCapabilityStatusSchema = z.enum([
  'active',
  'available',
  'beta',
  'deprecated',
]);

const capabilityIdSchema = z.string().min(1);
const organizationIdSchema = z.string().min(1);
const systemIdSchema = z.string().min(1);
const settingsSchema = z.record(z.string(), z.unknown());

export const installCapabilityRequestSchema = z.object({
  organization_id: organizationIdSchema.optional(),
  capability_id: capabilityIdSchema,
  system_id: systemIdSchema.default('iso9001'),
  enabled: z.boolean().default(true),
  settings: settingsSchema.optional(),
  industry_type: z.string().nullable().optional(),
  submodules_enabled: z.array(z.string().min(1)).default([]),
});

export const toggleCapabilityRequestSchema = z.object({
  organization_id: organizationIdSchema.optional(),
  capability_id: capabilityIdSchema.optional(),
  enabled: z.boolean(),
});

export const updateCapabilitySettingsRequestSchema = z.object({
  organization_id: organizationIdSchema.optional(),
  capability_id: capabilityIdSchema.optional(),
  settings: settingsSchema,
});

export const updateInstalledCapabilityRequestSchema = z
  .object({
    organization_id: organizationIdSchema.optional(),
    capability_id: capabilityIdSchema,
    enabled: z.boolean().optional(),
    settings: settingsSchema.optional(),
    system_id: systemIdSchema.optional(),
  })
  .refine(
    value =>
      typeof value.enabled === 'boolean' || typeof value.settings === 'object',
    {
      message: 'Debe incluir enabled o settings',
    }
  );

export const deleteCapabilityRequestSchema = z.object({
  organization_id: organizationIdSchema.optional(),
  capability_id: capabilityIdSchema.optional(),
});

export const availableCapabilitiesRequestSchema = z.object({
  organization_id: organizationIdSchema.optional(),
  system_id: systemIdSchema.optional(),
});

export type CapabilityTierInput = z.input<typeof capabilityTierSchema>;
export type PlatformCapabilityStatusInput = z.input<
  typeof platformCapabilityStatusSchema
>;
export type InstallCapabilityRequestInput = z.input<
  typeof installCapabilityRequestSchema
>;
export type ToggleCapabilityRequestInput = z.input<
  typeof toggleCapabilityRequestSchema
>;
export type UpdateCapabilitySettingsRequestInput = z.input<
  typeof updateCapabilitySettingsRequestSchema
>;
export type UpdateInstalledCapabilityRequestInput = z.input<
  typeof updateInstalledCapabilityRequestSchema
>;
export type DeleteCapabilityRequestInput = z.input<
  typeof deleteCapabilityRequestSchema
>;
export type AvailableCapabilitiesRequestInput = z.input<
  typeof availableCapabilitiesRequestSchema
>;

type AssertTrue<T extends true> = T;
type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _CapabilityTierExact = AssertTrue<
  IsExact<CapabilityTierInput, CapabilityTier>
>;
type _PlatformCapabilityStatusExact = AssertTrue<
  IsExact<PlatformCapabilityStatusInput, PlatformCapabilityStatus>
>;
type _InstallCapabilityRequestExact = AssertTrue<
  IsExact<InstallCapabilityRequestInput, InstallCapabilityRequest>
>;
type _ToggleCapabilityRequestExact = AssertTrue<
  IsExact<ToggleCapabilityRequestInput, ToggleCapabilityRequest>
>;
type _UpdateCapabilitySettingsRequestExact = AssertTrue<
  IsExact<UpdateCapabilitySettingsRequestInput, UpdateCapabilitySettingsRequest>
>;
type _UpdateInstalledCapabilityRequestCompatible = AssertTrue<
  IsExact<
    UpdateInstalledCapabilityRequestInput,
    {
      organization_id?: string;
      capability_id: string;
      enabled?: boolean;
      settings?: Record<string, unknown>;
      system_id?: string;
    }
  >
>;
type _DeleteCapabilityRequestExact = AssertTrue<
  IsExact<DeleteCapabilityRequestInput, DeleteCapabilityRequest>
>;
type _AvailableCapabilitiesRequestExact = AssertTrue<
  IsExact<AvailableCapabilitiesRequestInput, AvailableCapabilitiesRequest>
>;
