import { z } from 'zod';

export const createProgramSchema = z.object({
  name: z.string().min(2, 'Program name is required').max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  scopeRules: z.string().min(5, 'Scope rules or authorization guidelines are required'),
});

export const updateProgramSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  scopeRules: z.string().min(5).optional(),
  isArchived: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Valid user email required').toLowerCase().trim(),
  role: z.enum(['LEAD_ANALYST', 'ANALYST', 'VIEWER', 'AUDITOR']).default('ANALYST'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['LEAD_ANALYST', 'ANALYST', 'VIEWER', 'AUDITOR']),
});

export const createTargetSchema = z.object({
  name: z.string().min(2, 'Target name is required').max(100),
  primaryDomain: z.string().min(3, 'Primary root domain is required').trim(),
  description: z.string().optional(),
  subdomainScope: z.union([z.array(z.string()), z.string()]).optional(),
  ipRanges: z.union([z.array(z.string()), z.string()]).optional(),
  inScope: z.boolean().default(true),
  allowedTechniques: z.string().optional(),
  authorizationConfirmed: z.boolean().refine((val) => val === true, {
    message: 'Explicit authorization confirmation is required before reconnaissance',
  }),
});

export const updateTargetSchema = createTargetSchema.partial();
