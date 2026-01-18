/**
 * Workflow Types
 * Extended with cross-chain support for multi-chain workflows
 */

/**
 * Supported blockchain networks
 */
export type Chain = 'ethereum' | 'weilchain' | 'solana';

/**
 * Chain configuration and metadata
 */
export interface ChainConfig {
  id: Chain;
  name: string;
  icon: string; // Emoji or icon identifier
  color: string; // Brand color for UI
  nativeToken: string; // Native currency symbol
  blockTime: number; // Average block time in seconds
  bridgeEnabled: boolean; // Whether bridging is supported
}

/**
 * Chain configurations for all supported networks
 */
export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    icon: 'ETH',
    color: '#627EEA', // Ethereum blue
    nativeToken: 'ETH',
    blockTime: 12,
    bridgeEnabled: true,
  },
  weilchain: {
    id: 'weilchain',
    name: 'WeilChain',
    icon: 'WEIL',
    color: '#39FF14', // Neon green
    nativeToken: 'WEIL',
    blockTime: 2,
    bridgeEnabled: true,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    icon: 'SOL',
    color: '#9945FF', // Solana purple
    nativeToken: 'SOL',
    blockTime: 0.4,
    bridgeEnabled: true,
  },
};

/**
 * Bridge status during cross-chain transfers
 */
export type BridgeStatus = 'pending' | 'bridging' | 'completed' | 'failed';

/**
 * Bridge configuration for teleport nodes
 */
export interface BridgeConfig {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken: string;
  destinationToken: string;
  estimatedTime: number; // Seconds
  fee: number; // Percentage
  status?: BridgeStatus;
}

export type AppletNodeType = 
  | 'djed_monitor'
  | 'djed_sim'
  | 'djed_sentinel'
  | 'djed_ledger'
  | 'djed_arbitrage'
  | 'teleport_bridge' // Cross-chain bridge node
  | 'eth_wallet' // Ethereum wallet operations
  | 'sol_wallet'; // Solana wallet operations

export interface WorkflowNode {
  id: string;
  type: AppletNodeType;
  name: string;
  position: { x: number; y: number };
  outputs: string[]; // IDs of connected nodes
  chain?: Chain; // Blockchain network this node operates on (default: weilchain)
  bridgeConfig?: BridgeConfig; // Configuration for teleport nodes
  
  // Real applet integration
  appletAddress?: string; // WeilChain applet contract address
  method?: string; // Method to call on the applet
  params?: Record<string, any>; // Parameters for the method call
  
  condition?: {
    type: 'dsi_below' | 'dsi_above' | 'price_below' | 'price_above' | 'always';
    value?: number;
  };
}

export interface WorkflowConnection {
  from: string;
  to: string;
  condition?: string;
  chainMismatch?: boolean; // Whether connection crosses chain boundaries
  needsBridge?: boolean; // Whether this connection requires a bridge node
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: number;
  lastExecuted?: number;
  executionCount: number;
}

export interface ExecutionLogEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  timestamp: number;
  nodeExecutions: {
    nodeId: string;
    nodeName: string;
    status: 'success' | 'failed' | 'skipped';
    startTime: number;
    endTime: number;
    output?: any;
    error?: string;
  }[];
  totalDuration: number;
  status: 'completed' | 'failed' | 'running';
}

export const APPLET_DEFINITIONS: Record<AppletNodeType, {
  name: string;
  color: string;
  icon: string;
  description: string;
  outputType: 'data' | 'alert' | 'transaction' | 'bridge';
  stakedAmount: number; // Total Value Locked in WEIL
  apy: number; // Curator rewards APY
  defaultChain?: Chain; // Default blockchain for this applet
}> = {
  djed_monitor: {
    name: 'Djed Eye',
    color: '#39FF14',
    icon: '👁️',
    description: 'Monitors protocol metrics and reserve ratios',
    outputType: 'data',
    stakedAmount: 1247500, // 1.2M WEIL
    apy: 12.4,
    defaultChain: 'weilchain',
  },
  djed_sim: {
    name: 'Chrono-Sim',
    color: '#00D4FF',
    icon: '⏱️',
    description: 'Simulates time-based scenarios',
    outputType: 'data',
    stakedAmount: 890000,
    apy: 15.8,
    defaultChain: 'weilchain',
  },
  djed_sentinel: {
    name: 'Sentinel One',
    color: '#FF4444',
    icon: '🛡️',
    description: 'Performs stress tests and risk analysis',
    outputType: 'alert',
    stakedAmount: 2150000, // Highest TVL - most trusted
    apy: 9.2,
    defaultChain: 'weilchain',
  },
  djed_ledger: {
    name: 'Djed Ledger',
    color: '#FFD700',
    icon: '📋',
    description: 'Tracks on-chain transactions',
    outputType: 'transaction',
    stakedAmount: 675000,
    apy: 18.5,
    defaultChain: 'weilchain',
  },
  djed_arbitrage: {
    name: 'Arb-Hunter',
    color: '#FF9500',
    icon: '💰',
    description: 'Detects arbitrage opportunities',
    outputType: 'data',
    stakedAmount: 1820000,
    apy: 22.1, // Highest APY - higher risk
    defaultChain: 'weilchain',
  },
  teleport_bridge: {
    name: 'Teleporter',
    color: '#FF00FF', // Magenta/portal color
    icon: '🌀',
    description: 'Cross-chain bridge for asset transfers',
    outputType: 'bridge',
    stakedAmount: 5000000, // Highest TVL - critical infrastructure
    apy: 8.5, // Lower APY but stable
    defaultChain: 'weilchain', // Can bridge from any chain
  },
  eth_wallet: {
    name: 'ETH Vault',
    color: '#627EEA',
    icon: '🔷',
    description: 'Ethereum wallet operations and DeFi access',
    outputType: 'transaction',
    stakedAmount: 3200000,
    apy: 14.2,
    defaultChain: 'ethereum',
  },
  sol_wallet: {
    name: 'SOL Vault',
    color: '#9945FF',
    icon: '◆',
    description: 'Solana wallet operations and DeFi access',
    outputType: 'transaction',
    stakedAmount: 2800000,
    apy: 16.8,
    defaultChain: 'solana',
  },
};
