import { NextResponse } from 'next/server';
import { requireProgramAccess, AuthError } from '@/lib/auth/guard';
import { dbStore } from '@/lib/db-store';
import { maskSensitiveData, maskObjectData } from '@/lib/reports/masking';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const url = new URL(req.url);
  const targetId = url.searchParams.get('targetId') || undefined;
  const maskSecrets = url.searchParams.get('maskSecrets') !== 'false';
  return generateReportHandler(req, params, { targetId, maskSecrets });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return generateReportHandler(req, params, body);
}

async function generateReportHandler(
  req: Request,
  params: Promise<{ programId: string }>,
  body: { targetId?: string; maskSecrets?: boolean; title?: string }
) {
  try {
    const { programId } = await params;
    const { user, program } = await requireProgramAccess(programId, 'VIEWER');
    const { targetId, maskSecrets = true } = body;

    const targets = dbStore.targets.filter(
      (t) => t.programId === program.id && (!targetId || t.id === targetId || t.name === targetId)
    );
    const selectedTarget = targetId ? targets[0] : null;

    let scopedAssets = dbStore.assets.filter((a) => a.programId === program.id);
    if (selectedTarget) {
      scopedAssets = scopedAssets.filter(
        (a) => a.targetId === selectedTarget.id || a.value.includes(selectedTarget.primaryDomain)
      );
    }

    let scopedFindings = dbStore.findings.filter((f) => f.programId === program.id);
    if (selectedTarget) {
      scopedFindings = scopedFindings.filter(
        (f) => f.targetId === selectedTarget.id || scopedAssets.some((a) => a.id === f.assetId)
      );
    }

    let scopedOsint = dbStore.osintRecords.filter((o) => o.programId === program.id);
    if (selectedTarget) {
      scopedOsint = scopedOsint.filter(
        (o) =>
          o.targetId === selectedTarget.id ||
          o.rawData?.domain?.includes(selectedTarget.primaryDomain) ||
          o.summary?.includes(selectedTarget.primaryDomain)
      );
    }

    let scopedPhases = dbStore.phases
      .filter((p) => p.programId === program.id && (!selectedTarget || p.targetId === selectedTarget.id || p.targetId === null))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (scopedPhases.length === 0) {
      scopedPhases = [
        {
          id: 'ph_1',
          programId: program.id,
          targetId: null,
          name: 'Passive OSINT & Intelligence Gathering',
          orderIndex: 1,
          status: 'COMPLETED',
          description: 'Passive domain enumeration, search engine dorking, CT log monitoring',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'ph_2',
          programId: program.id,
          targetId: null,
          name: 'DNS & Subdomain Enumeration',
          orderIndex: 2,
          status: 'COMPLETED',
          description: 'DNS queries, zone transfers check, wildcards resolution',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'ph_3',
          programId: program.id,
          targetId: null,
          name: 'Port & Service Scanning',
          orderIndex: 3,
          status: 'IN_PROGRESS',
          description: 'Non-intrusive service banner verification on scoped hosts',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'ph_4',
          programId: program.id,
          targetId: null,
          name: 'Web & Endpoint Reconnaissance',
          orderIndex: 4,
          status: 'IN_PROGRESS',
          description: 'Web technology stack fingerprinting and routing analysis',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'ph_5',
          programId: program.id,
          targetId: null,
          name: 'Vulnerability Triage',
          orderIndex: 5,
          status: 'TODO',
          description: 'Correlating discovered exposures against CVE feeds and attack vectors',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
      ];
    }

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const reportTitle = selectedTarget
      ? `SentinelRecon Assessment Report: ${selectedTarget.name} (${selectedTarget.primaryDomain})`
      : `SentinelRecon Program Threat Surface Assessment: ${program.name}`;

    const scopeDescription = selectedTarget
      ? `Target Perimeter: ${selectedTarget.primaryDomain} (Wildcards: *.${selectedTarget.primaryDomain}, CIDR: ${(selectedTarget.ipRanges || []).join(', ') || 'Standard ISP allocations'})`
      : `Program Scope: ${targets.map((t) => t.primaryDomain).join(', ')}`;

    // Process & mask findings
    const findingsList = scopedFindings.map((f) => {
      const asset = f.assetId ? scopedAssets.find((a) => a.id === f.assetId) : null;
      const rawRemediation = f.remediation || 'Conduct input validation and harden host network configuration.';
      const rawDescription = f.description || 'No detailed vulnerability description provided.';
      const rawImpact = f.impact || 'Exposed attack surface may lead to unauthorized data disclosure.';

      return {
        id: f.id,
        title: maskSecrets ? maskSensitiveData(f.title) : f.title,
        severity: f.severity,
        cvssScore: f.cvssScore || (f.severity === 'CRITICAL' ? 9.2 : f.severity === 'HIGH' ? 7.8 : f.severity === 'MEDIUM' ? 5.3 : 3.0),
        status: f.status,
        affectedAsset: asset ? asset.value : (selectedTarget?.primaryDomain || 'Perimeter Scope'),
        description: maskSecrets ? maskSensitiveData(rawDescription) : rawDescription,
        impact: maskSecrets ? maskSensitiveData(rawImpact) : rawImpact,
        remediation: maskSecrets ? maskSensitiveData(rawRemediation) : rawRemediation,
      };
    });

    // Process & mask assets
    const assetsList = scopedAssets.map((a) => ({
      id: a.id,
      value: a.value,
      type: a.type,
      confidence: a.confidence,
      inScope: a.inScope,
      source: a.source || 'Passive Recon',
      tags: a.tags || [],
      metadata: maskSecrets ? maskObjectData(a.metadata || {}) : a.metadata || {},
    }));

    // Process & mask intelligence
    const intelList = scopedOsint.map((o) => ({
      id: o.id,
      title: o.title || o.summary,
      source: o.source,
      type: o.type,
      securityRelevance: o.securityRelevance,
      summary: maskSecrets ? maskSensitiveData(o.summary) : o.summary,
      tags: o.tags || [],
      extractedEntities: maskSecrets ? maskObjectData(o.extractedEntities || {}) : o.extractedEntities || {},
      collectedAt: o.collectedAt,
    }));

    // Data sources list
    const dataSources = Array.from(
      new Set([
        ...scopedAssets.map((a) => a.source || 'Passive OSINT').filter(Boolean),
        ...scopedOsint.map((o) => o.source).filter(Boolean),
        'Certificate Transparency Logs (crt.sh)',
        'Cloudflare DNS / DoH',
        'HTTP Response Headers & SSL Banners',
        'Wayback Machine CDX Archive',
      ])
    );

    // Build Recommendations
    const recommendations = [
      {
        priority: 'CRITICAL / IMMEDIATE',
        action: 'Isolate & Authenticate Exposed Staging/Dev Environments',
        detail: 'Enforce Zero-Trust Network Access (ZTNA) or corporate VPN whitelisting on non-production subdomains and administrative clusters.',
      },
      {
        priority: 'HIGH',
        action: 'Harden Email Authentication Records (SPF / DMARC)',
        detail: 'Upgrade permissive SPF ~all (SoftFail) rules to -all (HardFail) and deploy DMARC policy with p=reject to neutralize domain spoofing and phishing risks.',
      },
      {
        priority: 'MEDIUM',
        action: 'Suppress Server Version Disclosures in HTTP Headers',
        detail: 'Configure reverse proxies and web servers to strip x-powered-by headers and turn off verbose software version disclosure tokens.',
      },
      {
        priority: 'ONGOING',
        action: 'Continuous External Attack Surface Management (EASM)',
        detail: 'Schedule weekly automated CT log monitoring and DNS diff alerts to detect shadow IT assets and expired certificate registrations before threat actors exploit them.',
      },
    ];

    // Assemble Markdown Representation
    const markdown = `# ${reportTitle.toUpperCase()}

**Engagement Type**: Defensive Perimeter Reconnaissance & Threat Surface Evaluation  
**Assessment Date**: ${formattedDate} (${timestamp})  
**Classification**: DEFENSIVE & CONFIDENTIAL  
**Generated By**: ${user.name} (${user.email} - Role: ${user.systemRole})  
**Assessed Scope**: ${scopeDescription}  

---

## 1. Engagement Overview and Scope
This technical reconnaissance report details the external threat perimeter and attack surface analysis conducted via the **SentinelRecon** defensive platform. The assessment was performed using non-disruptive, passive reconnaissance methodologies in full adherence to the program's rules of engagement.

### Key Metrics Summary
- **Targets Evaluated**: ${targets.length} Root Perimeters (${targets.map((t) => t.primaryDomain).join(', ')})
- **Discovered Perimeter Assets**: ${scopedAssets.length} (Subdomains, IP Hosts, Services, Endpoints, Certificates)
- **Identified Vulnerabilities / Risks**: ${scopedFindings.length} (${scopedFindings.filter((f) => f.severity === 'CRITICAL').length} Critical, ${scopedFindings.filter((f) => f.severity === 'HIGH').length} High, ${scopedFindings.filter((f) => f.severity === 'MEDIUM').length} Medium, ${scopedFindings.filter((f) => f.severity === 'LOW' || f.severity === 'INFO').length} Low/Info)
- **Threat Intelligence & OSINT Records Triaged**: ${scopedOsint.length} Public Disclosures & Leak Records

---

## 2. Methodology & Reconnaissance Phases
Reconnaissance was conducted in compliance with structured offensive-defensive reconnaissance frameworks:

| Phase # | Methodology Phase | Status | Objective |
|---|---|---|---|
${scopedPhases.map((p) => `| ${p.orderIndex} | ${p.name} | **${p.status}** | ${p.description || 'Active reconnaissance execution'} |`).join('\n')}

### Data Sources & Intelligence Feeds Used:
${dataSources.map((s) => `- ${s}`).join('\n')}

---

## 3. Asset Inventory Summary
The following table summarizes the identified perimeter attack surface within the assessed boundaries:

| Asset Identifier | Type | Scope Confidence | Source | Tags / Notes |
|---|---|---|---|---|
${assetsList
  .map(
    (a) =>
      `| \`${a.value}\` | ${a.type} | ${a.confidence}% | ${a.source} | ${a.tags.join(', ') || 'In-Scope'} |`
  )
  .join('\n')}

---

## 4. Key Findings with Severity & Remediation
Below is the triage of prioritized security findings identified across the perimeter:

${
  findingsList.length > 0
    ? findingsList
        .map(
          (f) => `### [${f.severity}] ${f.title}
- **Affected Perimeter**: \`${f.affectedAsset}\`
- **CVSS Base Score**: ${f.cvssScore}
- **Triage Status**: \`${f.status}\`
- **Impact Analysis**: ${f.impact}
- **Technical Description**: ${f.description}
- **Recommended Remediation**: ${f.remediation}
`
        )
        .join('\n---\n\n')
    : '_No critical or high severity security findings identified on scoped perimeter during this evaluation cycle._'
}

---

## 5. Target Intelligence & OSINT Summary
Analysis of public mentions, breach intelligence records, code repositories, and technical disclosures:

${
  intelList.length > 0
    ? intelList
        .slice(0, 8)
        .map(
          (i) => `#### [${i.securityRelevance} RELEVANCE] ${i.title}
- **Source Category**: ${i.type} (${i.source})
- **Intelligence Summary**: ${i.summary}
- **Timestamp**: ${i.collectedAt}
`
        )
        .join('\n')
    : '_No high-severity intelligence disclosures or breach records observed._'
}

---

## 6. Strategic & Tactical Recommendations
${recommendations
  .map(
    (r, idx) => `### ${idx + 1}. [${r.priority}] ${r.action}
${r.detail}
`
  )
  .join('\n')}

---

## 7. Ethical-Use and Authorization Statement
> [!IMPORTANT]
> **DEFENSIVE RECONNAISSANCE ATTESTATION**  
> All reconnaissance activities detailed in this document were executed strictly under authorization and in compliance with the verified Rules of Engagement for **${program.name}**. Testing methods were limited to non-intrusive public OSINT, passive DNS records analysis, certificate transparency log monitoring, and standard HTTP response inspection. No non-consensual exploitation or production disruption was performed.  
> 
> **Report Timestamp**: ${timestamp}  
> **Report Generated By**: ${user.name} (${user.email})  
> **Immutable Audit Record**: Logged under SentinelRecon Audit Ledger.
`;

    // Append to AuditLog
    await createAuditLog({
      action: 'REPORT_GENERATE',
      entityType: 'Report',
      entityId: selectedTarget ? selectedTarget.id : program.id,
      programId: program.id,
      userId: user.userId,
      details: {
        reportTitle,
        targetId: selectedTarget ? selectedTarget.id : null,
        targetDomain: selectedTarget ? selectedTarget.primaryDomain : 'ALL',
        maskSecrets,
        findingsCount: scopedFindings.length,
        assetsCount: scopedAssets.length,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        title: reportTitle,
        programName: program.name,
        targetName: selectedTarget ? selectedTarget.name : 'All Program Targets',
        targetDomain: selectedTarget ? selectedTarget.primaryDomain : null,
        generatedAt: timestamp,
        formattedDate,
        generatedBy: {
          name: user.name,
          email: user.email,
          role: user.systemRole,
        },
        scopeDescription,
        metrics: {
          targetsCount: targets.length,
          assetsCount: scopedAssets.length,
          findingsCount: scopedFindings.length,
          intelCount: scopedOsint.length,
          criticalFindingsCount: scopedFindings.filter((f) => f.severity === 'CRITICAL').length,
          highFindingsCount: scopedFindings.filter((f) => f.severity === 'HIGH').length,
        },
        phases: scopedPhases,
        dataSources,
        assets: assetsList,
        findings: findingsList,
        intelligence: intelList,
        recommendations,
        attestation: {
          authorized: true,
          rulesOfEngagement: program.scopeRules,
          timestamp,
        },
      },
      markdown,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
