import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { Navbar } from '@/components/shared/navbar';
import { RealtimeProvider } from '@/components/shared/RealtimeProvider';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Load programs user has access to
  let programs: any[] = [];
  if (user.systemRole === 'ADMIN') {
    programs = dbStore.programs;
  } else {
    programs = dbStore.programs.filter((p) =>
      p.memberships.some((m) => m.userId === user.userId)
    );
  }

  const userChannels = ['global', `user:${user.userId}`];

  return (
    <RealtimeProvider channels={userChannels}>
      <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100">
        <Navbar user={user} programs={programs} />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </RealtimeProvider>
  );
}
