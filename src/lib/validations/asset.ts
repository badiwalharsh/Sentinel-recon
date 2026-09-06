import { z } from 'zod';

export const assetTypeEnum = z.enum([
  'ROOT_DOMAIN',
  'SUBDOMAIN',
  'IP_ADDRESS',
  'IP_RANGE',
  'SERVICE',
  'TECHNOLOGY',
  'ENDPOINT',
  'PARAMETER',
  'CERTIFICATE',
  'CLOUD_STORAGE',
]);

export const createAssetSchema = z.object({
  targetId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  type: assetTypeEnum,
  value: z.string().min(1, 'Asset value is required').trim(),
  confidence: z.number().int().min(0).max(100).default(100),
  inScope: z.boolean().default(true),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateAssetSchema = z.object({
  type: assetTypeEnum.optional(),
  value: z.string().min(1).trim().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  inScope: z.boolean().optional(),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const batchCreateAssetSchema = z.object({
  targetId: z.string().optional().nullable(),
  type: assetTypeEnum,
  values: z.array(z.string().min(1)).min(1, 'At least one asset value required'),
  inScope: z.boolean().default(true),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export const createOSINTRecordSchema = z.object({
  targetId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  type: z.enum([
    'DNS_RECORD',
    'WHOIS',
    'CERT_TRANSPARENCY',
    'ARCHIVE_SNAPSHOT',
    'TECH_FINGERPRINT',
    'LEAK_OR_BREACH_MENTION',
    'CODE_REPOSITORY',
    'DOCUMENT_METADATA',
  ]),
  source: z.string().min(1),
  url: z.string().optional().nullable(),
  rawData: z.any(),
  summary: z.string().min(1),
  securityRelevance: z.number().int().min(0).max(10).default(0),
  tags: z.array(z.string()).default([]),
  extractedEntities: z.any().optional().nullable(),
});
