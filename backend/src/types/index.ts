/**
 * Type Definitions for DjedOPS Backend
 * 
 * This file contains TypeScript interfaces and types for the backend API,
 * including workflow structures, transaction requests, and response formats.
 */

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'teleport';
  data: {
    label: string;
    actionType?: string;
    conditionType?: string;
    config?: Record<string, any>;
  };
  position?: { x: number; y: number };
}

/**
 * Workflow edge/connection definition
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Complete workflow structure
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Wallet connection request
 */
export interface WalletConnectRequest {
  address?: string;
}

/**
 * Wallet connection response
 */
export interface WalletConnectResponse {
  success: boolean;
  address?: string;
  message?: string;
}

/**
 * Transaction signing request
 */
export interface SignTransactionRequest {
  txData: string;
  address: string;
}

/**
 * Transaction signing response
 */
export interface SignTransactionResponse {
  success: boolean;
  signedTx?: string;
  txHash?: string;
  message?: string;
}

/**
 * Workflow deployment request
 */
export interface DeployWorkflowRequest {
  workflow: Workflow;
  address: string;
}

/**
 * Workflow deployment response
 */
export interface DeployWorkflowResponse {
  success: boolean;
  workflowId?: string;
  txHash?: string;
  message?: string;
  explorerUrl?: string;
}

/**
 * API Error response
 */
export interface ApiError {
  success: false;
  error: string;
  details?: any;
}

/**
 * CLI execution result
 */
export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
}
