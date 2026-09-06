import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockOSINTRecord, MockIntelligenceQuery } from '@/lib/db-store';
import { searchIntelligenceSchema } from '@/lib/validations/intelligence';
import { searchTargetIntelligence } from '@/lib/intelligence/search-service';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges for intelligence search' }, { status: 403 });
  }

  // Rate Limiting (20 queries / 60 seconds per user)
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`intel:search:${user.userId || ip}`, 20, 60);
  if (!rateCheck.success) {
    return NextResponse.json(
      {
        error: 'Intelligence query rate limit reached. Please wait before executing additional queries.',
        retryAfter: rateCheck.resetSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': rateCheck.resetSeconds.toString(),
        },
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = searchIntelligenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid intelligence search payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetId, domain, orgName, query, queryTemplate, sourceType, saveResults } = parsed.data;

    let target = null;
    let targetDomain = domain;
    let targetOrgName = orgName || program.name;

    if (targetId) {
      target = dbStore.targets.find((t) => t.id === targetId && t.programId === program.id);
      if (!target) {
        return NextResponse.json({ error: 'Target not found in this program' }, { status: 404 });
      }
      targetDomain = target.primaryDomain;
      targetOrgName = target.name || targetOrgName;
    }

    if (!targetDomain) {
      targetDomain = query.split(' ')[0].replace(/^site:/, '');
    }

    // Execute server-side search
    const intelResults = await searchTargetIntelligence({
      domain: targetDomain,
      orgName: targetOrgName,
      query,
      queryTemplate: queryTemplate || undefined,
      sourceType: sourceType || undefined,
    });

    const createdRecords: MockOSINTRecord[] = [];

    if (saveResults !== false) {
      const now = new Date().toISOString();

      for (const item of intelResults) {
        // Check for duplicates by URL or title within this program/target
        const exists = dbStore.osintRecords.find(
          (r) =>
            r.programId === program.id &&
            ((r.url && r.url === item.url) || (r.title && r.title === item.title))
        );

        if (!exists) {
          const newRecord: MockOSINTRecord = {
            id: `osint_intel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: target?.id || targetId || null,
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
          createdRecords.push(newRecord);
        }
      }

      // Update or create IntelligenceQuery in store
      let intelQuery = dbStore.intelligenceQueries.find(
        (q) =>
          q.programId === program.id &&
          (target ? q.targetId === target.id : true) &&
          (q.queryString.toLowerCase() === query.toLowerCase() ||
            (queryTemplate && q.queryTemplate === queryTemplate))
      );

      if (intelQuery) {
        intelQuery.lastRunAt = now;
        intelQuery.resultCount = intelResults.length;
        intelQuery.results = { count: intelResults.length, latestItems: intelResults.slice(0, 5) };
        intelQuery.updatedAt = now;
      } else {
        const newQuery: MockIntelligenceQuery = {
          id: `iq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          programId: program.id,
          targetId: target?.id || targetId || null,
          queryTemplate: queryTemplate || query,
          queryString: query,
          lastRunAt: now,
          resultCount: intelResults.length,
          results: { count: intelResults.length, latestItems: intelResults.slice(0, 5) },
          createdAt: now,
          updatedAt: now,
        };
        dbStore.intelligenceQueries.unshift(newQuery);
      }

      // Immutable Audit Log
      await createAuditLog({
        action: 'INTELLIGENCE_QUERY_RUN',
        entityType: 'IntelligenceQuery',
        entityId: target?.id || null,
        programId: program.id,
        userId: user.userId,
        details: {
          query,
          queryTemplate,
          targetDomain,
          resultsCount: intelResults.length,
          newRecordsSaved: createdRecords.length,
        },
        req,
      });
    }

    return NextResponse.json({
      success: true,
      query,
      resultsCount: intelResults.length,
      savedRecordsCount: createdRecords.length,
      results: intelResults,
    });
  } catch (err: any) {
    console.error('Error executing intelligence search:', err);
    return NextResponse.json({ error: 'Failed to execute intelligence search' }, { status: 500 });
  }
}
