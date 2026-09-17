export type RealtimeEventType =
  | 'USER_REGISTERED'
  | 'USER_EMAIL_VERIFIED'
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PROGRAM_ASSIGNED'
  | 'USER_PROGRAM_UNASSIGNED'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_UPDATED'
  | 'PROGRAM_STATUS_CHANGED'
  | 'PROGRAM_ARCHIVED'
  | 'TARGET_CREATED'
  | 'TARGET_UPDATED'
  | 'TARGET_DELETED'
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_DELETED'
  | 'FINDING_CREATED'
  | 'FINDING_UPDATED'
  | 'FINDING_STATUS_CHANGED'
  | 'FINDING_DELETED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'REPORT_CREATED'
  | 'AUDIT_EVENT_CREATED'
  | 'SETTINGS_UPDATED';

export type RealtimeChannel =
  | 'global'
  | 'admin:users'
  | 'admin:audit'
  | `user:${string}`
  | `program:${string}`;

export interface RealtimeEventPayload<T = any> {
  eventId: string;
  eventType: RealtimeEventType;
  entityType: string;
  entityId?: string;
  programId?: string;
  targetUserId?: string;
  actorUserId?: string;
  timestamp: string;
  version: number;
  payload: T;
}

export interface RealtimeMessage {
  channel: string;
  event: RealtimeEventPayload;
}
