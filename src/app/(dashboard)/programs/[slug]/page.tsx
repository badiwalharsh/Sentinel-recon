import React from 'react';
import ProgramOverviewPage from './overview/page';

export const dynamic = 'force-dynamic';

export default async function ProgramRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <ProgramOverviewPage params={params} />;
}
