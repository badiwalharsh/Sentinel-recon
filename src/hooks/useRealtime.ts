'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeEventPayload, RealtimeEventType } from '@/lib/realtime/types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface UseRealtimeOptions {
  channels?: string[];
  filterEvents?: RealtimeEventType[];
  onEvent?: (event: RealtimeEventPayload) => void;
  enabled?: boolean;
}

const seenEventIds = new Set<string>();

export function useRealtime(
  channelOrOptions?: string | string[] | UseRealtimeOptions,
  callback?: (event: RealtimeEventPayload) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);

  const options: UseRealtimeOptions =
    typeof channelOrOptions === 'string'
      ? { channels: [channelOrOptions], onEvent: callback }
      : Array.isArray(channelOrOptions)
      ? { channels: channelOrOptions, onEvent: callback }
      : channelOrOptions || {};

  const { channels = [], filterEvents, onEvent, enabled = true } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus('connecting');

    const params = new URLSearchParams();
    if (channels.length > 0) {
      params.set('channels', channels.join(','));
    }

    const url = `/api/v1/realtime/stream${params.toString() ? `?${params.toString()}` : ''}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setStatus('connected');
      reconnectAttempts.current = 0;
    });

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: RealtimeEventPayload = data.event;

        if (event && event.eventId) {
          if (seenEventIds.has(event.eventId)) {
            return; // Deduplicate
          }
          seenEventIds.add(event.eventId);
          if (seenEventIds.size > 2000) {
            const firstKey = seenEventIds.values().next().value;
            if (firstKey) seenEventIds.delete(firstKey);
          }

          if (filterEvents && filterEvents.length > 0 && !filterEvents.includes(event.eventType)) {
            return;
          }

          setLastEvent(event);
          if (onEventRef.current) {
            onEventRef.current(event);
          }
        }
      } catch (err) {
        console.error('[Realtime Hook] Message parse error:', err);
      }
    });

    es.onerror = () => {
      setStatus('disconnected');
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 15000);
      reconnectAttempts.current += 1;

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [channels.join(','), enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    status,
    lastEvent,
    reconnect,
  };
}

export default useRealtime;
