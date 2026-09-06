import { z } from 'zod';

export const phaseStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']);
export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']);
export const evidenceTypeEnum = z.enum([
  'IMAGE',
  'HTTP_RESPONSE',
  'LOG',
  'DOCUMENT',
  'JSON_OUTPUT',
  'OTHER',
  'SCREENSHOT',
  'HTTP_REQUEST',
  'TERMINAL_LOG',
  'SCAN_REPORT',
  'RAW_DATA',
]);

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/json',
  'text/csv',
  'text/plain',
] as const;

export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const createPhaseSchema = z.object({
  targetId: z.string().optional().nullable(),
  name: z.string().min(1, 'Phase name is required').trim(),
  orderIndex: z.number().int().optional().default(0),
  status: phaseStatusEnum.default('TODO'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updatePhaseSchema = z.object({
  name: z.string().min(1).trim().optional(),
  orderIndex: z.number().int().optional(),
  status: phaseStatusEnum.optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createTaskSchema = z.object({
  targetId: z.string().optional().nullable(),
  phaseId: z.string().min(1, 'Phase ID is required'),
  phaseName: z.string().optional().nullable(),
  title: z.string().min(1, 'Task title is required').trim(),
  description: z.string().optional().nullable().default(''),
  status: taskStatusEnum.default('TODO'),
  assignedToId: z.string().optional().nullable(),
  assignedToName: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).trim().optional(),
  description: z.string().optional().nullable(),
  status: taskStatusEnum.optional(),
  assignedToId: z.string().optional().nullable(),
  assignedToName: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  phaseId: z.string().optional(),
});

export const createEvidenceSchema = z.object({
  targetId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  findingId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  type: evidenceTypeEnum.default('RAW_DATA'),
  content: z.string().optional().nullable(),
  storagePath: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const PREDEFINED_RECON_PHASES = [
  {
    name: 'Asset Discovery',
    description: 'Initial scope identification, root domain mapping, and IP address range reconnaissance.',
    defaultTasks: [
      'Define root domains, CIDR blocks, and organizational ASN',
      'Verify authorization attestation and rules of engagement',
      'Import existing seed assets and infrastructure inventory',
    ],
  },
  {
    name: 'Subdomain Enumeration',
    description: 'Passive & active subdomain enumeration, certificate transparency mining, and permutation analysis.',
    defaultTasks: [
      'Query crt.sh and Certificate Transparency logs',
      'Execute passive DoH subdomain queries',
      'Identify pre-production, staging, and internal subdomains',
    ],
  },
  {
    name: 'DNS & Network Mapping',
    description: 'DNS zone record auditing (A, AAAA, MX, TXT, NS, CNAME) and SPF/DMARC mail policy validation.',
    defaultTasks: [
      'Extract full DNS record zone map (A, MX, TXT, NS, SOA)',
      'Inspect SPF records for permissive soft-fail (~all) qualifiers',
      'Audit DMARC and DKIM alignment policies',
    ],
  },
  {
    name: 'Service & Port Enumeration',
    description: 'Non-intrusive port detection, HTTP/HTTPS banner extraction, and TLS protocol verification.',
    defaultTasks: [
      'Identify active web listeners on ports 80, 443, 8080, 8443',
      'Inspect SSL/TLS cipher suites and certificate validity dates',
      'Analyze server and proxy response headers',
    ],
  },
  {
    name: 'Web App Crawling',
    description: 'Application discovery, sitemap spidering, and frontend route indexing.',
    defaultTasks: [
      'Spider public endpoints and index single-page application routes',
      'Identify client-side authentication and OAuth redirect URIs',
      'Map static asset storage and API reverse proxy routes',
    ],
  },
  {
    name: 'Endpoint & Parameter Discovery',
    description: 'Mining REST endpoints, query parameters, and sensitive transaction interfaces.',
    defaultTasks: [
      'Query historical Wayback Machine CDX logs for forgotten endpoints',
      'Extract query parameters and test IDOR candidate routes',
      'Review OpenAPI / Swagger specifications and API documentation',
    ],
  },
  {
    name: 'JavaScript Analysis',
    description: 'Decompiling frontend JS bundles, unpacking Webpack chunks, and searching for API secrets.',
    defaultTasks: [
      'Extract embedded API keys, JWT secrets, and internal staging URLs',
      'Map hidden GraphQL schemas and undocumented REST endpoints',
      'Audit third-party script integrations and analytics trackers',
    ],
  },
  {
    name: 'Archive & Backup Hunting',
    description: 'Mining archive snapshots, Google/GitHub dorks, and backup file artifacts.',
    defaultTasks: [
      'Scan Wayback archive snapshots for exposed credentials and config files',
      'Check for accessible .git, .env, and database dump backups',
      'Review historical commit records for hardcoded secrets',
    ],
  },
  {
    name: 'Cloud Asset Discovery',
    description: 'Enumerating public cloud storage buckets, container registries, and serverless gateways.',
    defaultTasks: [
      'Check for exposed AWS S3 buckets and Azure Blob containers',
      'Audit public container registry tags and Kubernetes ingress controllers',
      'Verify IAM metadata service access protections',
    ],
  },
  {
    name: 'People & Org OSINT',
    description: 'Analyzing corporate structure, developer footprints, and breach database mentions.',
    defaultTasks: [
      'Map DevOps, engineering, and security team roles on LinkedIn',
      'Audit breach intelligence and corporate dump datasets',
      'Review public developer GitHub profiles for repository leaks',
    ],
  },
];
