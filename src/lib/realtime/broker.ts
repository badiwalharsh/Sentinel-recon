import { EventEmitter } from 'events';
import crypto from 'crypto';
import { RealtimeChannel, RealtimeEventPayload, RealtimeEventType } from './types';

declare global {
  // eslint-disable-next-line no-var
  var realtimeEventEmitter: EventEmitter | undefined;
}

const emitter = global.realtimeEventEmitter || new EventEmitter();
emitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  global.realtimeEventEmitter = emitter;
}

export interface PublishOptions<T = any> {
  eventType: RealtimeEventType;
  entityType: string;
  entityId?: string;
  programId?: string;
  targetUserId?: string;
  actorUserId?: string;
  payload?: T;
  channels?: RealtimeChannel[];
}

/**
 * Strips password hashes, secrets, and private keys from any outbound event payload
 */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const safe: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (
      lk.includes('password') ||
      lk.includes('secret') ||
      lk.includes('token') ||
      lk.includes('privatekey')
    ) {
      continue;
    }
    safe[k] = typeof v === 'object' ? sanitizePayload(v) : v;
  }
  return safe;
}

/**
 * Publishes a real-time event across designated authorized channels
 */
export async function publishRealtimeEvent<T = any>(options: PublishOptions<T>): Promise<RealtimeEventPayload<T>> {
  const eventId = `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const timestamp = new Date().toISOString();

  const event: RealtimeEventPayload<T> = {
    eventId,
    eventType: options.eventType,
    entityType: options.entityType,
    entityId: options.entityId,
    programId: options.programId,
    targetUserId: options.targetUserId,
    actorUserId: options.actorUserId,
    timestamp,
    version: 1,
    payload: sanitizePayload(options.payload || {}),
  };

  // Determine target channels
  const targetChannels: RealtimeChannel[] = options.channels && options.channels.length > 0
    ? options.channels
    : [];

  if (targetChannels.length === 0) {
    if (options.programId) {
      targetChannels.push(`program:${options.programId}`);
    }
    if (options.targetUserId) {
      targetChannels.push(`user:${options.targetUserId}`);
    }
    if (options.eventType.startsWith('USER_')) {
      targetChannels.push('admin:users');
    }
    if (options.eventType.startsWith('PROGRAM_')) {
      targetChannels.push('global');
    }
    if (options.eventType === 'AUDIT_EVENT_CREATED') {
      targetChannels.push('admin:audit');
    }
    if (targetChannels.length === 0) {
      targetChannels.push('global');
    }
  }

  // 1. Emit via local EventBroker
  for (const channel of targetChannels) {
    emitter.emit(`channel:${channel}`, event);
  }
  // Also emit to all-events listener for debugging or broad monitors
  emitter.emit('realtime:event', { channels: targetChannels, event });

  // 2. If Supabase Realtime is configured in environment, broadcast to Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      for (const channel of targetChannels) {
        fetch(`${supabaseUrl}/rest/v1/rpc/broadcast_event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            channel,
            event: options.eventType,
            payload: event,
          }),
        }).catch(() => {});
      }
    } catch {
      // Supabase broadcast non-blocking fallback
    }
  }

  return event;
}

/**
 * Subscribes to events on a specific channel
 */
export function subscribeToRealtimeChannel(
  channel: string,
  callback: (event: RealtimeEventPayload) => void
): () => void {
  const eventName = `channel:${channel}`;
  emitter.on(eventName, callback);
  return () => {
    emitter.off(eventName, callback);
  };
}

export default {
  publishRealtimeEvent,
  subscribeToRealtimeChannel,
};
