# ReconFlow OSINT Workbench: Production Deployment Guide

This guide details the step-by-step production deployment of **ReconFlow OSINT Workbench** with a managed PostgreSQL database (such as Supabase, Neon, AWS RDS, or Railway) and Vercel/Docker runtime.

---

## 🔒 Security & User Account Policy

> [!IMPORTANT]
> **No Demo Accounts**: ReconFlow OSINT Workbench does NOT ship with demo accounts or bypass buttons.
> - **All regular operators must register via `/register` and confirm their identity via `/verify-email`.**
> - **Default registration role is `ANALYST`.**
> - **Initial Administrator Account**: Created dynamically on first run using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables if no administrator account exists.

---

## 1. Managed PostgreSQL Setup

1. Provision a PostgreSQL instance (v14+) on your chosen cloud provider:
   - **Neon**: Create a database branch and copy the pooled connection URI.
   - **Supabase**: Create a project, copy the connection URI (`Session Pooler` or `Transaction Pooler`).
   - **AWS RDS**: Launch a PostgreSQL `db.t4g` instance inside your VPC.
2. Ensure SSL is enforced on the database connection string:
   ```env
   DATABASE_URL="postgresql://user:password@db-host:5432/reconflow?sslmode=require&pgbouncer=true"
   ```

---

## 2. Environment Variables Checklist

Configure the following environment variables in your deployment environment (e.g., Vercel Project Settings or Kubernetes Secrets):

| Variable | Required | Description | Example / Instructions |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Yes | 32+ character high-entropy secret for signing JWT session tokens | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Fully qualified public URL of the application | `https://recon.yourdomain.com` |
| `ADMIN_EMAIL` | Yes | Email for initial administrator bootstrap on first run | `admin@reconflow.local` or `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Yes | Strong passphrase for initial administrator account | `SuperSecretAdminPassphrase2026!` |
| `NEXT_PUBLIC_APP_NAME` | No | Display name of the platform | `ReconFlow OSINT Workbench` |
| `NEXT_PUBLIC_APP_URL` | No | Canonical public frontend URL | `https://recon.yourdomain.com` |
| `NODE_ENV` | Yes | Node runtime environment | `production` |
| `DISABLE_RATE_LIMIT` | No | Disable sliding-window rate limit (dev only) | `false` |

> [!CAUTION]
> Never commit active production secrets or credentials into source control. Always inject them via cloud secret managers.

---

## 3. Database Migration & Admin Bootstrap

Before routing public traffic:

### Step A: Push Database Schema
```bash
npx prisma db push
```

### Step B: First Run Admin Bootstrap
When the application starts up, the bootstrap engine automatically detects if an administrator account exists. If not, it provisions the account using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

---

## 4. Vercel Deployment Steps

### Option 1: Git Integration (Recommended)
1. Push your repository to GitHub / GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), select **Import Project** and link the repository.
3. In **Build and Output Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Install Command**: `npm install --legacy-peer-deps`
4. In **Environment Variables**, add the variables from Section 2.
5. Click **Deploy**.

### Option 2: Vercel CLI
```bash
# 1. Authenticate Vercel CLI
npx vercel login

# 2. Link project
npx vercel link

# 3. Pull production environment variables
npx vercel env pull .env.production.local

# 4. Deploy to production
npx vercel --prod
```

---

## 5. Post-Deployment Verification Checklist

- [ ] **1. Security Headers**:
  ```bash
  curl -I https://recon.yourdomain.com
  ```
  Verify `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` are present.

- [ ] **2. Bootstrapped Administrator Login**:
  - Visit `/login` and authenticate using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
  - Confirm access to `/dashboard` and `/admin`.

- [ ] **3. Operator Registration & Verification**:
  - Visit `/register` in an incognito window.
  - Complete registration, confirm verification on `/verify-email`, and confirm default role is `ANALYST`.

- [ ] **4. Tamper-Evident Audit Ledger**:
  - Visit `/admin/audit-logs` as administrator.
  - Verify `USER_LOGIN` and `USER_REGISTER` events are recorded.
  - Test **Export CSV** and **Export JSON** buttons.

- [ ] **5. Platform Security Settings**:
  - Visit `/admin/settings` and configure session timeout and password complexity rules.

---

## 6. Maintenance & Backup Guidelines

1. **Automated Daily Backups**: Enable point-in-time recovery (PITR) on your managed PostgreSQL provider.
2. **Audit Retention**: Retain `audit_logs` records for at least 365 days for compliance and chain-of-custody.
3. **Secret Rotation**: Rotate `NEXTAUTH_SECRET` periodically. Rotating the secret invalidates active operator sessions and requires re-authentication.
