/**
 * Core Type Definitions for DjedOps Dashboard
 * 
 * Purpose:
 * Centralized TypeScript type definitions for the entire application.
 * Ensures type safety and consistency across all components and modules.
 * 
 * Type Categories:
 * - DjedData: Core protocol data structures
 * - WalletState: Wallet connection and balance state
 * - TransactionEvent: Blockchain transaction types
 * - SimulationScenario: Scenario simulation parameters
 * - SentinelConfig: Alert and monitoring configuration
 * - UI State: Component and interaction states
 * 
 * Design Principles:
 * - Use interfaces over types for objects
 * - Explicit enums for string unions where appropriate
 * - Optional properties marked with ?
 * - No any types - use unknown when type is truly unknown
 * - Const assertions for immutable data
 * 
 * Dependencies:
 * - No external dependencies (pure TypeScript)
 * - Imported by: store.ts, components, lib utilities
 * 
 * Requirements: ALL (foundational types)
 */

// Core data types for DjedOps Dashboard

export interface DjedData {
  reserveRatio: number;        // Percentage (e.g., 405.5) - derived from Ergo blockchain metrics
  baseReserves: number;        // ERG amount (e.g., 4886996.2) - based on network supply
  oraclePrice: number;         // USD price (e.g., 1.45) - from CoinGecko/DefiLlama
  sigUsdCirculation: number;   // Synthetic circulation derived from transaction activity
  shenCirculation: number;     // Synthetic SHEN circulation based on reserves
  systemStatus: 'NORMAL' | 'CRITICAL';
  lastUpdated: Date;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  error: string | null;
}

export type TransactionType = 
  | 'MINT_DJED' 
  | 'MINT_SHEN' 
  | 'REDEEM_DJED' 
  | 'REDEEM_SHEN' 
  | 'ORACLE_UPDATE'
  | 'SENTINEL_TRIGGER'
  | 'SCENARIO_ACTIVATED'
  | 'VOLATILITY_ALERT'
  | 'TRANSFER';

export interface TransactionEvent {
  id: string;
  timestamp: Date;
  type: TransactionType;
  details: string;
  inputAmount?: number;
  outputAmount?: number;
  inputToken?: string;
  outputToken?: string;
  isWhale?: boolean;
  whaleType?: 'ERG' | 'DJED';
}

export type SimulationScenario = 'none' | 'flash_crash' | 'oracle_freeze' | 'bank_run';

export type ArbitrageSignal = 'MINT DJED' | 'REDEEM DJED' | 'NO CLEAR EDGE';

export interface SentinelConfig {
  enabled: boolean;
  autoRedeemOnCritical: boolean;
  notifyOnVolatility: boolean;
  watchedBalance: number;
}

export interface ArbitrageData {
  dexPrice: number;
  protocolPrice: number;
  spread: number;
  spreadPercent: number;
  signal: ArbitrageSignal;
}

/**
 * Opportunity Holodeck Types
 * Types for the interactive graph visualization system
 */

/**
 * GraphNode interface
 * Represents a DeFi protocol node in the Opportunity Holodeck graph
 */
export interface GraphNode {
  id: string;
  label: string;
  x: number; // Position in SVG viewport (0-100%)
  y: number; // Position in SVG viewport (0-100%)
  icon: string; // Icon identifier (maps to Lucide icon component)
  color: string; // Neon stroke color (hex format)
}

/**
 * EdgeType enumeration
 * Visual coding for different connection types in the graph
 * - opportunity: Arbitrage opportunities (gold pulsing)
 * - risk: Liquidation risks (red pulsing)
 * - stable: Stable connections (cyan solid)
 * - idle: Inactive connections (dark grey, low opacity)
 */
export type EdgeType = 'opportunity' | 'risk' | 'stable' | 'idle';

/**
 * GraphEdge interface
 * Represents a connection between two protocol nodes in the Holodeck
 */
export interface GraphEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: EdgeType; // Visual coding type
  label: string; // Display label (e.g., "Arb +1.2%", "Liq Risk")
  strength: number; // Visual weight/signal strength (1-10)
  metadata?: EdgeMetadata; // Optional additional data
}

/**
 * EdgeMetadata interface
 * Additional data associated with graph edges
 */
export interface EdgeMetadata {
  estimatedProfit?: number; // USD profit for arbitrage opportunities
  riskLevel?: 'low' | 'medium' | 'high'; // Risk categorization
  timeToExecute?: number; // Estimated seconds to execute workflow
  gasEstimate?: number; // Estimated gas cost in USD
  confidence?: number; // Confidence score (0-100%)
}

/**
 * OpportunityData interface
 * Comprehensive data for an actionable market opportunity
 */
export interface OpportunityData {
  id: string;
  type: 'arbitrage' | 'yield' | 'liquidation' | 'rebalance';
  sourceProtocol: string; // Protocol identifier
  targetProtocol: string; // Protocol identifier
  estimatedProfit: number; // USD profit
  requiredCapital: number; // USD capital required
  riskScore: number; // Risk assessment (0-100)
  confidence: number; // Signal confidence (0-100%)
  expiresAt: Date; // Opportunity expiration timestamp
  metadata: {
    sourcePool?: string;
    targetPool?: string;
    tokenPair?: string;
    apy?: number;
    healthRatio?: number;
    [key: string]: any; // Flexible metadata structure
  };
}

/**
 * Temporal Debugger Types
 * Types for the workflow execution simulation and time-travel debugging system
 */

/**
 * SimulationStep interface
 * Represents a single step in the workflow execution timeline
 */
export interface SimulationStep {
  id: number; // Step index (0-based)
  nodeId: string | null; // Active workflow node ID at this step (null if before/after workflow)
  label: string; // Human-readable label (e.g., "Flash Loan", "Swap", "Repay")
  timestamp: number; // Simulated execution time (milliseconds from start)
  state: SimulationState; // State snapshot at this step
  description: string; // Detailed description of what happens at this step
  gasUsed?: number; // Gas consumed up to this step (optional)
}

/**
 * SimulationState interface
 * Represents the state of the system at a specific point in workflow execution
 */
export interface SimulationState {
  walletBalances: WalletBalance[]; // Token balances in wallet
  positions: Position[]; // Active DeFi positions (loans, liquidity, etc.)
  metrics: ExecutionMetrics; // Performance and cost metrics
  logs: string[]; // Execution logs for this step
}

/**
 * WalletBalance interface
 * Represents a token balance in the user's wallet
 */
export interface WalletBalance {
  token: string; // Token symbol (USDC, ETH, WEIL, etc.)
  amount: number; // Token amount (raw balance)
  usdValue: number; // USD value of balance
}

/**
 * Position interface
 * Represents an active DeFi position (loan, liquidity provision, etc.)
 */
export interface Position {
  protocol: string; // Protocol name (Aave, Uniswap, Curve, etc.)
  type: string; // Position type (loan, liquidity, collateral, etc.)
  amount: number; // Position size (in USD or base token units)
  health?: number; // Health ratio for loans (optional, 0-100+)
}

/**
 * ExecutionMetrics interface
 * Performance and cost metrics for workflow execution
 */
export interface ExecutionMetrics {
  totalValue: number; // Total portfolio value in USD
  profit: number; // Profit/loss since start (USD, positive or negative)
  gasSpent: number; // Cumulative gas spent (in WEIL or native units)
  executionTime: number; // Total execution time in milliseconds
}

/**
 * DebuggerState enumeration
 * Current state of the temporal debugger
 */
export type DebuggerState = 'idle' | 'playing' | 'paused' | 'stepping';

/**
 * WorkflowExecutionResult interface
 * Result of a workflow execution (real or simulated)
 */
export interface WorkflowExecutionResult {
  success: boolean; // Whether execution completed successfully
  steps: SimulationStep[]; // Array of execution steps
  finalState: SimulationState; // Final state after execution
  totalGas: number; // Total gas consumed
  totalTime: number; // Total execution time (ms)
  error?: string; // Error message if execution failed
}

