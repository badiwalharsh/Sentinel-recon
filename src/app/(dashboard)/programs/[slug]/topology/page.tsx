'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Shield,
  Layers,
  Info,
  Server,
  Crosshair,
  AlertTriangle,
  X,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  assetType?: string;
  color: string;
  size: number;
  inScope?: boolean;
  hasCritical?: boolean;
  findingCount?: number;
  tags?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

import { useParams } from 'next/navigation';
import RelationshipGraph from '@/components/graph/RelationshipGraph';

export default function ProgramTopologyPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('ALL');
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState('ALL');

  const canvasRef = useRef<SVGSVGElement | null>(null);
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const fetchTargets = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/targets`);
      const data = await res.json();
      if (res.ok && data.targets) {
        setTargets(data.targets);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGraph = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets/graph`);
      const data = await res.json();
      if (res.ok) {
        // Arrange nodes in radial force-directed layout
        const width = 800;
        const height = 500;
        const centerX = width / 2;
        const centerY = height / 2;

        const nodesWithPos = data.nodes.map((node: GraphNode, i: number) => {
          if (node.type === 'PROGRAM') {
            return { ...node, x: centerX, y: centerY };
          }
          const angle = (i / (data.nodes.length - 1)) * 2 * Math.PI;
          const radius = node.type === 'TARGET' ? 140 : 240 + (i % 3) * 35;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        });

        setGraphData({ nodes: nodesWithPos, edges: data.edges });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchTargets();
      fetchGraph();
    }
  }, [slug]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas.current) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingCanvas.current = false;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const filteredNodes =
    filterType === 'ALL'
      ? graphData.nodes
      : graphData.nodes.filter((n) => n.type === filterType || n.assetType === filterType || n.type === 'PROGRAM');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" /> Attack Surface Topology Graph
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual relationship graph mapping root targets, subdomains, IPs, exposed services, and risk nodes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Target Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[10px] uppercase">Scope:</span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              aria-label="Filter topology by target"
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Program Overview (All Targets)</option>
              {targets.map((tgt) => (
                <option key={tgt.id} value={tgt.id}>
                  {tgt.name} ({tgt.primaryDomain})
                </option>
              ))}
            </select>
          </div>

          {selectedTargetId === 'ALL' && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-1">
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Target-Specific Cytoscape Relationship Graph vs Program Canvas */}
      {selectedTargetId !== 'ALL' ? (
        <RelationshipGraph
          endpointUrl={`/api/v1/programs/${slug}/targets/${selectedTargetId}/graph`}
          targetName={targets.find((t) => t.id === selectedTargetId)?.name}
          height="650px"
        />
      ) : (
        <div className="relative w-full h-[620px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 p-3 bg-slate-900/90 border border-slate-800/80 rounded-lg text-xs font-mono backdrop-blur-md space-y-1.5 pointer-events-none">
          <div className="text-[10px] text-slate-400 font-semibold mb-1">TOPOLOGY LEGEND:</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Program Scope
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Target Domain
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Subdomain
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> IP Host
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Service / Tech
          </div>
          <div className="flex items-center gap-2 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> High/Critical Risk
          </div>
        </div>

        {/* Interactive SVG */}
        <svg
          ref={canvasRef}
          id="graph-bg"
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect id="graph-bg" width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {graphData.edges.map((edge) => {
              const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
              const targetNode = graphData.nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <line
                  key={edge.id}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="4,2"
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
              >
                {/* Critical Glow Ring */}
                {node.hasCritical && (
                  <circle
                    r={node.size + 8}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Node Core */}
                <circle
                  r={node.size}
                  fill={node.color}
                  stroke="#0f172a"
                  strokeWidth="3"
                  className="transition-transform group-hover:scale-125"
                />

                {/* Node Label */}
                <text
                  y={node.size + 14}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontFamily="monospace"
                  className="pointer-events-none group-hover:fill-emerald-300 font-semibold"
                >
                  {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Node Detail Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 border border-slate-700/80 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold">
                NODE INSPECTION
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-400">IDENTIFIER</div>
                <div className="text-sm font-bold font-mono text-slate-100 break-all">{selectedNode.label}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">NODE TYPE</div>
                  <div className="text-emerald-400 font-semibold">{selectedNode.type}</div>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">CATEGORY</div>
                  <div className="text-cyan-400 font-semibold">{selectedNode.assetType || 'ROOT'}</div>
                </div>
              </div>

              {selectedNode.findingCount && selectedNode.findingCount > 0 ? (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-xs font-mono space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{selectedNode.findingCount} LINKED FINDINGS</span>
                  </div>
                  <p className="text-[11px] text-rose-200/80">
                    Security vulnerabilities detected on this perimeter endpoint.
                  </p>
                </div>
              ) : null}

              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-slate-400 mb-1">METADATA TAGS:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
