import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleJobExecution(req);
}

export async function POST(req: Request) {
  return handleJobExecution(req);
}

async function handleJobExecution(req: Request) {
  // Verify cron secret if configured
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if called by an authenticated admin
    const { getCurrentUser } = await import('@/lib/auth/session');
    const user = await getCurrentUser();
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized job runner' }, { status: 401 });
    }
  }

  try {
    // 1. Pick up pending jobs
    const pendingJobs = await prisma.job.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    if (pendingJobs.length === 0) {
      return NextResponse.json({ processedCount: 0, message: 'No pending background jobs found.' });
    }

    const processedResults = [];

    for (const job of pendingJobs) {
      // Mark as PROCESSING
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'PROCESSING' },
      });

      try {
        let result: any = {};
        const payload = (job.payload || {}) as any;

        // Simulate asynchronous OSINT scanning or intelligence collection
        if (job.type === 'OSINT_SCAN') {
          result = {
            target: payload.domain || payload.target || 'target.domain',
            dnsRecordsCount: 12,
            subdomainsDiscovered: [
              `api.${payload.domain || 'target.domain'}`,
              `auth.${payload.domain || 'target.domain'}`,
              `vpn.${payload.domain || 'target.domain'}`,
            ],
            ctCertificatesFound: 4,
            completedAt: new Date().toISOString(),
          };
        } else if (job.type === 'INTELLIGENCE_QUERY') {
          result = {
            query: payload.query || 'threat intelligence',
            articlesFound: 8,
            threatRelevanceScore: 'HIGH',
            matches: ['Code repository credential exposure match', 'Public DNS zone record'],
            completedAt: new Date().toISOString(),
          };
        } else {
          result = {
            status: 'EXECUTED',
            payloadProcessed: payload,
            completedAt: new Date().toISOString(),
          };
        }

        // Mark COMPLETED
        const completedJob = await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            result,
          },
        });

        processedResults.push({ id: job.id, status: 'COMPLETED' });

        await createAuditLog({
          action: 'OSINT_INGEST',
          entityType: 'Job',
          entityId: job.id,
          programId: job.programId,
          details: { jobType: job.type, status: 'COMPLETED' },
          req,
        });
      } catch (jobErr: any) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            error: jobErr.message || 'Worker execution failed',
          },
        });
        processedResults.push({ id: job.id, status: 'FAILED', error: jobErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedResults.length,
      jobs: processedResults,
    });
  } catch (err: any) {
    console.error('Job runner error:', err);
    return NextResponse.json({ error: 'Failed to process background queue' }, { status: 500 });
  }
}
