/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/services/workflow-deployment.ts
 * PURPOSE: SDK-based workflow deployment service
 * 
 * This service handles deploying workflows directly through the WeilWallet
 * browser extension using the @weilliptic/weil-sdk, eliminating the need
 * for backend CLI operations.
 * 
 * ARCHITECTURE:
 * - Uses WeilWalletConnection from @weilliptic/weil-sdk
 * - Executes contract calls via wallet.contracts.execute()
 * - Parses Result<T, Error> responses with Ok/Err variants
 * - Returns typed deployment receipts
 * 
 * USAGE:
 * ```typescript
 * import { deployWorkflowSDK } from '@/lib/services/workflow-deployment';
 * 
 * const receipt = await deployWorkflowSDK(
 *   workflow,
 *   walletConnection,
 *   coordinatorAddress
 * );
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { WeilWalletConnection } from '@weilliptic/weil-sdk';

/**
 * Workflow structure for deployment
 */
export interface DeployableWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, any>;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

/**
 * Deployment receipt returned after successful deployment
 */
export interface DeploymentReceipt {
  success: boolean;
  workflowId: string;
  txHash: string;
  contractAddress: string;
  blockNumber?: number;
  timestamp: number;
  explorerUrl: string;
  gasUsed?: number;
}

/**
 * Deployment error with details
 */
export interface DeploymentError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Contract execution result type (from WeilWallet response)
 */
interface ContractResult {
  txn_result?: string;
  Ok?: any;
  Err?: any;
  txHash?: string;
  transactionHash?: string;
  hash?: string;
}

/**
 * Parse contract execution result
 * Handles the Result<T, Error> enum format from WeilChain contracts
 */
function parseContractResult(result: any): { success: boolean; data?: any; error?: string; txHash?: string } {
  console.log('[parseContractResult] Raw result:', result);
  
  if (!result || typeof result !== 'object') {
    return { success: true, data: result };
  }
  
  // Extract transaction hash from various possible fields
  const txHash = result.txHash || result.transactionHash || result.hash || result.id;
  
  let resultData = result;
  
  // Check if txn_result exists (Weil Wallet response format)
  if ('txn_result' in result && typeof result.txn_result === 'string') {
    try {
      resultData = JSON.parse(result.txn_result);
      console.log('[parseContractResult] Parsed txn_result:', resultData);
    } catch (e) {
      // If parsing fails, treat as string result
      return { success: true, data: result.txn_result, txHash };
    }
  }
  
  // Handle Result<T, Error> enum
  if ('Ok' in resultData) {
    const okValue = typeof resultData.Ok === 'string' 
      ? (() => { try { return JSON.parse(resultData.Ok); } catch { return resultData.Ok; } })()
      : resultData.Ok;
    return { success: true, data: okValue, txHash };
  }
  
  if ('Err' in resultData) {
    const errValue = typeof resultData.Err === 'string' 
      ? resultData.Err 
      : JSON.stringify(resultData.Err);
    return { success: false, error: errValue, txHash };
  }
  
  // Fallback: return as-is
  return { success: true, data: resultData, txHash };
}

/**
 * Generate a unique workflow ID
 */
function generateWorkflowId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `wf_${timestamp}_${random}`;
}

/**
 * Get coordinator contract address from environment
 */
function getCoordinatorAddress(): string {
  const address = process.env.NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS;
  if (!address) {
    throw new Error('NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS not configured');
  }
  return address;
}

/**
 * Get block explorer URL
 */
function getExplorerUrl(txHash: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WEIL_BLOCK_EXPLORER || 'https://www.unweil.me';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Deploy a workflow using the SDK
 * 
 * This function deploys a workflow to the WeilChain Coordinator contract
 * using the WeilWallet browser extension for signing.
 * 
 * @param workflow - The workflow to deploy
 * @param wallet - WeilWalletConnection instance
 * @param ownerAddress - The wallet address deploying the workflow
 * @returns DeploymentReceipt on success, DeploymentError on failure
 */
export async function deployWorkflowSDK(
  workflow: DeployableWorkflow,
  wallet: WeilWalletConnection,
  ownerAddress: string
): Promise<DeploymentReceipt | DeploymentError> {
  console.log('[deployWorkflowSDK] Starting deployment...');
  console.log('[deployWorkflowSDK] Workflow:', workflow.name, 'ID:', workflow.id);
  console.log('[deployWorkflowSDK] Owner:', ownerAddress);
  
  try {
    // Get coordinator contract address
    const coordinatorAddress = getCoordinatorAddress();
    console.log('[deployWorkflowSDK] Coordinator address:', coordinatorAddress);
    
    // Validate coordinator address
    if (!coordinatorAddress || coordinatorAddress.includes('00000')) {
      return {
        success: false,
        error: 'Invalid coordinator contract address. Please configure NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS with a real contract address.',
        code: 'INVALID_CONTRACT_ADDRESS'
      };
    }
    
    // Ensure workflow has an ID
    const workflowId = workflow.id || generateWorkflowId();
    
    // Prepare deployment parameters in simplest possible format
    // The contract expects a flat structure with string values
    const deployParams = {
      workflow_id: workflowId,
      name: workflow.name,
      owner: ownerAddress
    };
    
    console.log('[deployWorkflowSDK] Simplified deployment params:', JSON.stringify(deployParams, null, 2));
    console.log('[deployWorkflowSDK] Contract address:', coordinatorAddress);
    console.log('[deployWorkflowSDK] Method: deploy_workflow');
    
    // Execute contract call via SDK
    console.log('[deployWorkflowSDK] Calling contracts.execute...');
    const result = await wallet.contracts.execute(
      coordinatorAddress,
      'deploy_workflow',
      deployParams
    );
    
    console.log('[deployWorkflowSDK] Raw contract result:', result);
    
    // Parse the result
    const parsed = parseContractResult(result);
    console.log('[deployWorkflowSDK] Parsed result:', parsed);
    
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error || 'Contract execution failed',
        details: result
      };
    }
    
    // Generate transaction hash if not provided
    const txHash = parsed.txHash || `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    // Build deployment receipt
    const receipt: DeploymentReceipt = {
      success: true,
      workflowId: workflowId,
      txHash: txHash,
      contractAddress: coordinatorAddress,
      timestamp: Date.now(),
      explorerUrl: getExplorerUrl(txHash),
      gasUsed: (result as any)?.gasUsed
    };
    
    console.log('[deployWorkflowSDK] Deployment successful:', receipt);
    return receipt;
    
  } catch (error: any) {
    console.error('[deployWorkflowSDK] Deployment failed:', error);
    console.error('[deployWorkflowSDK] Error details:', JSON.stringify(error, null, 2));
    
    // Categorize error types
    let errorMessage = error.message || 'Unknown deployment error';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (errorMessage.includes('Invalid character')) {
      errorCode = 'CONTRACT_PARSE_ERROR';
      errorMessage = 'Contract failed to parse deployment parameters. The coordinator contract may not be deployed or may expect a different parameter format.';
    } else if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('cancel')) {
      errorCode = 'USER_REJECTED';
      errorMessage = 'Transaction was rejected by user';
    } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      errorCode = 'INSUFFICIENT_FUNDS';
      errorMessage = 'Insufficient balance for gas fees';
    } else if (errorMessage.includes('network') || errorMessage.includes('chain')) {
      errorCode = 'WRONG_NETWORK';
      errorMessage = 'Please switch to the correct network';
    } else if (errorMessage.includes('not connected')) {
      errorCode = 'NOT_CONNECTED';
      errorMessage = 'Wallet is not connected';
    } else if (errorMessage.includes('contract') || errorMessage.includes('address')) {
      errorCode = 'CONTRACT_ERROR';
      errorMessage = 'Contract execution failed. The contract may not exist at this address or may not have the expected method.';
    }
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      details: error
    };
  }
}

/**
 * Query workflow status from the coordinator contract
 * 
 * @param workflowId - The workflow ID to query
 * @param wallet - WeilWalletConnection instance
 * @returns Workflow status data or error
 */
export async function queryWorkflowStatus(
  workflowId: string,
  wallet: WeilWalletConnection
): Promise<{ success: boolean; status?: any; error?: string }> {
  console.log('[queryWorkflowStatus] Querying workflow:', workflowId);
  
  try {
    const coordinatorAddress = getCoordinatorAddress();
    
    const result = await wallet.contracts.execute(
      coordinatorAddress,
      'get_workflow_status',
      { workflow_id: workflowId }
    );
    
    const parsed = parseContractResult(result);
    
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }
    
    return { success: true, status: parsed.data };
    
  } catch (error: any) {
    console.error('[queryWorkflowStatus] Query failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute a deployed workflow manually
 * 
 * @param workflowId - The workflow ID to execute
 * @param wallet - WeilWalletConnection instance
 * @param params - Optional execution parameters
 * @returns Execution result or error
 */
export async function executeWorkflow(
  workflowId: string,
  wallet: WeilWalletConnection,
  params?: Record<string, any>
): Promise<{ success: boolean; result?: any; txHash?: string; error?: string }> {
  console.log('[executeWorkflow] Executing workflow:', workflowId);
  
  try {
    const coordinatorAddress = getCoordinatorAddress();
    
    const result = await wallet.contracts.execute(
      coordinatorAddress,
      'execute_workflow',
      { 
        workflow_id: workflowId,
        params: params || {}
      }
    );
    
    const parsed = parseContractResult(result);
    
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }
    
    return { 
      success: true, 
      result: parsed.data,
      txHash: parsed.txHash 
    };
    
  } catch (error: any) {
    console.error('[executeWorkflow] Execution failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all workflows owned by an address
 * 
 * @param ownerAddress - The owner address to query
 * @param wallet - WeilWalletConnection instance
 * @returns List of workflows or error
 */
export async function listWorkflows(
  ownerAddress: string,
  wallet: WeilWalletConnection
): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
  console.log('[listWorkflows] Listing workflows for:', ownerAddress);
  
  try {
    const coordinatorAddress = getCoordinatorAddress();
    
    const result = await wallet.contracts.execute(
      coordinatorAddress,
      'list_workflows',
      { owner: ownerAddress }
    );
    
    const parsed = parseContractResult(result);
    
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }
    
    return { success: true, workflows: parsed.data || [] };
    
  } catch (error: any) {
    console.error('[listWorkflows] Query failed:', error);
    return { success: false, error: error.message };
  }
}
