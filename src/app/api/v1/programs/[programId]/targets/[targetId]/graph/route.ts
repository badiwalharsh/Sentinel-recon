import { NextResponse } from 'next/server';
import { requireProgramAccess, AuthError } from '@/lib/auth/guard';
import { dbStore } from '@/lib/db-store';
import { maskObjectData } from '@/lib/reports/masking';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ programId: string; targetId: string }> }
) {
  try {
    const { programId, targetId } = await params;
    const { program } = await requireProgramAccess(programId, 'VIEWER');

    const target = dbStore.targets.find(
      (t) => (t.id === targetId || t.name === targetId) && t.programId === program.id
    );
    if (!target) {
      return NextResponse.json({ error: 'Target not found in program' }, { status: 404 });
    }

    const assets = dbStore.assets.filter(
      (a) => a.targetId === target.id || (a.programId === program.id && a.value.includes(target.primaryDomain))
    );
    const findings = dbStore.findings.filter(
      (f) => f.targetId === target.id || assets.some((a) => a.id === f.assetId)
    );

    const nodes: any[] = [];
    const edges: any[] = [];
    const edgeKeySet = new Set<string>();

    const addEdge = (source: string, targetIdStr: string, label: string) => {
      if (source === targetIdStr) return;
      const key = `${source}->${targetIdStr}:${label}`;
      if (edgeKeySet.has(key)) return;
      edgeKeySet.add(key);
      edges.push({
        data: {
          id: `e_${edges.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          source,
          target: targetIdStr,
          label,
        },
      });
    };

    // 1. Root Target Node
    const targetFindings = findings.filter((f) => f.targetId === target.id);
    const targetHighestSeverity = targetFindings.reduce<string | null>((highest, f) => {
      if (f.severity === 'CRITICAL') return 'CRITICAL';
      if (f.severity === 'HIGH' && highest !== 'CRITICAL') return 'HIGH';
      if (f.severity === 'MEDIUM' && !highest) return 'MEDIUM';
      return highest;
    }, null);

    nodes.push({
      data: {
        id: target.id,
        label: target.primaryDomain,
        type: 'DOMAIN',
        assetType: 'ROOT_DOMAIN',
        name: target.name,
        findingCount: targetFindings.length,
        highestSeverity: targetHighestSeverity,
        hasCriticalOrHigh: targetHighestSeverity === 'CRITICAL' || targetHighestSeverity === 'HIGH',
        inScope: true,
        size: 38,
        color: '#06b6d4', // Cyan
        metadata: {
          primaryDomain: target.primaryDomain,
          description: target.description,
          scopeCount: target.subdomainScope?.length || 0,
        },
      },
    });

    // 2. Asset Nodes
    assets.forEach((asset) => {
      const assetFindings = findings.filter(
        (f) => f.assetId === asset.id || f.affectedAssetIds?.includes(asset.id)
      );

      let highestSeverity: string | null = null;
      for (const f of assetFindings) {
        if (f.severity === 'CRITICAL') {
          highestSeverity = 'CRITICAL';
          break;
        }
        if (f.severity === 'HIGH') highestSeverity = 'HIGH';
        else if (f.severity === 'MEDIUM' && highestSeverity !== 'HIGH') highestSeverity = 'MEDIUM';
        else if (!highestSeverity) highestSeverity = f.severity;
      }

      let nodeColor = '#38bdf8'; // Sky default for subdomains
      let nodeSize = 24;
      let assetCategory = asset.type;

      switch (asset.type) {
        case 'ROOT_DOMAIN':
          nodeColor = '#06b6d4';
          nodeSize = 34;
          assetCategory = 'DOMAIN';
          break;
        case 'SUBDOMAIN':
          nodeColor = '#38bdf8'; // Sky
          nodeSize = 26;
          break;
        case 'IP_ADDRESS':
          nodeColor = '#f59e0b'; // Amber
          nodeSize = 22;
          break;
        case 'SERVICE':
          nodeColor = '#10b981'; // Emerald
          nodeSize = 20;
          break;
        case 'TECHNOLOGY':
          nodeColor = '#818cf8'; // Indigo
          nodeSize = 20;
          break;
        case 'CERTIFICATE':
          nodeColor = '#eab308'; // Yellow
          nodeSize = 22;
          break;
        case 'ENDPOINT':
          nodeColor = '#c084fc'; // Purple
          nodeSize = 18;
          break;
        default:
          nodeColor = '#94a3b8';
      }

      if (highestSeverity === 'CRITICAL') {
        nodeColor = '#f43f5e'; // Rose
      } else if (highestSeverity === 'HIGH') {
        nodeColor = '#f97316'; // Orange
      }

      nodes.push({
        data: {
          id: asset.id,
          label: asset.value,
          type: asset.type,
          assetType: asset.type,
          confidence: asset.confidence,
          inScope: asset.inScope,
          tags: asset.tags || [],
          findingCount: assetFindings.length,
          highestSeverity,
          hasCriticalOrHigh: highestSeverity === 'CRITICAL' || highestSeverity === 'HIGH',
          color: nodeColor,
          size: nodeSize,
          metadata: maskObjectData(asset.metadata || {}),
        },
      });
    });

    // 3. Connect Edges with exact semantic labels
    // “resolves to”, “runs”, “uses technology”, “covered by cert”, “exposes endpoint”
    assets.forEach((asset) => {
      // Find direct parent in assets
      const parentAsset = asset.parentId ? assets.find((a) => a.id === asset.parentId) : null;

      if (asset.type === 'SUBDOMAIN') {
        // Connect subdomain to target root domain
        addEdge(asset.id, target.id, 'subdomain of');
      }

      if (asset.type === 'IP_ADDRESS') {
        // IP Address resolves from subdomain or parent
        if (parentAsset && parentAsset.type === 'SUBDOMAIN') {
          addEdge(parentAsset.id, asset.id, 'resolves to');
        } else {
          // Check metadata for linkedSubdomain or connect to root target
          const linkedSub = asset.metadata?.linkedSubdomain
            ? assets.find((a) => a.value === asset.metadata.linkedSubdomain)
            : null;
          if (linkedSub) {
            addEdge(linkedSub.id, asset.id, 'resolves to');
          } else {
            addEdge(target.id, asset.id, 'resolves to');
          }
        }
      }

      if (asset.type === 'SERVICE') {
        // IP runs Service
        if (parentAsset && parentAsset.type === 'IP_ADDRESS') {
          addEdge(parentAsset.id, asset.id, 'runs');
        } else if (parentAsset && parentAsset.type === 'SUBDOMAIN') {
          // Subdomain exposes Service/host
          addEdge(parentAsset.id, asset.id, 'runs');
        } else {
          // Find any IP or connect to target
          const firstIp = assets.find((a) => a.type === 'IP_ADDRESS');
          if (firstIp) addEdge(firstIp.id, asset.id, 'runs');
          else addEdge(target.id, asset.id, 'runs');
        }
      }

      if (asset.type === 'TECHNOLOGY') {
        // Uses technology
        if (parentAsset) {
          addEdge(parentAsset.id, asset.id, 'uses technology');
        } else {
          // Connect to target or related subdomain
          const techHost = asset.metadata?.detectedOn
            ? assets.find((a) => a.value === asset.metadata.detectedOn)
            : null;
          if (techHost) {
            addEdge(techHost.id, asset.id, 'uses technology');
          } else {
            addEdge(target.id, asset.id, 'uses technology');
          }
        }
      }

      if (asset.type === 'CERTIFICATE') {
        // Covered by cert
        if (parentAsset) {
          addEdge(parentAsset.id, asset.id, 'covered by cert');
        } else {
          addEdge(target.id, asset.id, 'covered by cert');
        }
        // If certificate has SANs, also link matching subdomains
        if (asset.metadata?.sans && Array.isArray(asset.metadata.sans)) {
          assets
            .filter((a) => a.type === 'SUBDOMAIN' && asset.metadata.sans.includes(a.value))
            .forEach((sub) => {
              addEdge(sub.id, asset.id, 'covered by cert');
            });
        }
      }

      if (asset.type === 'ENDPOINT') {
        // Exposes endpoint
        if (parentAsset && (parentAsset.type === 'SUBDOMAIN' || parentAsset.type === 'SERVICE')) {
          addEdge(parentAsset.id, asset.id, 'exposes endpoint');
        } else {
          const epHost = asset.metadata?.host ? assets.find((a) => a.value === asset.metadata.host) : null;
          if (epHost) {
            addEdge(epHost.id, asset.id, 'exposes endpoint');
          } else {
            addEdge(target.id, asset.id, 'exposes endpoint');
          }
        }
      }

      if (asset.type === 'PARAMETER' && parentAsset) {
        addEdge(parentAsset.id, asset.id, 'parameter of');
      }
    });

    // Collect available technology names and asset types for UI filters
    const availableTechnologies = Array.from(
      new Set(assets.filter((a) => a.type === 'TECHNOLOGY').map((a) => a.value))
    );
    const availableAssetTypes = Array.from(new Set(nodes.map((n) => n.data.type)));

    return NextResponse.json({
      target: {
        id: target.id,
        name: target.name,
        primaryDomain: target.primaryDomain,
      },
      elements: {
        nodes,
        edges,
      },
      filters: {
        assetTypes: availableAssetTypes,
        technologies: availableTechnologies,
        severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      },
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        vulnerableNodeCount: nodes.filter((n) => n.data.hasCriticalOrHigh).length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Target Graph error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
