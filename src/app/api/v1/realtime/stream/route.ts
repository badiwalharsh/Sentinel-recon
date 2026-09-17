import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { subscribeToRealtimeChannel } from '@/lib/realtime/broker';
import { dbStore } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { RealtimeEventPayload } from '@/lib/realtime/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  // Allow unauthenticated connection ONLY to pending-registration channel if requested by a new registrant
  const { searchParams } = new URL(req.url);
  const requestedChannelsParam = searchParams.get('channels');
  const requestedChannels = requestedChannelsParam
    ? requestedChannelsParam.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const authorizedChannels: string[] = ['global'];

  if (user) {
    authorizedChannels.push(`user:${user.userId}`);

    if (user.systemRole === 'ADMIN') {
      authorizedChannels.push('admin:users');
      authorizedChannels.push('admin:audit');
    }

    // Determine user's authorized program channels
    try {
      if (user.systemRole === 'ADMIN') {
        const allProgs = await prisma.program.findMany({ select: { id: true } }).catch(() => []);
        allProgs.forEach((p) => authorizedChannels.push(`program:${p.id}`));
        dbStore.programs.forEach((p) => {
          if (!authorizedChannels.includes(`program:${p.id}`)) {
            authorizedChannels.push(`program:${p.id}`);
          }
        });
      } else {
        const memberships = await prisma.programMembership.findMany({
          where: { userId: user.userId },
          select: { programId: true },
        }).catch(() => []);
        memberships.forEach((m) => authorizedChannels.push(`program:${m.programId}`));

        dbStore.programs
          .filter((p) => (p.memberships || []).some((m) => m.userId === user.userId))
          .forEach((p) => {
            if (!authorizedChannels.includes(`program:${p.id}`)) {
              authorizedChannels.push(`program:${p.id}`);
            }
          });
      }
    } catch {
      // Fallback already covers memory store
    }
  } else {
    // For pending registration status listening (e.g. user:usr_123 or register)
    for (const ch of requestedChannels) {
      if (ch.startsWith('user:usr_') || ch === 'global') {
        authorizedChannels.push(ch);
      }
    }
  }

  // Intersect requested channels if specified
  const activeChannels = requestedChannels.length > 0
    ? requestedChannels.filter((ch) => authorizedChannels.includes(ch))
    : authorizedChannels;

  const encoder = new TextEncoder();
  const unsubs: (() => void)[] = [];
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      const initPayload = JSON.stringify({
        type: 'CONNECTED',
        userId: user?.userId || null,
        channels: activeChannels,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initPayload}\n\n`));

      // Subscribe to active channels
      activeChannels.forEach((channel) => {
        const unsub = subscribeToRealtimeChannel(channel, (event: RealtimeEventPayload) => {
          try {
            const message = JSON.stringify({ channel, event });
            controller.enqueue(encoder.encode(`event: message\ndata: ${message}\n\n`));
          } catch {
            // Controller might be closed
          }
        });
        unsubs.push(unsub);
      });

      // Keep connection alive with heartbeat comments
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 15000);
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
