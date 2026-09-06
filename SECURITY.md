# SentinelRecon: Security Policy & Architecture

## Security Architecture Overview

SentinelRecon is engineered with defensive-by-design principles to ensure operational safety, program isolation, and strict adherence to ethical engagement boundaries.

```
+-------------------------------------------------------------------+
|                        Client Browser                             |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               Next.js Edge Middleware Security Layer              |
|  - Route protection for /programs/* and /admin/*                  |
|  - Strict Security Headers: CSP, HSTS, X-Frame-Options, etc.      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                   Authentication & Session Layer                  |
|  - HS256 JWT sessions stored in HttpOnly, SameSite=Strict cookies  |
|  - Server-side session invalidation via user tokenVersion         |
|  - Account lockout after 5 consecutive failed login attempts      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|             Role-Based Access Control (RBAC) Guard                |
|  - System Roles: ADMIN, ANALYST, AUDITOR, VIEWER                  |
|  - Program Roles: LEAD_ANALYST, ANALYST, VIEWER, AUDITOR          |
|  - Scoped program isolation preventing IDOR                       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                Sliding-Window Rate Limiting Engine                |
|  - Auth Endpoints: 5 requests / minute per IP                     |
|  - Intelligence Queries: 20 requests / minute per user/IP         |
|  - Evidence Uploads: 10 uploads / minute per user/IP              |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                      Immutable Audit Ledger                       |
|  - All logins, deletions, creations, scans, and reports logged    |
|  - Client IP, User ID, timestamp, and metadata captured           |
+-------------------------------------------------------------------+
```

---

## Defensive Boundaries & Data Protection

### 1. Insecure Direct Object References (IDOR) Mitigation
- All program sub-resources (assets, targets, findings, intelligence queries, evidence files) require membership validation via `requireProgramAccess(programId, role)`.
- When accessing or downloading evidence files, the system validates that the target file belongs to an active evidence record within the requested program scope.
- Cross-program referencing of targets, assets, or evidence is actively blocked on finding creation.

### 2. Information Disclosure Prevention
- Server-side exceptions (HTTP 500) return sanitized, generic error responses without exposing raw stack traces, SQL syntax, or internal system paths.
- Executive reports automatically pass all output through a regex and key-based redactor (`maskSensitiveData` and `maskObjectData`) to redact API keys, bearer tokens, AWS secrets, and passwords.

### 3. File Upload Hardening
- File uploads are restricted by a strict MIME type and file extension allowlist (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`, `text/plain`, `application/json`, `text/csv`).
- Dangerous executable extensions (`.exe`, `.sh`, `.bat`, `.cmd`, `.js`, `.py`) are rejected.
- Uploaded file names are stripped of path traversal characters (`path.basename`) and stored on disk with cryptographically random hex identifiers.

---

## Known Limitations

1. **In-Memory Store Synchronization**:
   - In single-instance or serverless environments without an active PostgreSQL connection, the fallback in-memory data store operates per runtime worker. For production deployments with multiple nodes, configure `DATABASE_URL` with a shared managed PostgreSQL database.
2. **Passive vs. Active Reconnaissance**:
   - SentinelRecon intentionally restricts automated queries to passive OSINT, Certificate Transparency monitoring, and non-intrusive DNS queries. Intrusive port exploitation and payload delivery require explicit out-of-band authorization.
3. **Evidence Storage in Serverless**:
   - In serverless hosting (e.g. standard Vercel lambdas), local filesystem storage in `/storage/evidence` is ephemeral. For production deployments handling large evidence artifacts, configure S3-compatible cloud storage (AWS S3, Cloudflare R2).

---

## Responsible Disclosure Policy

We take the security of SentinelRecon and our users very seriously. If you discover a potential security vulnerability, please report it responsibly:

- **Security Team Email**: `security@sentinelrecon.io` (or repository maintainer contact)
- **Response SLA**: We commit to acknowledging receipt of your report within **48 hours**.
- **Assessment & Triage**: You will receive an initial assessment and severity ranking within **5 business days**.
- **Coordinated Disclosure**: We ask that you do not publicly disclose the issue until we have had an opportunity to address and patch the vulnerability.

When reporting, please include:
- A clear description of the vulnerability.
- Proof-of-concept steps or HTTP request payloads.
- An assessment of the potential impact.

Thank you for helping keep SentinelRecon safe and trustworthy.
