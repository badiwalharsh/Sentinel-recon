import { z } from 'zod';

export const intelligenceSourceTypeEnum = z.enum([
  'NEWS',
  'BLOG',
  'FORUM',
  'CODE',
  'DOCUMENT',
  'BREACH',
  'OTHER',
]);

export const securityRelevanceEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const searchIntelligenceSchema = z.object({
  targetId: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  orgName: z.string().optional().nullable(),
  query: z.string().min(1, 'Search query is required').trim(),
  queryTemplate: z.string().optional().nullable(),
  sourceType: intelligenceSourceTypeEnum.optional().nullable(),
  saveResults: z.boolean().optional().default(true),
});

export const batchRunQueriesSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  queryIds: z.array(z.string()).optional(),
});

export const createIntelligenceSourceSchema = z.object({
  name: z.string().min(2, 'Source name is required').trim(),
  type: intelligenceSourceTypeEnum.default('OTHER'),
  baseURL: z.string().url().optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateIntelligenceSourceSchema = createIntelligenceSourceSchema.partial();

export const attachIntelligenceSchema = z.object({
  osintRecordId: z.string().min(1, 'OSINT record ID is required'),
  phaseId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
