'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Filter,
  Download,
  AlertTriangle,
  X,
  Layers,
  Shield,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GraphNodeData {
  id: string;
  label: string;
  type: string;
  assetType?: string;
  name?: string;
  confidence?: number;
  inScope?: boolean;
  tags?: string[];
  findingCount?: number;
  highestSeverity?: string | null;
  hasCriticalOrHigh?: boolean;
  color?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface RelationshipGraphProps {
  initialElements?: {
    nodes: Array<{ data: GraphNodeData }>;
    edges: Array<{ data: GraphEdgeData }>;
  };
  endpointUrl?: string;
  targetName?: string;
  height?: string;
}

const LAYOUT_OPTIONS = [
  { id: 'cose', label: 'Force (COSE)' },
  { id: 'breadthfirst', label: 'Hierarchy (Tree)' },
  { id: 'concentric', label: 'Concentric Rings' },
  { id: 'circle', label: 'Circular' },
];

export default function RelationshipGraph({
  initialElements,
  endpointUrl,
  targetName,
  height = '620px',
}: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [loading, setLoading] = useState(!initialElements);
  const [error, setError] = useState<string | null>(null);
  const [elements, setElements] = useState<{
    nodes: Array<{ data: GraphNodeData }>;
    edges: Array<{ data: GraphEdgeData }>;
  }>(initialElements || { nodes: [], edges: [] });

  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [activeLayout, setActiveLayout] = useState('cose');

  // Filters
  const [assetTypeFilter, setAssetTypeFilter] = useState('ALL');
  const [technologyFilter, setTechnologyFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract filter options from elements
  const assetTypes = Array.from(
    new Set(elements.nodes.map((n) => n.data.type || n.data.assetType || 'ASSET'))
  );
  const technologies = Array.from(
    new Set(
      elements.nodes
        .filter((n) => n.data.type === 'TECHNOLOGY')
        .map((n) => n.data.label)
    )
  );

  // Fetch data if endpointUrl provided
  const loadData = useCallback(async () => {
    if (!endpointUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpointUrl);
      if (!res.ok) throw new Error(`Failed to load relationship graph: HTTP ${res.status}`);
      const data = await res.json();
      setElements(data.elements || { nodes: [], edges: [] });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [endpointUrl]);

  useEffect(() => {
    if (endpointUrl && !initialElements) {
      loadData();
    }
  }, [endpointUrl, initialElements, loadData]);

  // Apply layout
  const applyLayout = useCallback(
    (cy: Core, layoutName: string) => {
      let layoutConfig: any = { name: layoutName, animate: true, animationDuration: 400 };

      if (layoutName === 'cose') {
        layoutConfig = {
          name: 'cose',
          idealEdgeLength: () => 110,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 50,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: () => 400000,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 800,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        };
      } else if (layoutName === 'breadthfirst') {
        layoutConfig = {
          name: 'breadthfirst',
          directed: true,
          padding: 40,
          spacingFactor: 1.25,
          avoidOverlap: true,
        };
      } else if (layoutName === 'concentric') {
        layoutConfig = {
          name: 'concentric',
          padding: 40,
          minNodeSpacing: 60,
          concentric: (node: NodeSingular) => {
            if (node.data('type') === 'DOMAIN' || node.data('type') === 'ROOT_DOMAIN') return 4;
            if (node.data('type') === 'SUBDOMAIN') return 3;
            if (node.data('type') === 'IP_ADDRESS') return 2;
            return 1;
          },
          levelWidth: () => 1,
        };
      }

      cy.layout(layoutConfig).run();
    },
    []
  );

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || elements.nodes.length === 0) return;

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...elements.nodes, ...elements.edges],
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.25,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#cbd5e1',
            'font-size': '10px',
            'font-family': 'monospace',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-max-width': '120px',
            'text-wrap': 'ellipsis',
            width: 'data(size)',
            height: 'data(size)',
            'border-width': 2,
            'border-color': '#0f172a',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node[type = "DOMAIN"], node[type = "ROOT_DOMAIN"]',
          style: {
            shape: 'hexagon',
            'font-weight': 'bold',
            'font-size': '12px',
            color: '#38bdf8',
          },
        },
        {
          selector: 'node[type = "IP_ADDRESS"]',
          style: {
            shape: 'diamond',
          },
        },
        {
          selector: 'node[type = "TECHNOLOGY"]',
          style: {
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'node[type = "CERTIFICATE"]',
          style: {
            shape: 'triangle',
          },
        },
        {
          selector: 'node[?hasCriticalOrHigh]',
          style: {
            'border-color': '#f43f5e',
            'border-width': 3,
            'border-style': 'solid',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#06b6d4',
            'border-width': 4,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '8px',
            'font-family': 'monospace',
            color: '#64748b',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-color': '#020617',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#06b6d4',
            'target-arrow-color': '#06b6d4',
            width: 2.5,
          },
        },
      ],
    });

    cy.on('tap', 'node', (evt) => {
      setSelectedNode(evt.target.data());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;
    applyLayout(cy, activeLayout);

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, applyLayout, activeLayout]);

  // Apply interactive node visibility filtering
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const data = node.data() as GraphNodeData;

        // 1. Asset Type Filter
        let typeMatch = true;
        if (assetTypeFilter !== 'ALL') {
          typeMatch =
            data.type === assetTypeFilter ||
            data.assetType === assetTypeFilter ||
            (assetTypeFilter === 'DOMAIN' && data.type === 'ROOT_DOMAIN');
        }

        // 2. Technology Filter
        let techMatch = true;
        if (technologyFilter !== 'ALL') {
          techMatch = data.type === 'TECHNOLOGY' && data.label === technologyFilter;
        }

        // 3. Severity Filter
        let sevMatch = true;
        if (severityFilter === 'CRITICAL') {
          sevMatch = data.highestSeverity === 'CRITICAL';
        } else if (severityFilter === 'HIGH') {
          sevMatch = data.highestSeverity === 'HIGH' || data.highestSeverity === 'CRITICAL';
        } else if (severityFilter === 'VULNERABLE') {
          sevMatch = Boolean(data.hasCriticalOrHigh || (data.findingCount && data.findingCount > 0));
        }

        if (typeMatch && techMatch && sevMatch) {
          node.style('display', 'element');
        } else {
          node.style('display', 'none');
        }
      });
    });
  }, [assetTypeFilter, technologyFilter, severityFilter]);

  // Search node highlighting
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!searchQuery.trim()) {
      cy.nodes().unselect();
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matched = cy.nodes().filter((node) => {
      const label = (node.data('label') || '').toLowerCase();
      const tags = (node.data('tags') || []).join(' ').toLowerCase();
      return label.includes(q) || tags.includes(q);
    });

    if (matched.length > 0) {
      cy.nodes().unselect();
      matched.select();
      cy.fit(matched, 120);
    }
  }, [searchQuery]);

  // Zoom controls
  const handleZoomIn = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 1.3);
  };

  const handleZoomOut = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 0.77);
  };

  const handleFit = () => {
    if (cyRef.current) cyRef.current.fit(undefined, 40);
  };

  const handleReset = () => {
    if (cyRef.current) {
      applyLayout(cyRef.current, activeLayout);
    }
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, scale: 2, bg: '#020617' });
    const a = document.createElement('a');
    a.href = png;
    a.download = `ReconFlow_Topology_${targetName || 'target'}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Top Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search nodes or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Asset Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Type:</span>
            <select
              value={assetTypeFilter}
              onChange={(e) => setAssetTypeFilter(e.target.value)}
              aria-label="Filter by asset type"
              className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Types</option>
              <option value="DOMAIN">Root Domain</option>
              <option value="SUBDOMAIN">Subdomains</option>
              <option value="IP_ADDRESS">IP Hosts</option>
              <option value="SERVICE">Services</option>
              <option value="TECHNOLOGY">Technologies</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="ENDPOINT">Endpoints</option>
            </select>
          </div>

          {/* Technology Filter */}
          {technologies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase">Tech:</span>
              <select
                value={technologyFilter}
                onChange={(e) => setTechnologyFilter(e.target.value)}
                aria-label="Filter by technology"
                className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[140px] truncate"
              >
                <option value="ALL">All Tech</option>
                {technologies.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Risk:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by risk severity"
              className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="VULNERABLE">With Findings</option>
              <option value="HIGH">Critical / High</option>
              <option value="CRITICAL">Critical Only</option>
            </select>
          </div>

          {/* Layout switch */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Layout:</span>
            <select
              value={activeLayout}
              onChange={(e) => {
                setActiveLayout(e.target.value);
                if (cyRef.current) applyLayout(cyRef.current, e.target.value);
              }}
              aria-label="Select graph layout algorithm"
              className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              {LAYOUT_OPTIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Fit to Canvas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Re-run Layout"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPNG}
            className="text-xs font-mono h-8 px-2.5 gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Export PNG
          </Button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        className="relative w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl"
        style={{ height }}
      >
        {/* Grid Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Legend */}
        <div className="absolute top-3 left-3 z-10 p-2.5 bg-slate-900/90 border border-slate-800/90 rounded-lg text-[10px] backdrop-blur-md space-y-1 pointer-events-none shadow-lg">
          <div className="text-slate-400 font-semibold mb-1">RELATIONSHIP TOPOLOGY:</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Root Domain
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Subdomain (resolves to)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> IP Address (runs)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Service (exposes endpoint)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Technology (uses tech)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Certificate (covered by cert)
          </div>
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> High/Critical Vulnerability
          </div>
        </div>

        {/* Cytoscape Canvas */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 z-20">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-300">Calculating Attack Surface Relationships...</span>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
            <div className="text-xs text-rose-300 font-semibold mb-1">Graph Initialization Failed</div>
            <p className="text-[11px] text-slate-400 mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadData} className="text-xs">
              Retry Load
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && elements.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <Network className="w-10 h-10 text-slate-700 mb-2" />
            <div className="text-sm font-semibold text-slate-300">No Relationship Nodes Found</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Run passive reconnaissance to discover subdomains, IP addresses, services, and endpoints for this target.
            </p>
          </div>
        )}

        {/* Node Detail Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-20 w-84 max-w-[340px] bg-slate-900/95 border border-slate-700 rounded-xl p-4 backdrop-blur-xl shadow-2xl space-y-3.5 animate-in slide-in-from-right-4 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" /> NODE INSPECTION
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="text-[10px] text-slate-400">IDENTIFIER</div>
                <div className="text-sm font-bold text-slate-100 break-all font-mono">
                  {selectedNode.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">TYPE</div>
                  <div className="text-cyan-400 font-semibold">{selectedNode.type}</div>
                </div>
                <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">SCOPE CONFIDENCE</div>
                  <div className="text-emerald-400 font-semibold">
                    {selectedNode.confidence ?? 100}%
                  </div>
                </div>
              </div>

              {/* Linked Vulnerability Alert */}
              {selectedNode.findingCount && selectedNode.findingCount > 0 ? (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      {selectedNode.findingCount} LINKED FINDINGS
                    </span>
                    {selectedNode.highestSeverity && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300">
                        {selectedNode.highestSeverity}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-200/80 font-sans">
                    Vulnerabilities detected on this attack perimeter component.
                  </p>
                </div>
              ) : null}

              {/* Metadata Details */}
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="p-2.5 bg-slate-950/70 rounded border border-slate-800 space-y-1 text-[11px]">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">PROPERTIES</div>
                  {Object.entries(selectedNode.metadata)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">{key}:</span>
                        <span className="text-slate-200 text-right truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Tags */}
              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-1">TAGS</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
