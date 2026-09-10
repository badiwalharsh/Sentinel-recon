import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const PERSISTENCE_DIR = path.join(process.cwd(), 'storage');
const PERSISTENCE_FILE = path.join(PERSISTENCE_DIR, 'db-state.json');


export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  systemRole: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'AUDITOR';
  isActive: boolean;
  twoFactorEnabled: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  tokenVersion: number;
  emailVerified?: string | null;
  verificationToken?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordTokenExpires?: string | null;
  createdAt: string;
}

export interface MockProgram {
  id: string;
  name: string;
  slug: string;
  description: string;
  scopeRules: string;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  memberships: {
    id: string;
    userId: string;
    role: 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR';
  }[];
}

export interface MockTarget {
  id: string;
  programId: string;
  name: string;
  primaryDomain: string;
  description: string;
  subdomainScope?: string[];
  ipRanges?: string[];
  inScope?: boolean;
  allowedTechniques?: string;
  authorizationConfirmed: boolean;
  createdAt: string;
}

export interface MockAsset {
  id: string;
  programId: string;
  targetId: string | null;
  parentId: string | null;
  type: string;
  value: string;
  confidence: number;
  inScope: boolean;
  source?: string;
  tags: string[];
  metadata: Record<string, any>;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export type IntelligenceSourceType = 'NEWS' | 'BLOG' | 'FORUM' | 'CODE' | 'DOCUMENT' | 'BREACH' | 'OTHER';
export type SecurityRelevanceType = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MockOSINTRecord {
  id: string;
  programId: string;
  targetId: string | null;
  assetId: string | null;
  title?: string | null;
  type: string;
  source: string;
  url?: string | null;
  rawData: any;
  summary: string;
  securityRelevance: 'LOW' | 'MEDIUM' | 'HIGH' | number; // Low, Medium, High or numeric
  tags: string[];
  extractedEntities?: {
    domains?: string[];
    emails?: string[];
    ips?: string[];
    technologies?: string[];
    people?: string[];
    [key: string]: any;
  } | null;
  collectedAt: string;
}

export interface MockIntelligenceSource {
  id: string;
  programId: string;
  name: string;
  type: IntelligenceSourceType;
  baseURL?: string | null;
  config?: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MockIntelligenceQuery {
  id: string;
  programId: string;
  targetId: string | null;
  queryTemplate: string;
  queryString: string;
  lastRunAt: string | null;
  resultCount: number;
  results?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface MockReconPhase {
  id: string;
  programId: string;
  targetId: string | null;
  name: string;
  orderIndex: number;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockTask {
  id: string;
  programId: string;
  targetId?: string | null;
  phaseId?: string;
  phaseName?: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  assignedToId?: string | null;
  assignedToName?: string;
  dueDate?: string | null;
  evidenceCount?: number;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockEvidence {
  id: string;
  programId: string;
  targetId?: string | null;
  assetId?: string | null;
  findingId?: string | null;
  taskId?: string | null;
  title: string;
  type: string; // 'IMAGE' | 'HTTP_RESPONSE' | 'LOG' | 'DOCUMENT' | 'JSON_OUTPUT' | 'OTHER'
  content?: string | null;
  storagePath?: string | null;
  metadata?: {
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    sha256?: string;
    [key: string]: any;
  } | null;
  uploadedBy?: string;
  uploadedById?: string;
  createdAt: string;
}

export interface MockFinding {
  id: string;
  programId: string;
  targetId: string | null;
  assetId: string | null;
  affectedAssetIds?: string[];
  evidenceIds?: string[];
  authorId: string;
  authorName?: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'DRAFT' | 'CONFIRMED' | 'REPORTED' | 'REMEDIATED' | 'FALSE_POSITIVE';
  description: string;
  impact: string;
  remediation: string;
  cveId?: string;
  cvssScore?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MockAuditLog {
  id: string;
  programId: string | null;
  userId: string | null;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: string;
}

// Initial state
class MemoryDataStore {
  users: MockUser[] = [];
  programs: MockProgram[] = [];
  targets: MockTarget[] = [];
  assets: MockAsset[] = [];
  osintRecords: MockOSINTRecord[] = [];
  intelligenceSources: MockIntelligenceSource[] = [];
  intelligenceQueries: MockIntelligenceQuery[] = [];
  phases: MockReconPhase[] = [];
  tasks: MockTask[] = [];
  evidence: MockEvidence[] = [];
  findings: MockFinding[] = [];
  auditLogs: MockAuditLog[] = [];

  constructor() {
    const loaded = this.load();
    if (!loaded) {
      this.seed();
      this.save();
    }
  }

  public persist() {
    this.save();
  }

  public sync(): boolean {
    return this.load();
  }

  public save() {
    try {
      if (!fs.existsSync(PERSISTENCE_DIR)) {
        fs.mkdirSync(PERSISTENCE_DIR, { recursive: true });
      }
      const state = {
        users: this.users,
        programs: this.programs,
        targets: this.targets,
        assets: this.assets,
        osintRecords: this.osintRecords,
        intelligenceSources: this.intelligenceSources,
        intelligenceQueries: this.intelligenceQueries,
        phases: this.phases,
        tasks: this.tasks,
        evidence: this.evidence,
        findings: this.findings,
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      // In read-only or sandboxed serverless instances, memory persistence remains active
    }
  }

  public load(): boolean {
    try {
      if (fs.existsSync(PERSISTENCE_FILE)) {
        const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const state = JSON.parse(raw);
          if (Array.isArray(state.users) && state.users.length > 0) {
            this.users = state.users;
            if (Array.isArray(state.programs)) this.programs = state.programs;
            if (Array.isArray(state.targets)) this.targets = state.targets;
            if (Array.isArray(state.assets)) this.assets = state.assets;
            if (Array.isArray(state.osintRecords)) this.osintRecords = state.osintRecords;
            if (Array.isArray(state.intelligenceSources)) this.intelligenceSources = state.intelligenceSources;
            if (Array.isArray(state.intelligenceQueries)) this.intelligenceQueries = state.intelligenceQueries;
            if (Array.isArray(state.phases)) this.phases = state.phases;
            if (Array.isArray(state.tasks)) this.tasks = state.tasks;
            if (Array.isArray(state.evidence)) this.evidence = state.evidence;
            if (Array.isArray(state.findings)) this.findings = state.findings;
            if (Array.isArray(state.auditLogs)) this.auditLogs = state.auditLogs;

            this.ensureAdminInLoadedState();
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('[DataStore] Notice: initializing fresh storage baseline.');
    }
    return false;
  }

  private ensureAdminInLoadedState() {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@reconflow.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ReconFlow2026!';
    const hasAdmin = this.users.some((u) => u.systemRole === 'ADMIN' || u.email.toLowerCase() === adminEmail);
    if (!hasAdmin) {
      const adminHash = bcrypt.hashSync(adminPassword, 10);
      const now = new Date().toISOString();
      const adminUser: MockUser = {
        id: 'usr_admin_bootstrap',
        email: adminEmail,
        name: 'System Administrator (SecOps)',
        passwordHash: adminHash,
        systemRole: 'ADMIN',
        isActive: true,
        emailVerified: now,
        twoFactorEnabled: false,
        failedLoginCount: 0,
        lockedUntil: null,
        tokenVersion: 1,
        createdAt: now,
      };
      this.users.unshift(adminUser);
    }
  }

  private seed() {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@reconflow.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ReconFlow2026!';
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    const now = new Date().toISOString();

    const adminUser: MockUser = {
      id: 'usr_admin_bootstrap',
      email: adminEmail,
      name: 'System Administrator (SecOps)',
      passwordHash: adminHash,
      systemRole: 'ADMIN',
      isActive: true,
      emailVerified: now,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now,
    };

    const uAdmin = adminUser;
    const uAnalyst = adminUser;

    this.users = [adminUser];

    const p1: MockProgram = {
      id: 'prog_apex_01',
      name: 'Apex Financial Threat Surface Assessment',
      slug: 'apex-financial',
      description:
        'Comprehensive external perimeter reconnaissance and attack surface mapping for Apex Financial Core Infrastructure.',
      scopeRules:
        'IN SCOPE: *.apexfin.internal, *.apex-vault.io, AS65421 IP range 198.51.100.0/24.\nOUT OF SCOPE: Third-party payment gateways, employee personal devices, physical facilities.',
      isArchived: false,
      createdById: adminUser.id,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      memberships: [
        { id: 'm_1', userId: adminUser.id, role: 'LEAD_ANALYST' },
      ],
    };

    const p2: MockProgram = {
      id: 'prog_helios_02',
      name: 'Helios Cloud Infrastructure Audit',
      slug: 'helios-cloud',
      description: 'Authorized passive intelligence gathering for Helios multi-cloud microservices and Kubernetes clusters.',
      scopeRules: 'IN SCOPE: *.helios-cloud.net, cloud assets under AWS US-East-1.',
      isArchived: false,
      createdById: uAdmin.id,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      memberships: [
        { id: 'm_4', userId: uAdmin.id, role: 'LEAD_ANALYST' },
        { id: 'm_5', userId: uAnalyst.id, role: 'ANALYST' },
      ],
    };

    this.programs = [p1, p2];

    // Targets
    const t1: MockTarget = {
      id: 'tgt_01',
      programId: p1.id,
      name: 'Apex Core Gateway',
      primaryDomain: 'apex-vault.io',
      description: 'Customer facing authentication gateway and API clusters',
      subdomainScope: ['api.apex-vault.io', 'auth.apex-vault.io', 'staging-k8s.apex-vault.io'],
      ipRanges: ['198.51.100.0/24'],
      inScope: true,
      allowedTechniques: 'Passive DNS, Certificate Transparency, HTTP Headers, Tech Fingerprinting. Aggressive port scans prohibited.',
      authorizationConfirmed: true,
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    };

    const t2: MockTarget = {
      id: 'tgt_02',
      programId: p1.id,
      name: 'Apex Internal Corporate',
      primaryDomain: 'apexfin.internal',
      description: 'Corporate DNS and employee portal endpoints',
      subdomainScope: ['portal.apexfin.internal', 'mail.apexfin.internal'],
      ipRanges: ['10.0.0.0/16'],
      inScope: true,
      allowedTechniques: 'Passive WHOIS, Zone enumeration, Document metadata scraping.',
      authorizationConfirmed: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    };

    this.targets = [t1, t2];

    // Assets
    this.assets = [
      {
        id: 'ast_01',
        programId: p1.id,
        targetId: t1.id,
        parentId: null,
        type: 'ROOT_DOMAIN',
        value: 'apex-vault.io',
        confidence: 100,
        inScope: true,
        source: 'Scope Manifest',
        tags: ['Primary', 'Production', 'FinTech'],
        metadata: { registrar: 'MarkMonitor', dnssec: true, nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'] },
        firstSeenAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_02',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_01',
        type: 'SUBDOMAIN',
        value: 'api.apex-vault.io',
        confidence: 100,
        inScope: true,
        source: 'crt.sh',
        tags: ['API', 'REST', 'Kubernetes'],
        metadata: { server: 'nginx/1.24.0', status: 200, tls: 'TLS 1.3', cdn: 'Cloudflare', ipAddress: '198.51.100.42' },
        firstSeenAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_03',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_01',
        type: 'SUBDOMAIN',
        value: 'auth.apex-vault.io',
        confidence: 100,
        inScope: true,
        source: 'crt.sh',
        tags: ['OAuth2', 'Keycloak', 'High-Value'],
        metadata: { server: 'Keycloak 22.0', status: 200, tls: 'TLS 1.3', ipAddress: '198.51.100.43' },
        firstSeenAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_04',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_01',
        type: 'SUBDOMAIN',
        value: 'staging-k8s.apex-vault.io',
        confidence: 95,
        inScope: true,
        source: 'crt.sh',
        tags: ['Staging', 'Exposed', 'K8s Dashboard'],
        metadata: { server: 'nginx', status: 401, tls: 'TLS 1.2', certIssuer: "Let's Encrypt", ipAddress: '198.51.100.45' },
        firstSeenAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_05',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_02',
        type: 'IP_ADDRESS',
        value: '198.51.100.42',
        confidence: 100,
        inScope: true,
        source: 'Cloudflare DNS (A Record)',
        tags: ['Cloud', 'AWS-EC2', 'Public-IP'],
        metadata: { asn: 'AS65421', region: 'us-east-1', isp: 'Amazon.com', linkedSubdomain: 'api.apex-vault.io' },
        firstSeenAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_06',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_02',
        type: 'SERVICE',
        value: 'HTTPS / 443 (HTTP/2)',
        confidence: 100,
        inScope: true,
        source: 'HTTP Banner Analysis',
        tags: ['Web', 'Encrypted', 'TLS'],
        metadata: { port: 443, proto: 'tcp', service: 'https', banner: 'HTTP/2 200 OK', host: 'api.apex-vault.io' },
        firstSeenAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_07',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_02',
        type: 'ENDPOINT',
        value: '/api/v2/transactions/export',
        confidence: 90,
        inScope: true,
        source: 'Wayback Archive CDX',
        tags: ['PII', 'Financial', 'High-Risk'],
        metadata: { method: 'POST', authRequired: true, rateLimit: '100/min', host: 'api.apex-vault.io' },
        firstSeenAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_08',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_07',
        type: 'PARAMETER',
        value: 'format=csv&account_id=AC_9921',
        confidence: 85,
        inScope: true,
        source: 'Wayback Archive CDX',
        tags: ['Export', 'IDOR-Risk', 'Query-Param'],
        metadata: { paramNames: ['format', 'account_id'], endpoint: '/api/v2/transactions/export' },
        firstSeenAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_09',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_02',
        type: 'TECHNOLOGY',
        value: 'Nginx 1.24.0 (Ubuntu)',
        confidence: 95,
        inScope: true,
        source: 'HTTP Server Header',
        tags: ['Web-Server', 'Version-Detected'],
        metadata: { category: 'Web Server', detectedOn: 'api.apex-vault.io', header: 'Server' },
        firstSeenAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_10',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_03',
        type: 'TECHNOLOGY',
        value: 'Keycloak IAM 22.0',
        confidence: 90,
        inScope: true,
        source: 'HTTP Cookie & Header Signature',
        tags: ['IAM', 'SSO', 'OAuth2'],
        metadata: { category: 'Identity Provider', detectedOn: 'auth.apex-vault.io' },
        firstSeenAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ast_11',
        programId: p1.id,
        targetId: t1.id,
        parentId: 'ast_01',
        type: 'CERTIFICATE',
        value: 'CN=*.apex-vault.io (Valid until Dec 2026)',
        confidence: 100,
        inScope: true,
        source: 'crt.sh Certificate Transparency',
        tags: ['Wildcard', 'DigiCert', 'TLS-Cert'],
        metadata: { issuer: 'DigiCert Global Root G2', sanCount: 8, keySize: 2048, sans: ['apex-vault.io', '*.apex-vault.io', 'api.apex-vault.io'] },
        firstSeenAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // OSINT Records & Threat Intelligence
    this.osintRecords = [
      {
        id: 'osint_01',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_04',
        title: 'Exposed Staging Kubernetes Subdomain in Certificate Log',
        type: 'CERT_TRANSPARENCY',
        source: 'crt.sh (Certificate Transparency Log)',
        url: 'https://crt.sh/?q=%25.apex-vault.io',
        rawData: {
          issuer: "Let's Encrypt Authority X3",
          entryTimestamp: '2026-08-12T14:22:00Z',
          sanList: ['staging-k8s.apex-vault.io', 'dev-vault.apex-vault.io'],
        },
        summary:
          'Certificate Transparency log entry uncovered unlisted pre-production subdomain `staging-k8s.apex-vault.io` with active TLS certificate.',
        securityRelevance: 'HIGH',
        tags: ['CT-Log', 'Subdomain-Discovery', 'Pre-Production', 'Kubernetes'],
        extractedEntities: {
          domains: ['staging-k8s.apex-vault.io', 'dev-vault.apex-vault.io'],
          technologies: ['Kubernetes', "Let's Encrypt"],
        },
        collectedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'osint_02',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_02',
        title: 'Detailed Server Banner & Technology Fingerprint in HTTP Headers',
        type: 'TECH_FINGERPRINT',
        source: 'Passive HTTP Header Fingerprint',
        url: 'https://api.apex-vault.io',
        rawData: {
          server: 'nginx/1.24.0 (Ubuntu)',
          'x-powered-by': 'Express',
          'strict-transport-security': 'max-age=31536000; includeSubDomains',
        },
        summary: 'Target exposes specific Nginx and Express versions in response headers. HSTS is strictly configured.',
        securityRelevance: 'MEDIUM',
        tags: ['Headers', 'Fingerprint', 'Nginx', 'Express'],
        extractedEntities: {
          technologies: ['Nginx 1.24.0', 'Express.js', 'Ubuntu'],
        },
        collectedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'osint_03',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_01',
        title: 'DNS Zone Configuration & Soft-Fail SPF Policy',
        type: 'DNS_RECORD',
        source: 'Cloudflare 1.1.1.1 DNS-over-HTTPS',
        url: 'https://cloudflare-dns.com/dns-query?name=apex-vault.io',
        rawData: {
          a: [{ name: 'apex-vault.io', type: 'A', data: '198.51.100.40', TTL: 300 }],
          mx: [{ name: 'apex-vault.io', type: 'MX', data: '10 aspmx.l.google.com', TTL: 3600 }],
          ns: [{ name: 'apex-vault.io', type: 'NS', data: 'ns1.cloudflare.com', TTL: 86400 }],
          txt: [
            'v=spf1 include:_spf.google.com include:mailgun.org ~all',
            'docusign=059f8101-1234-5678',
            'google-site-verification=abcde12345',
          ],
        },
        summary: 'SPF TXT records indicate third-party mail delegation to Google Workspace and Mailgun with soft-fail ~all.',
        securityRelevance: 'LOW',
        tags: ['DNS', 'SPF', 'Mail-Security', 'DoH'],
        extractedEntities: {
          ips: ['198.51.100.40'],
          domains: ['google.com', 'mailgun.org', 'cloudflare.com'],
          technologies: ['Google Workspace', 'Mailgun', 'Cloudflare DNS'],
        },
        collectedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: 'osint_04',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_01',
        title: 'WHOIS / RDAP Domain Ownership & Registrar Info',
        type: 'WHOIS',
        source: 'RDAP WHOIS Directory',
        url: 'https://rdap.org/domain/apex-vault.io',
        rawData: {
          domainName: 'apex-vault.io',
          registrar: 'MarkMonitor Inc.',
          creationDate: '2019-04-10T12:00:00Z',
          expirationDate: '2028-04-10T12:00:00Z',
          status: ['clientDeleteProhibited', 'clientTransferProhibited', 'clientUpdateProhibited'],
          nameServers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
          registrantOrg: 'Apex Financial Holdings LLC',
          registrantCountry: 'US',
        },
        summary: 'Domain registered via MarkMonitor Inc., renewed through April 2028 with full client registry locking enabled.',
        securityRelevance: 'LOW',
        tags: ['WHOIS', 'RDAP', 'Registration-Info'],
        extractedEntities: {
          people: ['MarkMonitor Domain Admin'],
          technologies: ['MarkMonitor'],
        },
        collectedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: 'osint_05',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_07',
        title: 'Wayback Machine Archived Swagger OpenAPI Specification',
        type: 'ARCHIVE_SNAPSHOT',
        source: 'Wayback Machine CDX API',
        url: 'https://web.archive.org/cdx/search/cdx?url=*.apex-vault.io/*',
        rawData: {
          urlCount: 14,
          sampleUrls: [
            'https://api.apex-vault.io/api/v2/transactions/export?format=csv',
            'https://auth.apex-vault.io/auth/realms/master/protocol/openid-connect/auth',
            'https://apex-vault.io/docs/v1/swagger.json',
          ],
        },
        summary: 'Historical Wayback index contains 14 archived endpoints including sensitive API export routes and OpenAPI swagger definitions.',
        securityRelevance: 'MEDIUM',
        tags: ['Wayback', 'Archives', 'Endpoint-Discovery', 'Swagger'],
        extractedEntities: {
          domains: ['api.apex-vault.io', 'auth.apex-vault.io'],
          technologies: ['OpenAPI / Swagger', 'Keycloak'],
        },
        collectedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'osint_06',
        programId: p1.id,
        targetId: t1.id,
        assetId: null,
        title: 'Public GitHub Repo Referencing Apex Vault Staging Infrastructure',
        type: 'CODE',
        source: 'GitHub Code Search',
        url: 'https://github.com/apex-devops-public/k8s-manifests/blob/main/staging/ingress.yaml',
        rawData: {
          repo: 'apex-devops-public/k8s-manifests',
          file: 'staging/ingress.yaml',
          matchedKeywords: ['staging-k8s.apex-vault.io', 'JWT_SECRET_STAGING_BAK'],
        },
        summary: 'Public GitHub repository contains Kubernetes ingress configuration referencing staging-k8s.apex-vault.io with sample staging environment variables.',
        securityRelevance: 'HIGH',
        tags: ['GitHub', 'Code-Leak', 'Kubernetes', 'Staging'],
        extractedEntities: {
          domains: ['staging-k8s.apex-vault.io'],
          emails: ['devops-lead@apexfin.internal'],
          technologies: ['Kubernetes Ingress', 'YAML', 'Docker'],
          people: ['Marcus Vance'],
        },
        collectedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'osint_07',
        programId: p1.id,
        targetId: t1.id,
        assetId: null,
        title: 'Historical Third-Party Data Breach Credential Exposure',
        type: 'BREACH',
        source: 'Breach Directory & Darknet Indices',
        url: 'https://haveibeenpwned.com/api/v3/breachedaccount/apex-vault.io',
        rawData: {
          breachName: 'Corporate Third-Party SaaS Breach (2023)',
          compromisedAccounts: 4,
          domainMatch: 'apexfin.internal',
        },
        summary: '4 historical employee credential hashes detected in compilation dump from third-party vendor compromise.',
        securityRelevance: 'HIGH',
        tags: ['Breach', 'Credential-Exposure', 'Darknet', 'SaaS'],
        extractedEntities: {
          emails: ['j.doe@apexfin.internal', 'admin-support@apexfin.internal'],
          people: ['John Doe'],
        },
        collectedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'osint_08',
        programId: p1.id,
        targetId: t1.id,
        assetId: null,
        title: 'Apex Financial Job Posting: Senior Cloud Architect',
        type: 'DOCUMENT',
        source: 'Public Recruitment & Careers Board',
        url: 'https://careers.apexfinancial.com/jobs/cloud-architect-2026',
        rawData: {
          jobTitle: 'Senior Cloud Security Architect',
          location: 'New York / Hybrid',
          descriptionSnippet: 'Experience managing AWS EKS, HashiCorp Vault enterprise, Envoy proxy, and PostgreSQL multi-region clusters.',
        },
        summary: 'Recruitment posting discloses internal tech stack details: AWS EKS, HashiCorp Vault, Envoy gateway, and PostgreSQL RDS.',
        securityRelevance: 'MEDIUM',
        tags: ['Job-Posting', 'Tech-Stack', 'Infrastructure', 'AWS'],
        extractedEntities: {
          technologies: ['AWS EKS', 'HashiCorp Vault', 'Envoy Proxy', 'PostgreSQL'],
          people: ['Apex Talent Acquisition'],
        },
        collectedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];

    // Predefined Intelligence Sources
    this.intelligenceSources = [
      {
        id: 'src_01',
        programId: p1.id,
        name: 'GitHub Public Code Search',
        type: 'CODE',
        baseURL: 'https://api.github.com/search/code',
        config: { rateLimitRpm: 30, searchQualifiers: 'language:yaml,json,env' },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'src_02',
        programId: p1.id,
        name: 'Pastebin & Leak Paste Aggregators',
        type: 'FORUM',
        baseURL: 'https://psbdmp.ws/api/search',
        config: { scanDepth: 'deep' },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'src_03',
        programId: p1.id,
        name: 'HaveIBeenPwned & Breach Compilation Index',
        type: 'BREACH',
        baseURL: 'https://haveibeenpwned.com/api/v3',
        config: { includeUnverified: true },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'src_04',
        programId: p1.id,
        name: 'Cyber Threat Intelligence & News Feeds',
        type: 'NEWS',
        baseURL: 'https://nvd.nist.gov/vuln/data-feeds',
        config: { keywords: ['vulnerability', 'exploit', 'zero-day'] },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'src_05',
        programId: p1.id,
        name: 'Public Document & Tech Spec Indices',
        type: 'DOCUMENT',
        baseURL: 'https://api.duckduckgo.com',
        config: { filetypes: ['pdf', 'docx', 'xlsx', 'json'] },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Predefined Intelligence Queries
    this.intelligenceQueries = [
      {
        id: 'iq_01',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: '{{domain}} data breach',
        queryString: 'apex-vault.io data breach',
        lastRunAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        resultCount: 1,
        results: { matched: 1 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_02',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: '{{domain}} api key',
        queryString: 'apex-vault.io api key',
        lastRunAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        resultCount: 1,
        results: { matched: 1 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_03',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: 'site:github.com {{domain}}',
        queryString: 'site:github.com apex-vault.io',
        lastRunAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        resultCount: 1,
        results: { matched: 1 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_04',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: 'site:pastebin.com {{domain}}',
        queryString: 'site:pastebin.com apex-vault.io',
        lastRunAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        resultCount: 0,
        results: { matched: 0 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_05',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: '{{org}} job',
        queryString: 'Apex Financial job',
        lastRunAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        resultCount: 1,
        results: { matched: 1 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_06',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: '{{domain}} config',
        queryString: 'apex-vault.io config',
        lastRunAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        resultCount: 1,
        results: { matched: 1 },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'iq_07',
        programId: p1.id,
        targetId: t1.id,
        queryTemplate: '{{domain}} backup',
        queryString: 'apex-vault.io backup',
        lastRunAt: null,
        resultCount: 0,
        results: null,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // =============================================================
    // 10 PREDEFINED RECON METHODOLOGY PHASES (FOR TARGET T1)
    // =============================================================
    this.phases = [
      {
        id: 'ph_01',
        programId: p1.id,
        targetId: t1.id,
        name: 'Asset Discovery',
        orderIndex: 1,
        status: 'COMPLETED',
        description: 'Initial scope enumeration, root domain identification, and ASN mapping.',
        notes: 'Identified apex-vault.io root, primary cloud IP ranges (198.51.100.0/24), and AWS AS65421 perimeter.',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_02',
        programId: p1.id,
        targetId: t1.id,
        name: 'Subdomain Enumeration',
        orderIndex: 2,
        status: 'COMPLETED',
        description: 'Passive & active subdomain enumeration, certificate transparency mining, and permutation analysis.',
        notes: 'Queried Certificate Transparency logs (crt.sh). Discovered api, auth, and staging-k8s subdomains.',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_03',
        programId: p1.id,
        targetId: t1.id,
        name: 'DNS & Network Mapping',
        orderIndex: 3,
        status: 'COMPLETED',
        description: 'Comprehensive DNS zone record enumeration (A, AAAA, MX, TXT, NS, CNAME) and SPF/DMARC policy validation.',
        notes: 'DoH queries completed. Identified soft-fail ~all on SPF TXT records for apex-vault.io.',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_04',
        programId: p1.id,
        targetId: t1.id,
        name: 'Service & Port Enumeration',
        orderIndex: 4,
        status: 'IN_PROGRESS',
        description: 'Authorized non-intrusive service detection, banner analysis, and TLS cipher suite verification.',
        notes: 'HTTPS/443 validated on api.apex-vault.io. Investigating exposed ingress port on staging-k8s.apex-vault.io.',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_05',
        programId: p1.id,
        targetId: t1.id,
        name: 'Web App Crawling',
        orderIndex: 5,
        status: 'TODO',
        description: 'Spidering target web applications, mapping site structure, and discovering hidden directories.',
        notes: 'Awaiting completion of staging perimeter triage before automated crawler execution.',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_06',
        programId: p1.id,
        targetId: t1.id,
        name: 'Endpoint & Parameter Discovery',
        orderIndex: 6,
        status: 'IN_PROGRESS',
        description: 'Mining API endpoints, REST route parameters, and hidden query inputs.',
        notes: 'Wayback Machine extracted 14 historical endpoints including `/api/v2/transactions/export?format=csv`.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_07',
        programId: p1.id,
        targetId: t1.id,
        name: 'JavaScript Analysis',
        orderIndex: 7,
        status: 'TODO',
        description: 'Analyzing client-side JavaScript bundles, unpacking Webpack chunks, and searching for leaked API keys.',
        notes: 'Scheduled for Next.js and Keycloak client frontend bundles.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_08',
        programId: p1.id,
        targetId: t1.id,
        name: 'Archive & Backup Hunting',
        orderIndex: 8,
        status: 'COMPLETED',
        description: 'Searching historical Wayback snapshots, GitHub dorks, and old sitemaps for exposed credentials and backups.',
        notes: 'Archived swagger/OpenAPI definitions found at /docs/v1/swagger.json.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_09',
        programId: p1.id,
        targetId: t1.id,
        name: 'Cloud Asset Discovery',
        orderIndex: 9,
        status: 'TODO',
        description: 'Discovering associated AWS S3 buckets, Azure Blob containers, and public serverless endpoints.',
        notes: 'Targeting potential bucket names `apex-vault-prod`, `apexfin-backups`.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ph_10',
        programId: p1.id,
        targetId: t1.id,
        name: 'People & Org OSINT',
        orderIndex: 10,
        status: 'TODO',
        description: 'Analyzing corporate organization structure, developer social footprints, and repository commits.',
        notes: 'Passive developer GitHub footprint search pending.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Structured Tasks linked to Phases
    this.tasks = [
      {
        id: 'tsk_01',
        programId: p1.id,
        targetId: t1.id,
        phaseId: 'ph_02',
        phaseName: 'Subdomain Enumeration',
        title: 'Query Certificate Transparency logs for apex-vault.io',
        description: 'Enumerate all historical SAN wildcards and staging subdomains via crt.sh and AlienVault.',
        status: 'COMPLETED',
        assignedToId: uAnalyst.id,
        assignedToName: uAnalyst.name,
        evidenceCount: 1,
        completedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk_02',
        programId: p1.id,
        targetId: t1.id,
        phaseId: 'ph_03',
        phaseName: 'DNS & Network Mapping',
        title: 'Enumerate public DNS zone records (A, AAAA, MX, TXT, SOA)',
        description: 'Verify SPF, DMARC, DKIM, and sub-delegation records for apex-vault.io.',
        status: 'COMPLETED',
        assignedToId: uAnalyst.id,
        assignedToName: uAnalyst.name,
        evidenceCount: 1,
        completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk_03',
        programId: p1.id,
        targetId: t1.id,
        phaseId: 'ph_04',
        phaseName: 'Service & Port Enumeration',
        title: 'Map exposed Kubernetes ingress controller & staging instances',
        description: 'Analyze HTTP basic auth headers on staging-k8s.apex-vault.io and inspect SSL issuer.',
        status: 'IN_PROGRESS',
        assignedToId: uAnalyst.id,
        assignedToName: uAnalyst.name,
        evidenceCount: 1,
        completedAt: null,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk_04',
        programId: p1.id,
        targetId: t1.id,
        phaseId: 'ph_06',
        phaseName: 'Endpoint & Parameter Discovery',
        title: 'Review Keycloak 22.0 authentication endpoints for known CVEs',
        description: 'Check auth.apex-vault.io for open redirect or misconfigured token exchange protocols.',
        status: 'IN_PROGRESS',
        assignedToId: uAdmin.id,
        assignedToName: uAdmin.name,
        evidenceCount: 0,
        completedAt: null,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk_05',
        programId: p1.id,
        targetId: t1.id,
        phaseId: 'ph_08',
        phaseName: 'Archive & Backup Hunting',
        title: 'Extract historical endpoints from Wayback Machine CDX API',
        description: 'Query CDX API for archived OpenAPI / Swagger JSON routes and backup files.',
        status: 'COMPLETED',
        assignedToId: uAnalyst.id,
        assignedToName: uAnalyst.name,
        evidenceCount: 1,
        completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Evidence
    this.evidence = [
      {
        id: 'ev_01',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_04',
        findingId: 'fnd_01',
        taskId: 'tsk_03',
        title: 'HTTP 401 Basic Auth Header & Banner on Staging Ingress',
        type: 'HTTP_RESPONSE',
        content:
          'HTTP/1.1 401 Unauthorized\r\nServer: nginx\r\nDate: Tue, 01 Sep 2026 14:10:00 GMT\r\nContent-Type: text/html\r\nWWW-Authenticate: Basic realm="Kubernetes Ingress Controller - Staging"\r\nConnection: keep-alive',
        storagePath: null,
        metadata: {
          mimeType: 'text/plain',
          statusCode: 401,
          endpoint: 'https://staging-k8s.apex-vault.io/',
        },
        uploadedBy: uAnalyst.name,
        uploadedById: uAnalyst.id,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'ev_02',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_02',
        findingId: 'fnd_02',
        taskId: 'tsk_01',
        title: 'Nginx 1.24.0 Server Header Response Dump',
        type: 'HTTP_RESPONSE',
        content:
          'HTTP/2 200 OK\r\nserver: nginx/1.24.0 (Ubuntu)\r\nx-powered-by: Express\r\nstrict-transport-security: max-age=31536000; includeSubDomains\r\ncontent-type: application/json; charset=utf-8',
        storagePath: null,
        metadata: {
          mimeType: 'text/plain',
          host: 'api.apex-vault.io',
        },
        uploadedBy: uAnalyst.name,
        uploadedById: uAnalyst.id,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'ev_03',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_01',
        findingId: 'fnd_03',
        taskId: 'tsk_02',
        title: 'Cloudflare DNS TXT Record for SPF Soft-Fail',
        type: 'LOG',
        content:
          'apex-vault.io. 300 IN TXT "v=spf1 include:_spf.google.com include:mailgun.org ~all"\r\napex-vault.io. 300 IN TXT "docusign=059f8101-1234-5678"',
        storagePath: null,
        metadata: {
          resolver: '1.1.1.1',
          recordType: 'TXT',
        },
        uploadedBy: uAdmin.name,
        uploadedById: uAdmin.id,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ];

    // Findings
    this.findings = [
      {
        id: 'fnd_01',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_04',
        affectedAssetIds: ['ast_04'],
        evidenceIds: ['ev_01'],
        authorId: uAnalyst.id,
        authorName: uAnalyst.name,
        title: 'Publicly Accessible Staging Kubernetes Ingress with Basic Authentication',
        severity: 'HIGH',
        status: 'CONFIRMED',
        description:
          'The pre-production staging cluster `staging-k8s.apex-vault.io` is directly routable from the public internet. While HTTP basic auth is active, brute-force rate-limiting, IP whitelisting, and Zero-Trust SSO controls are absent.',
        impact:
          'Adversaries could conduct offline dictionary attacks against basic auth credentials to gain administrative access to pre-release microservices, telemetry tokens, and staging databases.',
        remediation:
          '1. Restrict ingress access to corporate VPN CIDR blocks (10.0.0.0/8).\n2. Deploy Cloudflare Access Zero-Trust IdP protection with multi-factor authentication.',
        cveId: 'CWE-284',
        cvssScore: 7.8,
        notes: 'Analyst verified via cURL probe. Staging cluster is running Kubernetes v1.28.3.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fnd_02',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_02',
        affectedAssetIds: ['ast_02'],
        evidenceIds: ['ev_02'],
        authorId: uAnalyst.id,
        authorName: uAnalyst.name,
        title: 'Detailed Server Banner & Framework Exposure in HTTP Response Headers',
        severity: 'LOW',
        status: 'REPORTED',
        description:
          'The API gateway returns `Server: nginx/1.24.0 (Ubuntu)` and `X-Powered-By: Express` in HTTP responses, leaking software versions.',
        impact: 'Facilitates targeted exploit discovery against specific version vulnerabilities in Nginx and Express.',
        remediation:
          'Configure `server_tokens off;` in Nginx and execute `app.disable("x-powered-by")` in Express middleware.',
        cveId: 'CWE-200',
        cvssScore: 3.3,
        notes: 'Low risk info disclosure, documented for hardening standards.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fnd_03',
        programId: p1.id,
        targetId: t1.id,
        assetId: 'ast_03',
        affectedAssetIds: ['ast_01', 'ast_03'],
        evidenceIds: ['ev_03'],
        authorId: uAdmin.id,
        authorName: uAdmin.name,
        title: 'Permissive SPF Record with Soft-Fail (~all) Mail Policy',
        severity: 'MEDIUM',
        status: 'DRAFT',
        description:
          'The apex domain DNS TXT record for SPF uses `~all` instead of `-all`, allowing unauthenticated email spoofing to pass mail validation.',
        impact: 'Elevated risk of CEO fraud, spear-phishing, and domain impersonation attacks against clients.',
        remediation: 'Change SPF mechanism qualifier from `~all` (SoftFail) to `-all` (HardFail) and deploy DMARC `p=reject`.',
        cveId: 'CWE-346',
        cvssScore: 5.3,
        notes: 'Drafted by security admin. Pending customer DNS engineering team review.',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Audit logs
    this.auditLogs = [
      {
        id: 'aud_01',
        programId: p1.id,
        userId: uAdmin.id,
        userEmail: uAdmin.email,
        action: 'PROGRAM_CREATE',
        entityType: 'Program',
        entityId: p1.id,
        ipAddress: '198.51.100.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        details: { programName: p1.name, scopeDefined: true },
        timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'aud_02',
        programId: p1.id,
        userId: uAdmin.id,
        userEmail: uAdmin.email,
        action: 'MEMBERSHIP_ADD',
        entityType: 'ProgramMembership',
        entityId: 'm_2',
        ipAddress: '198.51.100.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        details: { assignedUser: uAnalyst.email, role: 'ANALYST' },
        timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'aud_03',
        programId: p1.id,
        userId: uAnalyst.id,
        userEmail: uAnalyst.email,
        action: 'OSINT_INGEST',
        entityType: 'OSINTRecord',
        entityId: 'osint_01',
        ipAddress: '198.51.100.33',
        userAgent: 'SentinelRecon-PassiveEngine/1.0',
        details: { source: 'crt.sh', subdomainsFound: 2 },
        timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'aud_04',
        programId: p1.id,
        userId: uAnalyst.id,
        userEmail: uAnalyst.email,
        action: 'FINDING_CREATE',
        entityType: 'Finding',
        entityId: 'fnd_01',
        ipAddress: '198.51.100.33',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        details: { title: 'Publicly Accessible Staging Kubernetes Ingress', severity: 'HIGH', cvss: 7.8 },
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];
  }
}

// Global memory singleton for instant, robust runtime
declare global {
  // eslint-disable-next-line no-var
  var __mockStore: MemoryDataStore | undefined;
}

const globalForStore = globalThis as unknown as { __mockStore?: MemoryDataStore };
export const dbStore = globalForStore.__mockStore || new MemoryDataStore();
globalForStore.__mockStore = dbStore;

