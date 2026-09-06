# ReconFlow OSINT Workbench

**ReconFlow OSINT Workbench** is a centralized ethical-hacker reconnaissance platform for authorized targets. It unites asset discovery, passive OSINT collection, structured recon workflows, vulnerability findings management, target intelligence dork searching, Cytoscape relationship graphing, and executive reporting into a unified, security-first web application.

---

## 🔒 Non-Negotiable Security Principles

- **Zero Demo Accounts**: There are no hardcoded demo accounts, pre-fill buttons, or quick-login toolbars anywhere in the application.
- **Mandatory Registration & Email Verification**: All new security operators register via `/register` and verify their identity with a token via `/verify-email`.
- **Default Analyst Role**: All self-registered operator accounts default to the `ANALYST` role upon email verification.
- **Environment-Driven Initial Administrator Bootstrap**: On startup/first run, if no `ADMIN` account exists, the platform automatically bootstraps an initial administrator account using environment variables:
  - `ADMIN_EMAIL` (default: `admin@reconflow.local`)
  - `ADMIN_PASSWORD` (default: `Admin@ReconFlow2026!`)
- **Append-Only Immutable Audit Ledger**: Every operator authentication, role elevation, target scoping modification, OSINT ingestion, and intelligence search is recorded in an immutable ledger with client IP, timestamp, and JSON metadata. No deletion or mutation endpoints exist.
- **Program-Level Tenant Isolation**: Multi-tenant RBAC strictly prevents cross-program queries, IDOR access on evidence files, or unauthorized asset mutations.
- **Automated Secret Masking**: Credentials, API tokens, passwords, and private keys in reports and exports are automatically redacted (`sec••••••••[REDACTED]`).

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client["Browser Client / Security Operator"] -->|HTTPS| EdgeMiddleware["Next.js Edge Middleware<br/>(Route Protection & RBAC)"]
    EdgeMiddleware --> AppRouter["Next.js App Router (TypeScript / Tailwind CSS)"]
    
    subgraph ReconFlow Platform Core
        AppRouter --> AuthGuard["Session & Token Version Guard<br/>(Revocation upon Role Change)"]
        AuthGuard --> RateLimiter["Sliding-Window Rate Limiter<br/>(IP & User Throttling)"]
        RateLimiter --> APIRoutes["REST API Layer (/api/v1/*)"]
        
        APIRoutes --> IntelService["Target Intelligence & Google Dorking Engine<br/>(Entity Extraction & Security Relevance)"]
        APIRoutes --> ReportService["Executive Report Generator & Secret Masking<br/>(JSON, Markdown, Print Views)"]
        APIRoutes --> AuditLedger["Append-Only Audit Ledger"]
    end
    
    subgraph Data & Storage Layer
        IntelService --> DBStore["PostgreSQL + Prisma ORM / Reactive Store"]
        ReportService --> DBStore
        AuditLedger --> DBStore
        APIRoutes --> Storage["Evidence File Store (/storage/evidence)"]
    end
```

---

## 🚀 Key Modules & Capabilities

1. **Asset & OSINT Inventory**:
   - Subdomains, DNS records (A, AAAA, MX, TXT, SPF), IP CIDR blocks, web technologies, and HTTP services.
   - Strict in-scope boundary verification and owner authorization attestation.

2. **5-Phase Recon Methodology Workflow**:
   - Standardized lifecycle:
     - Phase 1: Scope & Authorization Verification
     - Phase 2: Passive OSINT & Intelligence Gathering
     - Phase 3: Active DNS & Network Mapping
     - Phase 4: Service Fingerprinting & Endpoint Enumeration
     - Phase 5: Vulnerability Triage & Executive Reporting
   - Kanban status boards, evidence attachment, and completion percentage tracking.

3. **Target Intelligence & Google Dorking Engine**:
   - Predefined dork templates:
     - `site:github.com "<domain>"`
     - `site:pastebin.com "<domain>"`
     - `"<domain>" "api_key" OR "secret"`
     - `"<domain>" data breach`
     - `"<domain>" ext:env OR ext:yml`
   - Automated regex entity extraction (emails, domains, tech stacks, people) and security-relevance scoring (`HIGH`, `MEDIUM`, `LOW`).

4. **Interactive Cytoscape Relationship Graphs**:
   - Graph visualizer mapping root domains to subdomains, IPs, services, and technologies.
   - Filtering by asset type, layout switching (breadthfirst, concentric, grid), and PNG export.

5. **Findings Management & CVSS Scoring**:
   - Vulnerability tracking (`DRAFT`, `CONFIRMED`, `REPORTED`, `REMEDIATED`, `FALSE_POSITIVE`).
   - CVSS v3.1 scoring, remediation playbooks, and evidence cross-linking.

6. **Executive Reporting & Secret Redaction**:
   - Executive summaries, asset breakdowns, findings lists, and methodology checklists.
   - High-sensitivity data redaction engine automatically redacting secrets before export.

7. **Admin Governance & Settings**:
   - Administrator directory (`/admin/users`) with role promotion/demotion.
   - System audit viewer (`/admin/audit-logs`) with CSV and JSON ledger export.
   - Security policies manager (`/admin/settings`) configuring session timeouts, password complexity, and failed login lockout limits.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS, Lucide React Icons
- **Visualization**: Cytoscape.js, Recharts
- **Security & Crypto**: Jose (JWT HS256), Bcrypt.js, Web Crypto API
- **Validation**: Zod (type-safe request parsing)
- **Persistence**: Prisma ORM with PostgreSQL & High-Performance In-Memory Data Store
- **Testing**: Node.js Native Test Runner (`tsx`), Playwright E2E

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reconflow?schema=public"
NEXTAUTH_SECRET="your-32-byte-secure-jwt-session-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Initial Admin Bootstrap Credentials (Used only on first startup if no ADMIN exists)
ADMIN_EMAIL="admin@reconflow.local"
ADMIN_PASSWORD="Admin@ReconFlow2026!"

NEXT_PUBLIC_APP_NAME="ReconFlow OSINT Workbench"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
DISABLE_RATE_LIMIT="true" # Set to false in production
```

> **IMPORTANT**: In production, ensure `ADMIN_PASSWORD` is replaced with a high-entropy passphrase, and `DISABLE_RATE_LIMIT` is set to `false`.

---

## 🏁 Quickstart & Operator Onboarding

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the public landing page.

### 3. Operator Authentication & Registration
- **Initial Administrator**: Sign in at `/login` using the credentials defined in your `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- **New Operators**:
  1. Visit `/register`.
  2. Provide operator name, official email, strong passphrase (min 12 characters with uppercase, lowercase, numbers, and symbols), and accept the Ethical Use Policy.
  3. Confirm your security verification token at `/verify-email`.
  4. Access your scoped programs with the default `ANALYST` role.

---

## 🧪 Quality & Verification Suite

### Automated Unit & Security Tests (21 Tests)
```bash
npm run test:unit
```
Verifies:
- Password hashing & verification
- Session JWT signing & tampered token rejection
- Token version session revocation upon password/role changes
- Account lockout simulation
- Program-level RBAC isolation & IDOR prevention
- Sliding-window rate limiting engine
- Sensitive data masking & redaction
- Target intelligence dork query templates
- Email verification token lifecycle
- Password reset token expiration & invalidation
- Environment-driven administrator bootstrap
- Input validation schemas (login, register, target scoping, findings, evidence)

### End-to-End Tests (Playwright - 13 Tests)
```bash
npm run test:e2e
```
Verifies:
- Public operator registration with mandatory email verification
- Bootstrapped administrator authentication
- Invalid password rejection & security alert logging
- Program & target perimeter scoping
- Asset inventory filtering & OSINT triaging
- 5-phase reconnaissance workflow execution
- Finding creation with CVSS metrics
- Target intelligence search execution
- Admin user directory & RBAC provisioning
- Tamper-evident audit log ledger & CSV/JSON export
- Platform security settings & policies

### Production Build Validation
```bash
npm run build
```

---

## 📜 Ethical Use Policy & Rules of Engagement

ReconFlow OSINT Workbench is intended exclusively for authorized ethical penetration testing, bug bounty programs within specified scope, and internal attack surface management.
1. **Explicit Authorization**: Ingesting targets or executing queries against assets without written authorization from the system owner is strictly prohibited.
2. **Passive & Non-Disruptive**: ReconFlow emphasizes non-intrusive enumeration. Denial of service, unauthenticated credential brute-forcing, and unauthorized exploits are prohibited.
3. **Auditability**: Every query and data access event is logged permanently to maintain strict chain-of-custody.
