# Program Routing & Authorization Specification

This document details the route architecture, URL parameter conventions, and access control rules for security programs in Sentinel Recon.

---

## 1. Route Patterns & URLs

### Programs List
- **Route**: `/programs`
- **File**: `src/app/(dashboard)/programs/page.tsx`
- **Description**: Displays all authorized security programs for the logged-in operator or all tenant programs for Administrators. Includes modal to initialize new programs.

### Program Root & Detail Overview
- **Routes**:
  - `/programs/[slug]` &rarr; Primary program detail route (e.g., `/programs/apex-financial`)
  - `/programs/[id]` &rarr; Also supported via ID lookup (e.g., `/programs/prog_1710000000`)
  - `/programs/[slug]/overview` &rarr; Direct overview tab
- **Files**:
  - `src/app/(dashboard)/programs/[slug]/page.tsx` (Root dynamic entry point)
  - `src/app/(dashboard)/programs/[slug]/overview/page.tsx` (Detailed overview dashboard)
  - `src/app/(dashboard)/programs/[slug]/layout.tsx` (Scoped layout with header & sub-navigation)

### Program Feature Sub-Routes
All sub-routes follow the `/programs/[slug]/<feature>` pattern:
- `/programs/[slug]/targets` &mdash; Scoped target perimeters & authorization attestation
- `/programs/[slug]/assets` &mdash; Discovered asset inventory (subdomains, IPs, services)
- `/programs/[slug]/topology` &mdash; Interactive Cytoscape relationship graph
- `/programs/[slug]/osint` &mdash; Passive OSINT records & live scanners
- `/programs/[slug]/workflow` &mdash; 5-Phase reconnaissance task board
- `/programs/[slug]/findings` &mdash; Vulnerability triage queue & CVSS metrics
- `/programs/[slug]/intelligence` &mdash; Google Dorking engine & entity extraction
- `/programs/[slug]/reports` &mdash; Executive report generator with secret masking
- `/programs/[slug]/settings` &mdash; Program scope rules & membership management

---

## 2. Dynamic Param Convention

- **Param Name**: `slug` (e.g. `params: Promise<{ slug: string }>`)
- **Resolution**: Both `slug` (URL-safe string like `apex-financial`) and `id` (e.g. `prog_1710000000`) are supported by resolving against PostgreSQL via Prisma and the resilient fallback cache:
  ```typescript
  const program = await prisma.program.findFirst({
    where: { OR: [{ slug }, { id: slug }] }
  });
  ```

---

## 3. Authorization & Scoping Rules

1. **Authentication Required**: All `/programs/*` routes require a valid JWT session cookie (`sentinel_session`). Unauthenticated requests are redirected to `/login`.
2. **Access Control**:
   - **ADMIN**: Global visibility to all programs across all tenants.
   - **LEAD_ANALYST / Program Owner**: Full control over targets, scopes, tasks, and findings within the program.
   - **ANALYST**: Can create and triage targets, assets, findings, and tasks within authorized programs.
   - **VIEWER / AUDITOR**: Read-only access to intelligence, assets, and findings.
3. **Denied / Missing Program Handling**:
   - If the program does not exist: triggers `notFound()` (404).
   - If the user is not a member, owner, or admin: renders the secure **Program Access Denied** boundary.
