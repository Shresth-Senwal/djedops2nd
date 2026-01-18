'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, TrendingUp } from 'lucide-react';
import { WorkflowNode, APPLET_DEFINITIONS, CHAIN_CONFIGS } from '@/lib/workflow-types';

/**
 * Generate mock WIDL (Weil Interface Definition Language) data for an applet
 * Demonstrates we read underlying WASM interfaces
 */
function generateWidlData(appletType: string): any {
  const widlMap: Record<string, any> = {
    djed_monitor: {
      interface: 'IDjedMonitor',
      version: '1.0.0',
      inputs: [
        { name: 'refresh_rate', type: 'uint32', description: 'Polling interval in ms' }
      ],
      outputs: [
        { name: 'reserve_ratio', type: 'uint256', description: 'Current DSI as percentage' },
        { name: 'djed_supply', type: 'uint256', description: 'Total DJED in circulation' },
        { name: 'reserve_balance', type: 'uint256', description: 'Total reserves in ADA' },
        { name: 'status', type: 'enum Status', description: 'Protocol health status' }
      ],
      methods: ['monitor()', 'getMetrics()', 'subscribeUpdates()'],
      gasEstimate: 50,
      wasmHash: '0xd4e5f6...a1b2c3'
    },
    djed_sim: {
      interface: 'IChronoSimulator',
      version: '1.0.0',
      inputs: [
        { name: 'scenario', type: 'enum Scenario', description: 'Simulation scenario type' },
        { name: 'time_delta', type: 'int64', description: 'Time shift in seconds' },
        { name: 'market_condition', type: 'struct MarketState', description: 'Market parameters' }
      ],
      outputs: [
        { name: 'projected_ratio', type: 'uint256', description: 'Forecasted DSI' },
        { name: 'risk_level', type: 'enum Risk', description: 'Calculated risk tier' },
        { name: 'recommendation', type: 'string', description: 'Action recommendation' }
      ],
      methods: ['simulate()', 'projectFuture()', 'analyzeRisk()'],
      gasEstimate: 75,
      wasmHash: '0xa1b2c3...d4e5f6'
    },
    djed_sentinel: {
      interface: 'ISentinelGuard',
      version: '1.0.0',
      inputs: [
        { name: 'stress_level', type: 'uint8', description: 'Stress test intensity (1-10)' },
        { name: 'attack_vectors', type: 'array<enum Attack>', description: 'Scenarios to test' }
      ],
      outputs: [
        { name: 'threat_level', type: 'enum Threat', description: 'Current threat assessment' },
        { name: 'vulnerabilities', type: 'uint32', description: 'Number of issues found' },
        { name: 'test_result', type: 'bool', description: 'Pass/fail status' }
      ],
      methods: ['stressTest()', 'auditPolicy()', 'enforceRules()'],
      gasEstimate: 120,
      wasmHash: '0x1f2e3d...4c5b6a'
    },
    djed_ledger: {
      interface: 'IDjedLedger',
      version: '1.0.0',
      inputs: [
        { name: 'from_block', type: 'uint64', description: 'Starting block number' },
        { name: 'to_block', type: 'uint64', description: 'Ending block number' },
        { name: 'filter', type: 'struct TxFilter', description: 'Transaction filters' }
      ],
      outputs: [
        { name: 'transactions', type: 'array<struct Tx>', description: 'Transaction list' },
        { name: 'total_volume', type: 'uint256', description: 'Total volume in ADA' },
        { name: 'tx_count', type: 'uint32', description: 'Number of transactions' }
      ],
      methods: ['queryTransactions()', 'getVolume()', 'trackAddress()'],
      gasEstimate: 60,
      wasmHash: '0x9a8b7c...6d5e4f'
    },
    djed_arbitrage: {
      interface: 'IArbHunter',
      version: '1.0.0',
      inputs: [
        { name: 'asset_pair', type: 'tuple<string, string>', description: 'Trading pair' },
        { name: 'dex_list', type: 'array<address>', description: 'DEXs to scan' },
        { name: 'min_profit', type: 'uint256', description: 'Minimum profit threshold' }
      ],
      outputs: [
        { name: 'opportunities', type: 'array<struct Opportunity>', description: 'Arb opportunities' },
        { name: 'best_spread', type: 'uint256', description: 'Best spread percentage' },
        { name: 'potential_profit', type: 'uint256', description: 'Estimated profit in ADA' }
      ],
      methods: ['scanMarkets()', 'calculateArbitrage()', 'executeArb()'],
      gasEstimate: 90,
      wasmHash: '0x7f8e9d...0c1b2a'
    }
  };

  return widlMap[appletType] || { interface: 'IUnknown', methods: [], gasEstimate: 0 };
}

interface WorkflowNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  isConnecting: boolean;
  connectionModeActive: boolean;
  onSelect: () => void;
  onMove: (nodeId: string, dx: number, dy: number) => void;
  onDelete: (nodeId: string) => void;
  onStartConnection: (nodeId: string) => void;
  onCompleteConnection: (nodeId: string) => void;
  onSetCondition: (nodeId: string, condition: WorkflowNode['condition']) => void;
}

export function WorkflowNodeComponent({
  node,
  isSelected,
  isConnecting,
  connectionModeActive,
  onSelect,
  onMove,
  onDelete,
  onStartConnection,
  onCompleteConnection,
  onSetCondition,
}: WorkflowNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCondition, setShowCondition] = useState(false);
  const [showWidl, setShowWidl] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'live'>('simple');
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const definition = APPLET_DEFINITIONS[node.type];
  const widlData = generateWidlData(node.type);
  
  // Get chain configuration (default to WeilChain for existing nodes)
  const nodeChain = node.chain || definition.defaultChain || 'weilchain';
  const chainConfig = CHAIN_CONFIGS[nodeChain];

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    onSelect();
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      onMove(node.id, dx, dy);
      dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, node.id, onMove]);

  const handleSetCondition = (type: string, value?: number) => {
    onSetCondition(node.id, {
      type: type as any,
      value,
    });
    setShowCondition(false);
  };

  return (
    <>
      <div
        ref={nodeRef}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation();
          if (connectionModeActive && !isConnecting) {
            // Complete connection when clicking any target node (not the source)
            onCompleteConnection(node.id);
          }
        }}
        className={`absolute cursor-move select-none ${
          isSelected ? 'ring-2 ring-[#39FF14]' : ''
        } ${connectionModeActive && !isConnecting ? 'cursor-pointer' : isConnecting ? 'cursor-default' : ''}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: 240,
        }}
      >
        <div
          className={`border-2 bg-black p-4 ${
            isDragging ? 'opacity-70' : ''
          } ${connectionModeActive && !isConnecting ? 'ring-4 ring-yellow-500 animate-pulse cursor-pointer' : ''}`}
          style={{ 
            borderColor: connectionModeActive && !isConnecting ? '#FFD700' : definition.color,
            boxShadow: connectionModeActive && !isConnecting ? '0 0 20px rgba(255, 215, 0, 0.6)' : 'none'
          }}
        >
          {/* Node Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{definition.icon}</span>
              <div>
                <div
                  className="font-mono text-sm font-bold"
                  style={{ color: definition.color }}
                >
                  {definition.name}
                </div>
                <div className="text-xs text-neutral-500 font-mono">
                  {definition.outputType}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Chain Badge - Top Right */}
              <div
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold font-mono border"
                style={{
                  backgroundColor: chainConfig.color + '15',
                  borderColor: chainConfig.color,
                  color: chainConfig.color,
                  boxShadow: `0 0 8px ${chainConfig.color}40`,
                }}
                title={`Running on ${chainConfig.name}`}
              >
                <span>{chainConfig.icon}</span>
                <span>{chainConfig.name.toUpperCase()}</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode(viewMode === 'simple' ? 'live' : 'simple');
                }}
                className="transition-colors text-sm"
                style={{ color: viewMode === 'live' ? definition.color : '#666' }}
                title="Toggle Live View"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWidl(true);
                }}
                className="text-[#00D4FF] hover:bg-[#00D4FF] hover:text-black text-xs font-mono font-bold border border-[#00D4FF] px-2 py-1 transition-all"
                title="View WIDL Interface"
                style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 0.3)' }}
              >
                WIDL
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="text-red-500 hover:text-red-400 text-xs font-mono"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Description or Live View */}
          {viewMode === 'simple' ? (
            <div className="text-xs text-neutral-400 font-mono mb-3">
              {definition.description}
            </div>
          ) : (
            <div className="mb-3 border p-3" style={{ borderColor: definition.color, backgroundColor: `${definition.color}10` }}>
              {/* WEIL-OS EMBEDDED MINI-VIEWS */}
              {node.type === 'djed_monitor' && (
                <div>
                  <div className="text-[10px] text-neutral-500 mb-2 font-mono">RESERVE RATIO TREND</div>
                  <svg width="100%" height="40" className="overflow-visible">
                    {/* Simple sparkline - upward trend */}
                    <path
                      d="M 0,30 L 20,28 L 40,25 L 60,20 L 80,18 L 100,15 L 120,12 L 140,10 L 160,8 L 180,10 L 200,8"
                      stroke={definition.color}
                      strokeWidth="2"
                      fill="none"
                      style={{ filter: `drop-shadow(0 0 4px ${definition.color})` }}
                    />
                    {/* Data points */}
                    {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((x, i) => {
                      const y = [30, 28, 25, 20, 18, 15, 12, 10, 8, 10, 8][i];
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="2"
                          fill={definition.color}
                          style={{ filter: `drop-shadow(0 0 3px ${definition.color})` }}
                        />
                      );
                    })}
                  </svg>
                  <div className="text-xs font-mono mt-1" style={{ color: definition.color }}>
                    DSI: 465% ↑ +2.3%
                  </div>
                </div>
              )}
              {node.type === 'djed_sentinel' && (
                <div className="text-center py-2">
                  <div className="mb-2">
                    <div className="inline-block px-4 py-2 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: definition.color,
                        color: 'black',
                        boxShadow: `0 0 15px ${definition.color}`
                      }}
                    >
                      🛡️ SYSTEM SAFE
                    </div>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    Last audit: 2min ago
                  </div>
                </div>
              )}
              {node.type === 'djed_ledger' && (
                <div>
                  <div className="text-[10px] text-neutral-500 mb-2 font-mono">RECENT TRANSACTIONS</div>
                  <div className="space-y-1 font-mono text-[10px]" style={{ color: definition.color }}>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>0x3a7f...e289</span>
                      <span className="text-neutral-600">12s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>0x9b2c...a14f</span>
                      <span className="text-neutral-600">45s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>0x1d8e...7c93</span>
                      <span className="text-neutral-600">1m</span>
                    </div>
                  </div>
                </div>
              )}
              {node.type === 'djed_arbitrage' && (
                <div className="text-center py-3">
                  <div className="text-2xl font-bold mb-1" style={{ color: definition.color }}>
                    +1.2%
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono mb-2">
                    BEST SPREAD
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono" style={{ color: definition.color }}>
                    <TrendingUp size={12} />
                    <span>3 opportunities</span>
                  </div>
                </div>
              )}
              {node.type === 'djed_sim' && (
                <div className="text-center py-2">
                  <div className="text-xl font-bold mb-1" style={{ color: definition.color }}>
                    +6h
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono mb-2">
                    TIME DELTA
                  </div>
                  <div className="text-xs" style={{ color: definition.color }}>
                    Projected DSI: 478%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Condition Badge */}
          {node.condition && node.condition.type !== 'always' && (
            <div className="mb-3 border border-yellow-500 p-2">
              <div className="text-xs text-yellow-500 font-mono">
                ⚡ IF {node.condition.type.replace('_', ' ').toUpperCase()}{' '}
                {node.condition.value ? `${node.condition.value}%` : ''}
              </div>
            </div>
          )}

          {/* Node Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCondition(!showCondition);
              }}
              className="flex-1 border border-neutral-700 px-2 py-1 text-neutral-400 hover:border-[#39FF14] hover:text-[#39FF14] transition-colors text-xs font-mono"
            >
              [CONDITION]
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(node.id);
              }}
              className="flex-1 border px-2 py-1 hover:bg-[#39FF14] hover:text-black transition-colors text-xs font-mono"
              style={{ 
                borderColor: definition.color,
                color: definition.color,
              }}
            >
              [CONNECT →]
            </button>
          </div>

          {/* Input/Output Ports */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#39FF14] border-2 border-black cursor-pointer hover:scale-125 transition-transform z-10"
            style={{ boxShadow: '0 0 8px #39FF14' }}
            title="Input port - click to complete connection"
            onClick={(e) => {
              e.stopPropagation();
              if (isConnecting && !isSelected) {
                onCompleteConnection(node.id);
              }
            }}
          ></div>
          <div 
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-[#39FF14] border-2 border-black cursor-pointer hover:scale-125 transition-transform z-10"
            style={{ boxShadow: '0 0 8px #39FF14' }}
            title="Output port - click to start connection"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection(node.id);
            }}
          ></div>
        </div>
      </div>

      {/* Condition Modal */}
      {showCondition && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowCondition(false)}
        >
          <div
            className="absolute border-2 border-[#39FF14] bg-black p-4 w-64"
            style={{
              left: node.position.x + 240,
              top: node.position.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-[#39FF14] font-mono text-sm mb-3 font-bold">
              [SET_CONDITION]
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => handleSetCondition('always')}
                className="w-full border border-neutral-700 px-3 py-2 text-left hover:border-[#39FF14] hover:text-[#39FF14] text-xs font-mono"
              >
                Always Execute
              </button>
              <button
                onClick={() => handleSetCondition('dsi_below', 400)}
                className="w-full border border-neutral-700 px-3 py-2 text-left hover:border-[#39FF14] hover:text-[#39FF14] text-xs font-mono"
              >
                IF DSI {'<'} 400%
              </button>
              <button
                onClick={() => handleSetCondition('dsi_above', 500)}
                className="w-full border border-neutral-700 px-3 py-2 text-left hover:border-[#39FF14] hover:text-[#39FF14] text-xs font-mono"
              >
                IF DSI {'>'} 500%
              </button>
              <button
                onClick={() => handleSetCondition('price_below', 0.95)}
                className="w-full border border-neutral-700 px-3 py-2 text-left hover:border-[#39FF14] hover:text-[#39FF14] text-xs font-mono"
              >
                IF Price {'<'} $0.95
              </button>
              <button
                onClick={() => handleSetCondition('price_above', 1.05)}
                className="w-full border border-neutral-700 px-3 py-2 text-left hover:border-[#39FF14] hover:text-[#39FF14] text-xs font-mono"
              >
                IF Price {'>'} $1.05
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIDL Inspector Modal */}
      {showWidl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setShowWidl(false)}
        >
          <div
            className="border-2 border-[#00D4FF] bg-black p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#00D4FF] font-mono text-lg font-bold">
                [WIDL_INTERFACE] {definition.name}
              </h3>
              <button
                onClick={() => setShowWidl(false)}
                className="text-red-500 hover:text-red-400 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-700 p-4 rounded font-mono text-xs">
              <pre className="text-[#39FF14] whitespace-pre-wrap">
{`// ${widlData.interface} - WASM Interface Definition
// Version: ${widlData.version}
// Gas Estimate: ${widlData.gasEstimate} WEIL
// Contract Hash: ${widlData.wasmHash}

interface ${widlData.interface} {
  // Input Parameters
${widlData.inputs.map((inp: any) => `  ${inp.name}: ${inp.type}; // ${inp.description}`).join('\n')}

  // Output Values
${widlData.outputs.map((out: any) => `  ${out.name}: ${out.type}; // ${out.description}`).join('\n')}

  // Available Methods
${widlData.methods.map((method: string) => `  ${method};`).join('\n')}
}`}
              </pre>
            </div>

            <div className="mt-4 border-t border-neutral-700 pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-neutral-500 mb-1">Protocol:</div>
                  <div className="text-white">WeilChain WASM</div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-1">Execution Cost:</div>
                  <div className="text-[#39FF14]">{widlData.gasEstimate} WEIL</div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-1">Applet Type:</div>
                  <div className="text-white" style={{ color: definition.color }}>{node.type}</div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-1">Output Type:</div>
                  <div className="text-white">{definition.outputType}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#00D4FF]/10 border border-[#00D4FF]/30">
              <div className="text-[#00D4FF] font-mono text-xs">
                ℹ️ This interface is validated on-chain. All applets are audited WASM contracts.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
