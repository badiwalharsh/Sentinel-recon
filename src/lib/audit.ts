import { prisma } from './prisma';
import { dbStore, MockAuditLog } from './db-store';
import { headers } from 'next/headers';

export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTER'
  | 'USER_PASSWORD_CHANGE'
  | 'USER_ROLE_CHANGE'
  | 'PROGRAM_CREATE'
  | 'PROGRAM_UPDATE'
  | 'PROGRAM_DELETE'
  | 'MEMBERSHIP_ADD'
  | 'MEMBERSHIP_REMOVE'
  | 'TARGET_CREATE'
  | 'TARGET_UPDATE'
  | 'TARGET_DELETE'
  | 'ASSET_CREATE'
  | 'ASSET_UPDATE'
  | 'ASSET_DELETE'
  | 'OSINT_INGEST'
  | 'INTELLIGENCE_QUERY_RUN'
  | 'INTELLIGENCE_BULK_RUN'
  | 'INTELLIGENCE_SOURCE_UPDATE'
  | 'PHASE_CREATE'
  | 'PHASE_UPDATE'
  | 'PHASE_DELETE'
  | 'TASK_CREATE'
  | 'TASK_UPDATE'
  | 'TASK_DELETE'
  | 'EVIDENCE_UPLOAD'
  | 'EVIDENCE_DELETE'
  | 'FINDING_CREATE'
  | 'FINDING_UPDATE'
  | 'FINDING_DELETE'
  | 'USER_EMAIL_VERIFIED'
  | 'USER_PASSWORD_RESET_REQUESTED'
  | 'USER_PASSWORD_RESET_COMPLETED'
  | 'SYSTEM_SETTINGS_UPDATE'
  | 'REPORT_GENERATE'
  | 'SECURITY_ALERT';

interface CreateAuditLogParams {
  action: AuditActionType;
  entityType: string;
  entityId?: string | null;
  programId?: string | null;
  userId?: string | null;
  details?: any;
  req?: Request;
}

export async function createAuditLog({
  action,
  entityType,
  entityId,
  programId,
  userId,
  details = {},
  req,
}: CreateAuditLogParams) {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'SentinelRecon-Client';

    if (req) {
      ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
      userAgent = req.headers.get('user-agent') || 'SentinelRecon-Client';
    } else {
      try {
        const headerList = await headers();
        ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || '127.0.0.1';
        userAgent = headerList.get('user-agent') || 'SentinelRecon-Client';
      } catch (e) {
        // In background context
      }
    }

    const user = userId ? dbStore.users.find((u) => u.id === userId) : null;

    const newLog: MockAuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: programId || null,
      userId: userId || null,
      userEmail: user?.email || undefined,
      action,
      entityType,
      entityId: entityId || null,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date().toISOString(),
    };

    dbStore.auditLogs.unshift(newLog);

    // Async write to Prisma only if explicitly enabled
    if (process.env.ENABLE_PRISMA_SYNC === 'true') {
      try {
        await prisma.auditLog.create({
          data: {
            action: action as any,
            entityType,
            entityId: entityId || null,
            programId: programId || null,
            userId: userId || null,
            ipAddress,
            userAgent,
            details: details || {},
          },
        }).catch(() => {
          // Suppress offline DB error in dev
        });
      } catch {
        // Suppress
      }
    }

    return newLog;
  } catch (err) {
    console.error('Failed to append immutable audit log:', err);
  }
}
