import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockAsset, MockOSINTRecord } from '@/lib/db-store';
import { runComprehensivePassiveRecon } from '@/lib/recon/passive';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to initiate recon' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { domain, targetId } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Valid target domain is required' }, { status: 400 });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].trim();
    const target = targetId ? dbStore.targets.find((t) => t.id === targetId && t.programId === program.id) : null;
    const now = new Date().toISOString();

    // 1. Run Comprehensive Passive OSINT Engine
    const reconResult = await runComprehensivePassiveRecon(cleanDomain);

    const createdRecords: MockOSINTRecord[] = [];
    const createdAssets: MockAsset[] = [];

    // Find or create root domain asset
    let rootAsset = dbStore.assets.find(
      (a) => a.programId === program.id && a.type === 'ROOT_DOMAIN' && a.value.toLowerCase() === cleanDomain.toLowerCase()
    );

    if (!rootAsset) {
      rootAsset = {
        id: `ast_root_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        parentId: null,
        type: 'ROOT_DOMAIN',
        value: cleanDomain,
        confidence: 100,
        inScope: true,
        source: 'Target Root Domain',
        tags: ['Root-Domain', 'Primary'],
        metadata: {
          scannedAt: now,
          nameservers: reconResult.dnsRecords.ns.map((n) => n.data),
        },
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.assets.unshift(rootAsset);
      createdAssets.push(rootAsset);
    }

    // A. Store OSINT Record for DNS
    const totalDns =
      reconResult.dnsRecords.a.length +
      reconResult.dnsRecords.aaaa.length +
      reconResult.dnsRecords.mx.length +
      reconResult.dnsRecords.txt.length +
      reconResult.dnsRecords.ns.length +
      reconResult.dnsRecords.cname.length;

    if (totalDns > 0) {
      const spfRecord = reconResult.dnsRecords.txt.find((t) => t.data.includes('spf1'));
      const dnsOSINT: MockOSINTRecord = {
        id: `osint_dns_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        assetId: rootAsset.id,
        type: 'DNS_RECORD',
        source: 'Cloudflare 1.1.1.1 DNS-over-HTTPS',
        url: `https://cloudflare-dns.com/dns-query?name=${cleanDomain}`,
        rawData: reconResult.dnsRecords,
        summary: `Passive DNS resolution yielded ${reconResult.dnsRecords.a.length} A, ${reconResult.dnsRecords.aaaa.length} AAAA, ${reconResult.dnsRecords.mx.length} MX, ${reconResult.dnsRecords.ns.length} NS, and ${reconResult.dnsRecords.txt.length} TXT records for ${cleanDomain}.`,
        securityRelevance: spfRecord ? 3 : 5,
        tags: ['DNS', 'DoH', 'Zone-Records'],
        extractedEntities: {
          ips: reconResult.discoveredAssets.ips,
          mailServers: reconResult.dnsRecords.mx.map((m) => m.data),
          nameservers: reconResult.dnsRecords.ns.map((n) => n.data),
        },
        collectedAt: now,
      };
      dbStore.osintRecords.unshift(dnsOSINT);
      createdRecords.push(dnsOSINT);

      // Ingest discovered IP addresses as Assets linked to root domain
      reconResult.discoveredAssets.ips.slice(0, 5).forEach((ip) => {
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value === ip)) {
          const newIpAsset: MockAsset = {
            id: `ast_ip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'IP_ADDRESS',
            value: ip,
            confidence: 100,
            inScope: true,
            source: 'DNS A/AAAA Resolution',
            tags: ['DNS-Discovered', 'IP'],
            metadata: { resolvedDomain: cleanDomain },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newIpAsset);
          createdAssets.push(newIpAsset);
        }
      });
    }

    // B. Store OSINT Record for WHOIS / RDAP
    if (reconResult.whois) {
      const whoisOSINT: MockOSINTRecord = {
        id: `osint_whois_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        assetId: rootAsset.id,
        type: 'WHOIS',
        source: 'RDAP WHOIS Directory',
        url: `https://rdap.org/domain/${cleanDomain}`,
        rawData: reconResult.whois,
        summary: `Domain registered via ${reconResult.whois.registrar || 'Registry'}. Status: ${(
          reconResult.whois.status || []
        ).join(', ') || 'Active'}. Expiry: ${reconResult.whois.expirationDate || 'N/A'}.`,
        securityRelevance: reconResult.whois.expirationDate ? 2 : 4,
        tags: ['WHOIS', 'RDAP', 'Registrar-Info'],
        extractedEntities: {
          registrar: reconResult.whois.registrar,
          registrantOrg: reconResult.whois.registrantOrg,
          country: reconResult.whois.registrantCountry,
          nameservers: reconResult.whois.nameServers,
        },
        collectedAt: now,
      };
      dbStore.osintRecords.unshift(whoisOSINT);
      createdRecords.push(whoisOSINT);
    }

    // C. Store OSINT Record for Certificate Transparency
    if (reconResult.ctDiscovery.subdomains.length > 0 || reconResult.ctDiscovery.certificates.length > 0) {
      const ctOSINT: MockOSINTRecord = {
        id: `osint_ct_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        assetId: rootAsset.id,
        type: 'CERT_TRANSPARENCY',
        source: 'crt.sh Certificate Transparency Logs',
        url: `https://crt.sh/?q=%25.${cleanDomain}`,
        rawData: reconResult.ctDiscovery,
        summary: `Passive CT log analysis discovered ${reconResult.ctDiscovery.subdomains.length} subdomains and ${reconResult.ctDiscovery.certificates.length} certificate records associated with *.${cleanDomain}.`,
        securityRelevance: 7,
        tags: ['CT-Logs', 'Subdomain-Discovery', 'Certificates'],
        extractedEntities: {
          subdomains: reconResult.ctDiscovery.subdomains,
          certificateCount: reconResult.ctDiscovery.certificates.length,
        },
        collectedAt: now,
      };
      dbStore.osintRecords.unshift(ctOSINT);
      createdRecords.push(ctOSINT);

      // Ingest discovered subdomains into Asset inventory
      reconResult.ctDiscovery.subdomains.slice(0, 15).forEach((sub) => {
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value.toLowerCase() === sub.toLowerCase())) {
          const newSubAsset: MockAsset = {
            id: `ast_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'SUBDOMAIN',
            value: sub,
            confidence: 95,
            inScope: true,
            source: 'crt.sh Certificate Transparency',
            tags: ['OSINT-Discovered', 'Subdomain'],
            metadata: { parentDomain: cleanDomain },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newSubAsset);
          createdAssets.push(newSubAsset);
        }
      });

      // Ingest certificates
      reconResult.ctDiscovery.certificates.slice(0, 5).forEach((cert) => {
        const certValue = `CN=${cert.commonName} (${cert.issuer.split(',')[0]})`;
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value === certValue)) {
          const newCertAsset: MockAsset = {
            id: `ast_cert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'CERTIFICATE',
            value: certValue,
            confidence: 100,
            inScope: true,
            source: 'crt.sh Certificate Transparency',
            tags: ['TLS-Certificate', 'CT-Log'],
            metadata: {
              issuer: cert.issuer,
              sans: cert.sanList,
              notBefore: cert.notBefore,
              notAfter: cert.notAfter,
            },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newCertAsset);
          createdAssets.push(newCertAsset);
        }
      });
    }

    // D. Store OSINT Record for Wayback Archive URLs
    if (reconResult.waybackArchive.urlCount > 0) {
      const archiveOSINT: MockOSINTRecord = {
        id: `osint_arch_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        assetId: rootAsset.id,
        type: 'ARCHIVE_SNAPSHOT',
        source: 'Wayback Machine CDX API',
        url: `https://web.archive.org/cdx/search/cdx?url=*.${cleanDomain}/*`,
        rawData: reconResult.waybackArchive,
        summary: `Wayback historical snapshot index uncovered ${reconResult.waybackArchive.urlCount} indexed URLs, ${reconResult.waybackArchive.endpoints.length} unique endpoints, and ${reconResult.waybackArchive.parameters.length} unique parameter names.`,
        securityRelevance: reconResult.waybackArchive.parameters.length > 0 ? 6 : 4,
        tags: ['Wayback', 'Archives', 'Endpoints', 'Parameters'],
        extractedEntities: {
          endpoints: reconResult.waybackArchive.endpoints,
          parameters: reconResult.waybackArchive.parameters,
        },
        collectedAt: now,
      };
      dbStore.osintRecords.unshift(archiveOSINT);
      createdRecords.push(archiveOSINT);

      // Ingest endpoints as Assets
      reconResult.waybackArchive.endpoints.slice(0, 8).forEach((ep) => {
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value === ep)) {
          const newEpAsset: MockAsset = {
            id: `ast_ep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'ENDPOINT',
            value: ep,
            confidence: 85,
            inScope: true,
            source: 'Wayback Machine CDX',
            tags: ['Historical-Endpoint', 'Archive'],
            metadata: { host: cleanDomain },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newEpAsset);
          createdAssets.push(newEpAsset);
        }
      });

      // Ingest parameters as Assets
      if (reconResult.waybackArchive.parameters.length > 0) {
        const paramStr = reconResult.waybackArchive.parameters.slice(0, 5).join(', ');
        const paramVal = `params: [${paramStr}]`;
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value === paramVal)) {
          const newParamAsset: MockAsset = {
            id: `ast_param_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'PARAMETER',
            value: paramVal,
            confidence: 80,
            inScope: true,
            source: 'Wayback Machine CDX',
            tags: ['Query-Parameters', 'Archive-Discovery'],
            metadata: { parameters: reconResult.waybackArchive.parameters },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newParamAsset);
          createdAssets.push(newParamAsset);
        }
      }
    }

    // E. Store OSINT Record for HTTP Tech Fingerprint
    if (reconResult.httpAnalysis.technologies.length > 0 || reconResult.httpAnalysis.statusCode) {
      const missingCount = reconResult.httpAnalysis.missingSecurityHeaders.length;
      const techOSINT: MockOSINTRecord = {
        id: `osint_tech_${Date.now()}`,
        programId: program.id,
        targetId: targetId || null,
        assetId: rootAsset.id,
        type: 'TECH_FINGERPRINT',
        source: 'Passive HTTP Header Fingerprint',
        url: `https://${cleanDomain}`,
        rawData: reconResult.httpAnalysis,
        summary: `Passive HTTP probe (${reconResult.httpAnalysis.statusCode || '200 OK'}) identified ${
          reconResult.httpAnalysis.technologies.length
        } technologies. ${
          missingCount > 0
            ? `Security header gaps: ${reconResult.httpAnalysis.missingSecurityHeaders.join(', ')}.`
            : 'Standard security headers present.'
        }`,
        securityRelevance: reconResult.httpAnalysis.securityScore,
        tags: ['HTTP-Headers', 'Fingerprint', 'Security-Score'],
        extractedEntities: {
          technologies: reconResult.httpAnalysis.technologies.map((t: any) => typeof t === 'string' ? t : `${t.name} (${t.category})`),
          missingSecurityHeaders: reconResult.httpAnalysis.missingSecurityHeaders,
          statusCode: reconResult.httpAnalysis.statusCode,
        },
        collectedAt: now,
      };
      dbStore.osintRecords.unshift(techOSINT);
      createdRecords.push(techOSINT);

      // Ingest detected technologies as Assets
      reconResult.httpAnalysis.technologies.forEach((tech) => {
        const techVal = `${tech.name} (${tech.category})`;
        if (!dbStore.assets.some((a) => a.programId === program.id && a.value === techVal)) {
          const newTechAsset: MockAsset = {
            id: `ast_tech_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId: targetId || null,
            parentId: rootAsset!.id,
            type: 'TECHNOLOGY',
            value: techVal,
            confidence: tech.confidence,
            inScope: true,
            source: 'HTTP Header Fingerprint',
            tags: ['Technology', tech.category.replace(/[\s\/]+/g, '-')],
            metadata: {
              category: tech.category,
              detectedOn: cleanDomain,
            },
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.assets.push(newTechAsset);
          createdAssets.push(newTechAsset);
        }
      });
    }

    // Log the entire collection run to AuditLog
    await createAuditLog({
      action: 'OSINT_INGEST',
      entityType: 'Target',
      entityId: targetId || null,
      programId: program.id,
      userId: user.userId,
      details: {
        domain: cleanDomain,
        targetName: target?.name || cleanDomain,
        recordsCreated: createdRecords.length,
        assetsCreated: createdAssets.length,
        subdomainsFound: reconResult.ctDiscovery.subdomains.length,
        ipsFound: reconResult.discoveredAssets.ips.length,
        endpointsFound: reconResult.waybackArchive.endpoints.length,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Passive OSINT collection completed. Created ${createdRecords.length} OSINT records and ingested ${createdAssets.length} new assets.`,
      recordsCount: createdRecords.length,
      assetsCount: createdAssets.length,
      reconResult,
    });
  } catch (err: any) {
    console.error('Scan error:', err);
    return NextResponse.json({ error: 'Passive scan failed due to internal error' }, { status: 500 });
  }
}
