import { z } from 'zod';

export const createFindingSchema = z.object({
  targetId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  affectedAssetIds: z.array(z.string()).optional().default([]),
  evidenceIds: z.array(z.string()).optional().default([]),
  title: z.string().min(3, 'Finding title is required').max(200).trim(),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  status: z.enum(['DRAFT', 'CONFIRMED', 'REPORTED', 'REMEDIATED', 'FALSE_POSITIVE']).default('DRAFT'),
  description: z.string().min(10, 'Detailed description is required'),
  impact: z.string().optional().nullable().default(''),
  remediation: z.string().optional().nullable().default(''),
  cveId: z.string().optional().nullable(),
  cvssScore: z.number().min(0.0).max(10.0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateFindingSchema = createFindingSchema.partial();
