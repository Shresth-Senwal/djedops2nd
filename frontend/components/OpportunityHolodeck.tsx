/**
 * OpportunityHolodeck Component
 * Obsidian-style brain map visualization for DeFi protocol networks
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Coins,
  Database,
  TrendingUp,
  Shield,
  Layers,
  Activity,
  X,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useDexPrice } from '@/lib/hooks/useDexPrice';

/**
 * GraphNode interface with force simulation properties
 */
interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx?: number;  // Velocity for force simulation
  vy?: number;
  fx?: number | null;  // Fixed position
  fy?: number | null;
  icon: React.ElementType;
  color: string;
  size: number;  // Node size
  connections: number;  // Number of connections
}

type EdgeType = 'opportunity' | 'risk' | 'stable' | 'idle';

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label: string;
  strength: number;
  metadata?: {
    estimatedProfit?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    timeToExecute?: number;
  };
}

interface OpportunityModalProps {
  edge: GraphEdge | null;
  sourceNode: GraphNode | null;
  targetNode: GraphNode | null;
  onClose: () => void;
  onBuildWorkflow: () => void;
}

/**
 * Force simulation for organic node layout
 */
function useForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>(nodes);

  useEffect(() => {
    // Initialize nodes with random positions if not set
    const nodesWithPositions = nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * width,
      y: node.y || Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    // Force simulation parameters
    const centerX = width / 2;
    const centerY = height / 2;
    const iterations = 300;
    const linkDistance = 150;
    const repulsionStrength = 5000;
    const centeringForce = 0.01;
    const damping = 0.9;

    // Run simulation
    let currentNodes = [...nodesWithPositions];

    for (let i = 0; i < iterations; i++) {
      // Repulsion between nodes
      for (let j = 0; j < currentNodes.length; j++) {
        for (let k = j + 1; k < currentNodes.length; k++) {
          const dx = currentNodes[k].x - currentNodes[j].x;
          const dy = currentNodes[k].y - currentNodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (distance * distance);
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          currentNodes[j].vx! -= fx;
          currentNodes[j].vy! -= fy;
          currentNodes[k].vx! += fx;
          currentNodes[k].vy! += fy;
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const source = currentNodes.find(n => n.id === edge.source);
        const target = currentNodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - linkDistance) * 0.01 * edge.strength;
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          source.vx! += fx;
          source.vy! += fy;
          target.vx! -= fx;
          target.vy! -= fy;
        }
      });

      // Centering force
      currentNodes.forEach(node => {
        node.vx! += (centerX - node.x) * centeringForce;
        node.vy! += (centerY - node.y) * centeringForce;
      });

      // Apply velocities and damping
      currentNodes.forEach(node => {
        node.x += node.vx!;
        node.y += node.vy!;
        node.vx! *= damping;
        node.vy! *= damping;

        // Keep nodes within bounds
        node.x = Math.max(80, Math.min(width - 80, node.x));
        node.y = Math.max(80, Math.min(height - 80, node.y));
      });
    }

    setSimulatedNodes(currentNodes);
  }, [nodes, edges, width, height]);

  return simulatedNodes;
}

/**
 * Generate more extensive mock graph data
 */
function generateMockGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'uniswap',
      label: 'Uniswap',
      x: 0,
      y: 0,
      icon: Coins,
      color: '#FF007A',
      size: 20,
      connections: 0,
    },
    {
      id: 'aave',
      label: 'Aave',
      x: 0,
      y: 0,
      icon: Database,
      color: '#B6509E',
      size: 18,
      connections: 0,
    },
    {
      id: 'curve',
      label: 'Curve',
      x: 0,
      y: 0,
      icon: TrendingUp,
      color: '#FFD700',
      size: 18,
      connections: 0,
    },
    {
      id: 'djed',
      label: 'Djed Stablecoin',
      x: 0,
      y: 0,
      icon: Shield,
      color: '#39FF14',
      size: 22,
      connections: 0,
    },
    {
      id: 'weil',
      label: 'WeilWrapper',
      x: 0,
      y: 0,
      icon: Layers,
      color: '#00D4FF',
      size: 16,
      connections: 0,
    },
    {
      id: 'lending',
      label: 'LendingPool',
      x: 0,
      y: 0,
      icon: Activity,
      color: '#FF4444',
      size: 16,
      connections: 0,
    },
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-1',
      source: 'uniswap',
      target: 'curve',
      type: 'opportunity',
      label: 'Arb +0.8%',
      strength: 8,
      metadata: {
        estimatedProfit: 450,
        timeToExecute: 12,
      },
    },
    {
      id: 'edge-2',
      source: 'aave',
      target: 'lending',
      type: 'risk',
      label: 'Liq Risk',
      strength: 7,
      metadata: {
        riskLevel: 'high',
      },
    },
    {
      id: 'edge-3',
      source: 'djed',
      target: 'weil',
      type: 'stable',
      label: 'Stable',
      strength: 5,
    },
    {
      id: 'edge-4',
      source: 'uniswap',
      target: 'aave',
      type: 'idle',
      label: '',
      strength: 2,
    },
    {
      id: 'edge-5',
      source: 'curve',
      target: 'djed',
      type: 'idle',
      label: '',
      strength: 2,
    },
    {
      id: 'edge-6',
      source: 'weil',
      target: 'lending',
      type: 'idle',
      label: '',
      strength: 2,
    },
    {
      id: 'edge-7',
      source: 'uniswap',
      target: 'djed',
      type: 'opportunity',
      label: 'Arb +1.2%',
      strength: 9,
      metadata: {
        estimatedProfit: 720,
        timeToExecute: 8,
      },
    },
    {
      id: 'edge-8',
      source: 'curve',
      target: 'aave',
      type: 'stable',
      label: 'Yield',
      strength: 6,
    },
  ];

  // Calculate connection counts
  nodes.forEach(node => {
    node.connections = edges.filter(
      e => e.source === node.id || e.target === node.id
    ).length;
  });

  return { nodes, edges };
}

/**
 * Get edge styling based on type
 */
function getEdgeStyle(type: EdgeType): {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dashArray?: string;
} {
  switch (type) {
    case 'opportunity':
      return {
        stroke: '#FFD700',
        strokeWidth: 2,
        opacity: 0.9,
      };
    case 'risk':
      return {
        stroke: '#FF4444',
        strokeWidth: 2,
        opacity: 0.9,
      };
    case 'stable':
      return {
        stroke: '#00D4FF',
        strokeWidth: 1.5,
        opacity: 0.7,
      };
    case 'idle':
    default:
      return {
        stroke: '#39FF14',
        strokeWidth: 1,
        opacity: 0.2,
        dashArray: '2,2',
      };
  }
}

/**
 * OpportunityModal Component
 */
const OpportunityModal: React.FC<OpportunityModalProps> = ({
  edge,
  sourceNode,
  targetNode,
  onClose,
  onBuildWorkflow,
}) => {
  if (!edge || !sourceNode || !targetNode) return null;

  const isOpportunity = edge.type === 'opportunity';
  const isRisk = edge.type === 'risk';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative bg-black border-2 p-8 max-w-lg w-full mx-4"
          style={{
            borderColor: isOpportunity ? '#FFD700' : isRisk ? '#FF4444' : '#00D4FF',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-500 hover:text-[#39FF14] transition-colors"
          >
            <X size={24} />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="p-3 border"
              style={{
                borderColor: isOpportunity ? '#FFD700' : isRisk ? '#FF4444' : '#00D4FF',
                background: isOpportunity
                  ? 'rgba(255, 215, 0, 0.1)'
                  : isRisk
                  ? 'rgba(255, 68, 68, 0.1)'
                  : 'rgba(0, 212, 255, 0.1)',
              }}
            >
              {isOpportunity ? (
                <Zap size={32} style={{ color: '#FFD700' }} />
              ) : isRisk ? (
                <AlertTriangle size={32} style={{ color: '#FF4444' }} />
              ) : (
                <CheckCircle2 size={32} style={{ color: '#00D4FF' }} />
              )}
            </div>
            <div className="flex-1">
              <h2
                className="text-2xl font-bold font-mono mb-2"
                style={{
                  color: isOpportunity ? '#FFD700' : isRisk ? '#FF4444' : '#00D4FF',
                }}
              >
                {isOpportunity
                  ? '[OPPORTUNITY_DETECTED]'
                  : isRisk
                  ? '[RISK_WARNING]'
                  : '[STABLE_CONNECTION]'}
              </h2>
              <p className="text-neutral-400 font-mono text-sm">
                {sourceNode.label} → {targetNode.label}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-6">
            <div className="border border-[#39FF14]/20 p-4 bg-neutral-950">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-500 font-mono text-sm">Connection Type</span>
                <span className="font-mono font-bold text-white">{edge.label}</span>
              </div>
              {edge.metadata?.estimatedProfit && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-500 font-mono text-sm">Estimated Profit</span>
                  <span className="font-mono font-bold text-[#39FF14]">
                    ${edge.metadata.estimatedProfit.toFixed(2)}
                  </span>
                </div>
              )}
              {edge.metadata?.timeToExecute && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-500 font-mono text-sm">Execution Time</span>
                  <span className="font-mono text-white">
                    ~{edge.metadata.timeToExecute}s
                  </span>
                </div>
              )}
              {edge.metadata?.riskLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-mono text-sm">Risk Level</span>
                  <span
                    className={`font-mono font-bold uppercase ${
                      edge.metadata.riskLevel === 'high'
                        ? 'text-[#FF4444]'
                        : edge.metadata.riskLevel === 'medium'
                        ? 'text-[#FFD700]'
                        : 'text-[#39FF14]'
                    }`}
                  >
                    {edge.metadata.riskLevel}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-neutral-500 font-mono text-sm">Signal Strength</span>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-4 ${
                        i < edge.strength
                          ? isOpportunity
                            ? 'bg-[#FFD700]'
                            : isRisk
                            ? 'bg-[#FF4444]'
                            : 'bg-[#00D4FF]'
                          : 'bg-neutral-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {isOpportunity && (
              <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 p-4">
                <p className="text-[#FFD700] font-mono text-sm leading-relaxed">
                  <strong>[AUTO_BUILD_AVAILABLE]</strong><br />
                  This opportunity can be automated into a workflow. Click below to route to the Workflow Builder with pre-configured parameters.
                </p>
              </div>
            )}

            {isRisk && (
              <div className="bg-[#FF4444]/10 border border-[#FF4444]/30 p-4">
                <p className="text-[#FF4444] font-mono text-sm leading-relaxed">
                  <strong>[ACTION_REQUIRED]</strong><br />
                  This connection indicates elevated risk. Review your positions and consider implementing protective measures.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isOpportunity && (
              <button
                onClick={onBuildWorkflow}
                className="flex-1 bg-[#FFD700] hover:bg-[#FFD700]/80 text-black font-bold font-mono py-3 px-6 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Zap size={20} />
                <span>[AUTO_BUILD_WORKFLOW]</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 border border-[#39FF14]/30 hover:bg-[#39FF14]/10 text-[#39FF14] font-mono font-semibold py-3 px-6 transition-colors"
            >
              [CLOSE]
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * OpportunityHolodeck Main Component
 * Obsidian-style force-directed graph visualization
 */
export default function OpportunityHolodeck() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  
  // Get real DEX price data
  const { dexPrice, spread, spreadPercent, signal, protocolPrice } = useDexPrice();

  // Generate graph data
  const { nodes: initialNodes, edges } = useMemo(() => generateMockGraphData(), []);

  // Apply force simulation
  const nodes = useForceSimulation(initialNodes, edges, dimensions.width, dimensions.height);

  // Update dimensions on mount
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    if (edge.type !== 'idle') {
      setSelectedEdge(edge);
    }
  }, []);

  const handleBuildWorkflow = useCallback(() => {
    if (!selectedEdge) return;
    
    // Build arbitrage config from real market data
    const config = {
      signal: signal || 'MINT DJED',
      dexPrice: dexPrice,
      protocolPrice: protocolPrice,
      spread: spreadPercent,
      expectedProfit: selectedEdge.metadata?.estimatedProfit || Math.abs(spread * 10),
      liquidity: 1000,
      autoExecute: false,
    };
    
    setSelectedEdge(null);
    router.push(`/workflows?autoConfig=${encodeURIComponent(JSON.stringify(config))}`);
  }, [router, selectedEdge, signal, dexPrice, protocolPrice, spreadPercent, spread]);

  const selectedSourceNode = useMemo(
    () => nodes.find((n) => n.id === selectedEdge?.source) || null,
    [nodes, selectedEdge]
  );
  const selectedTargetNode = useMemo(
    () => nodes.find((n) => n.id === selectedEdge?.target) || null,
    [nodes, selectedEdge]
  );

  const isEdgeHighlighted = useCallback(
    (edge: GraphEdge): boolean => {
      if (!hoveredNode) return false;
      return edge.source === hoveredNode || edge.target === hoveredNode;
    },
    [hoveredNode]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#39FF14]/30">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h1 className="text-4xl font-bold text-[#39FF14] font-mono mb-2">
              [OPPORTUNITY_HOLODECK]
            </h1>
            <p className="text-neutral-400 font-mono text-sm">
              Live intelligence: Hover over protocol nodes to view connections. Click <span className="text-[#FFD700]">gold edges</span> to auto-build arbitrage workflows. Red edges indicate risk warnings.
            </p>
          </motion.div>

          {/* Legend */}
          <div className="flex items-center gap-6 font-mono text-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-[#FFD700]" />
              <span className="text-[#FFD700]">Arbitrage Opportunity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-[#FF4444]" />
              <span className="text-[#FF4444]">Risk Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-[#00D4FF]" />
              <span className="text-[#00D4FF]">Stable Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-[#39FF14] opacity-30" />
              <span className="text-neutral-500">Idle Connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="border border-[#39FF14]/20 rounded-lg overflow-hidden bg-neutral-950"
          style={{
            boxShadow: '0 0 40px rgba(57, 255, 20, 0.1)',
          }}
        >
          <svg
            ref={svgRef}
            className="w-full h-[700px]"
            style={{ background: '#000' }}
            role="img"
            aria-label="DeFi protocol network graph"
          >
            {/* Render Edges */}
            <g id="edges">
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const style = getEdgeStyle(edge.type);
                const isHighlighted = isEdgeHighlighted(edge);
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                return (
                  <g key={edge.id}>
                    {/* Edge Line */}
                    <motion.line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={style.stroke}
                      strokeWidth={isHighlighted ? style.strokeWidth * 1.5 : style.strokeWidth}
                      strokeDasharray={style.dashArray}
                      opacity={isHighlighted ? 1 : style.opacity}
                      className={`${
                        edge.type !== 'idle' ? 'cursor-pointer' : 'cursor-default'
                      } transition-all duration-200`}
                      onClick={() => handleEdgeClick(edge)}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />

                    {/* Edge Label */}
                    {edge.label && isHighlighted && (
                      <motion.text
                        x={midX}
                        y={midY - 5}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill={style.stroke}
                        className="pointer-events-none select-none font-mono"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {edge.label}
                      </motion.text>
                    )}

                    {/* Animated particle for opportunity/risk edges */}
                    {(edge.type === 'opportunity' || edge.type === 'risk') && (
                      <motion.circle
                        r="3"
                        fill={style.stroke}
                        animate={{
                          x: [sourceNode.x, targetNode.x],
                          y: [sourceNode.y, targetNode.y],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        className="opacity-80"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Render Nodes */}
            <g id="nodes">
              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const IconComponent = node.icon;

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                  >
                    {/* Outer glow ring */}
                    {isHovered && (
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={node.size + 15}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="2"
                        opacity={0.3}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.3 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    {/* Node circle */}
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? node.size + 3 : node.size}
                      fill="#000"
                      stroke={node.color}
                      strokeWidth={isHovered ? "3" : "2"}
                      className="transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                    />

                    {/* Inner dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size * 0.4}
                      fill={node.color}
                      opacity={0.8}
                    />

                    {/* Connection count indicator */}
                    <circle
                      cx={node.x + node.size * 0.7}
                      cy={node.y - node.size * 0.7}
                      r="8"
                      fill="#000"
                      stroke={node.color}
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x + node.size * 0.7}
                      y={node.y - node.size * 0.7}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fontWeight="700"
                      fill={node.color}
                      className="font-mono"
                    >
                      {node.connections}
                    </text>

                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + node.size + 18}
                      textAnchor="middle"
                      fontSize={isHovered ? "14" : "12"}
                      fontWeight="600"
                      fill={isHovered ? node.color : '#fff'}
                      className="pointer-events-none select-none font-mono transition-all duration-200"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="border border-[#FFD700]/30 p-6 bg-black">
            <div className="text-3xl font-bold text-[#FFD700] font-mono mb-2">
              {edges.filter((e) => e.type === 'opportunity').length}
            </div>
            <div className="text-neutral-400 font-mono text-sm">
              [ACTIVE_OPPORTUNITIES]
            </div>
          </div>
          <div className="border border-[#FF4444]/30 p-6 bg-black">
            <div className="text-3xl font-bold text-[#FF4444] font-mono mb-2">
              {edges.filter((e) => e.type === 'risk').length}
            </div>
            <div className="text-neutral-400 font-mono text-sm">
              [RISK_WARNINGS]
            </div>
          </div>
          <div className="border border-[#39FF14]/30 p-6 bg-black">
            <div className="text-3xl font-bold text-[#39FF14] font-mono mb-2">
              {nodes.length}
            </div>
            <div className="text-neutral-400 font-mono text-sm">
              [CONNECTED_PROTOCOLS]
            </div>
          </div>
        </motion.div>
      </div>

      {/* Opportunity Modal */}
      <OpportunityModal
        edge={selectedEdge}
        sourceNode={selectedSourceNode}
        targetNode={selectedTargetNode}
        onClose={() => setSelectedEdge(null)}
        onBuildWorkflow={handleBuildWorkflow}
      />
    </div>
  );
}