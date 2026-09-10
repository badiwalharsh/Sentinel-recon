import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.systemRole !== 'ADMIN' && user.systemRole !== 'AUDITOR')) {
    return NextResponse.json({ error: 'Admin or Auditor privileges required' }, { status: 403 });
  }

  if (typeof dbStore.sync === 'function') {
    dbStore.sync();
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const entityType = searchParams.get('entityType');

  let logs = [...dbStore.auditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action === action);
  }
  if (entityType && entityType !== 'ALL') {
    logs = logs.filter((l) => l.entityType === entityType);
  }

  return NextResponse.json({ logs });
}
