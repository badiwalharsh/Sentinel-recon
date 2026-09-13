# Cloud Services & Production Deployment Guide: Sentinel Recon

This guide provides step-by-step instructions for deploying Sentinel Recon to production with Managed PostgreSQL (Neon / Supabase), Resend Email Integration, and Vercel Serverless Hosting with Background Job Crons.

---

## 1. Managed PostgreSQL Database Setup

Sentinel Recon uses Prisma ORM configured for PostgreSQL. Managed PostgreSQL services like **Neon** or **Supabase** are strongly recommended for serverless zero-cold-start performance.

### Option A: Neon Serverless Postgres (Recommended)
1. Go to [https://neon.tech](https://neon.tech) and create a free account.
2. Click **Create Project**, name it `sentinel-recon-db`, and select your preferred region (e.g. `us-east-1` or `eu-central-1`).
3. Neon will display your connection string in the format:
   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy this connection string. It will be your `DATABASE_URL`.

### Option B: Supabase Postgres
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. In Project Settings &rarr; Database &rarr; Connection Pooling, copy the **Transaction Connection String** (port `6543`) or Direct Connection String (port `5432`).
3. Ensure `?pgbouncer=true` or `?sslmode=require` is appended if using connection pooling.

### Apply Migrations
From your local environment with `DATABASE_URL` set in `.env`:
```bash
npx prisma db push
```

---

## 2. Email Service Provider Setup (Resend)

Sentinel Recon dispatches email verifications and password reset tokens via Resend API.

1. Go to [https://resend.com](https://resend.com) and sign up.
2. Navigate to **API Keys** &rarr; **Create API Key**.
3. Name the key `SentinelRecon Production` with `Full access`.
4. Copy the key (starts with `re_...`). This is your `RESEND_API_KEY`.
5. Under **Domains**, add your verified sending domain (e.g., `sentinel-recon.com`), or use `onboarding@resend.dev` during testing.
6. Set `EMAIL_FROM`:
   ```text
   EMAIL_FROM="Sentinel Recon <security@yourdomain.com>"
   ```

---

## 3. Vercel Deployment & Environment Variables

### Step 1: Push to GitHub / GitLab
Ensure all changes are committed and pushed to your git repository.

### Step 2: Import Project in Vercel
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard) and click **Add New** &rarr; **Project**.
2. Select the `Sentinel-recon` repository.
3. Framework Preset: **Next.js**.

### Step 3: Configure Environment Variables in Vercel
In the Vercel Project Settings &rarr; **Environment Variables**, add the following:

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection string (Neon / Supabase) | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_SECRET` | 32+ byte cryptographic secret for JWT sessions | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical public URL of your app | `https://sentinel-recon.vercel.app` |
| `ADMIN_EMAIL` | Admin account email initialized on first launch | `admin@sentinelrecon.com` |
| `ADMIN_PASSWORD` | Strong password for first admin bootstrap | `Admin@SentinelRecon2026!` |
| `ADMIN_PANEL_PASSCODE` | Step-up passcode for sensitive admin actions | `RECON-SEC-9842-X7K1-ADMIN` |
| `RESEND_API_KEY` | Resend API Key for email delivery | `re_123456789...` |
| `EMAIL_FROM` | Sender address for system notifications | `Sentinel Recon <security@yourdomain.com>` |
| `CRON_SECRET` | Secret key securing background worker triggers | `cron_sec_8391829...` |
| `NODE_ENV` | Production environment flag | `production` |

---

## 4. Background Jobs & Vercel Cron Configuration

Sentinel Recon includes an asynchronous job queue for long-running OSINT collection and threat intelligence tasks.

### Vercel Cron Schedule (`vercel.json`)
The repository includes a `vercel.json` file configuring automatic execution of the job runner every 5 minutes:
```json
{
  "crons": [
    {
      "path": "/api/jobs/run",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Manual Trigger
You can also trigger pending jobs on demand:
```bash
curl -X POST https://your-domain.vercel.app/api/jobs/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 5. First-Time Administrator Bootstrap & Usage

1. **No Demo Accounts**: Sentinel Recon does not store hardcoded demo users.
2. **Admin Bootstrap**: On the first request to the platform, Sentinel Recon checks if an admin user exists. If not, it provisions the initial administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. **Log In as Admin**:
   - Navigate to `/login`.
   - Enter your configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   - You will have full `ADMIN` access to provision operators, manage program scopes, and review append-only audit logs in `/admin`.
4. **Analyst Registration**:
   - New operators can register at `/register`.
   - All newly registered operators receive the default `ANALYST` role and are auto-enrolled in authorized active security programs.
