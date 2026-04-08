import { z } from 'zod';

export const SelfRegistrationInputSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  companyName: z.string().min(2).max(150),
  trialDays: z.number().int().min(1).max(60).default(15),
});

export type SelfRegistrationInput = z.infer<typeof SelfRegistrationInputSchema>;

export interface SelfRegistrationResult {
  success: true;
  userId: string;
  organizationId: string;
  customToken: string;
  trialEndsAt: Date;
}

export interface SelfRegistrationError {
  success: false;
  error: string;
  code: 'email_exists' | 'validation_error' | 'internal_error';
}
