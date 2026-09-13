import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createJobSchema = z.object({
  type: z.enum(['OSINT_SCAN', 'INTELLIGENCE_QUERY', 'PORT_AUDIT', 'CERT_ENUM']),
  payload: z.record(z.any()),
  programId: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const programId = searchParams.get('programId');

  try {
    const jobs = await prisma.job.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(programId ? { programId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ jobs: [] });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole === 'VIEWER' || user.systemRole === 'AUDITOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid job schema', details: parsed.error.format() }, { status: 400 });
    }

    const { type, payload, programId } = parsed.data;

    const job = await prisma.job.create({
      data: {
        type,
        payload,
        programId: programId || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to enqueue background job' }, { status: 500 });
  }
}
