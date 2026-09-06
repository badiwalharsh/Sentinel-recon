import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockIntelligenceQuery, MockOSINTRecord } from '@/lib/db-store';
import { batchRunQueriesSchema } from '@/lib/validations/intelligence';
import {
  generatePredefinedQueriesForTarget,
  searchTargetIntelligence,
} from '@/lib/intelligence/search-service';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');

  let target = null;
  if (targetId) {
    target = dbStore.targets.find((t) => t.id === targetId && t.programId === program.id);
  }

  const domain = target?.primaryDomain || 'apex-vault.io';
  const orgName = target?.name || program.name;

  // Predefined queries with resolved values
  const defaultTemplates = generatePredefinedQueriesForTarget(domain, orgName);

  // Merge with existing intelligence queries stored in memory
  const storedQueries = dbStore.intelligenceQueries.filter(
    (q) => q.programId === program.id && (!targetId || q.targetId === targetId)
  );

  const mergedQueries = defaultTemplates.map((tpl) => {
    const matched = storedQueries.find(
      (sq) =>
        sq.queryTemplate === tpl.queryTemplate ||
        sq.queryString.toLowerCase() === tpl.queryString.toLowerCase()
    );

    return {
      id: matched?.id || tpl.id,
      templateId: tpl.id,
      queryTemplate: tpl.queryTemplate,
      queryString: tpl.queryString,
      label: tpl.label,
      category: tpl.category,
      description: tpl.description,
      lastRunAt: matched?.lastRunAt || null,
      resultCount: matched?.resultCount || 0,
      hasRun: !!matched?.lastRunAt,
    };
  });

  return NextResponse.json({
    targetId: target?.id || null,
    domain,
    queries: mergedQueries,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = batchRunQueriesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid batch query payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetId, queryIds } = parsed.data;
    const target = dbStore.targets.find((t) => t.id === targetId && t.programId === program.id);
    if (!target) {
      return NextResponse.json({ error: 'Target not found in program' }, { status: 404 });
    }

    const predefined = generatePredefinedQueriesForTarget(target.primaryDomain, target.name);

    // Filter to selected or run all
    const queriesToRun = queryIds && queryIds.length > 0
      ? predefined.filter((q) => queryIds.includes(q.id) || queryIds.includes(q.queryTemplate))
      : predefined;

    let totalNewRecords = 0;
    const executionSummaries: any[] = [];
    const now = new Date().toISOString();

    for (const q of queriesToRun) {
      const intelResults = await searchTargetIntelligence({
        domain: target.primaryDomain,
        orgName: target.name,
        query: q.queryString,
        queryTemplate: q.queryTemplate,
        sourceType: q.category,
      });

      let addedForQuery = 0;

      for (const item of intelResults) {
        const exists = dbStore.osintRecords.find(
          (r) =>
            r.programId === program.id &&
            ((r.url && r.url === item.url) || (r.title && r.title === item.title))
        );

        if (!exists) {
          const newRecord: MockOSINTRecord = {
            id: `osint_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: target.id,
            assetId: null,
            title: item.title,
            type: item.type,
            source: item.source,
            url: item.url,
            rawData: item.rawData,
            summary: item.summary || item.snippet,
            securityRelevance: item.securityRelevance,
            tags: item.tags,
            extractedEntities: item.extractedEntities,
            collectedAt: now,
          };
          dbStore.osintRecords.unshift(newRecord);
          totalNewRecords++;
          addedForQuery++;
        }
      }

      // Update or insert IntelligenceQuery record
      let storedQuery = dbStore.intelligenceQueries.find(
        (sq) =>
          sq.programId === program.id &&
          sq.targetId === target.id &&
          (sq.queryTemplate === q.queryTemplate || sq.queryString === q.queryString)
      );

      if (storedQuery) {
        storedQuery.lastRunAt = now;
        storedQuery.resultCount = intelResults.length;
        storedQuery.results = { count: intelResults.length };
        storedQuery.updatedAt = now;
      } else {
        const newQ: MockIntelligenceQuery = {
          id: `iq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          programId: program.id,
          targetId: target.id,
          queryTemplate: q.queryTemplate,
          queryString: q.queryString,
          lastRunAt: now,
          resultCount: intelResults.length,
          results: { count: intelResults.length },
          createdAt: now,
          updatedAt: now,
        };
        dbStore.intelligenceQueries.unshift(newQ);
      }

      executionSummaries.push({
        templateId: q.id,
        label: q.label,
        queryString: q.queryString,
        resultCount: intelResults.length,
        newRecords: addedForQuery,
      });
    }

    // Audit log
    await createAuditLog({
      action: 'INTELLIGENCE_BULK_RUN',
      entityType: 'Target',
      entityId: target.id,
      programId: program.id,
      userId: user.userId,
      details: {
        targetDomain: target.primaryDomain,
        queriesExecuted: queriesToRun.length,
        totalNewRecords,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      queriesExecuted: queriesToRun.length,
      totalNewRecords,
      summaries: executionSummaries,
    });
  } catch (err: any) {
    console.error('Error running batch queries:', err);
    return NextResponse.json({ error: 'Failed to batch execute intelligence queries' }, { status: 500 });
  }
}
