'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useRealtime, ConnectionStatus } from '@/hooks/useRealtime';
import { Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface RealtimeContextValue {
  status: ConnectionStatus;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'connecting',
  reconnect: () => {},
});

export function RealtimeProvider({
  children,
  channels = ['global'],
}: {
  children: React.ReactNode;
  channels?: string[];
}) {
  const { status, reconnect } = useRealtime({ channels });

  const value = useMemo(
    () => ({
      status,
      reconnect,
    }),
    [status, reconnect]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

export function RealtimeStatusIndicator({ className = '' }: { className?: string }) {
  const { status, reconnect } = useRealtimeContext();

  if (status === 'connected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 select-none ${className}`}
        title="Realtime synchronization active"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Live</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-[11px] font-mono text-amber-400 select-none cursor-pointer hover:bg-amber-900/40 ${className}`}
        onClick={reconnect}
        title="Connecting to realtime event stream... Click to retry"
      >
        <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
        <span>Syncing</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-400 select-none cursor-pointer hover:bg-slate-800 ${className}`}
      onClick={reconnect}
      title="Realtime disconnected. Click to reconnect"
    >
      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
      <span>Offline</span>
    </div>
  );
}

export default RealtimeProvider;
