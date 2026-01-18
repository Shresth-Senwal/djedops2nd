/**
 * Backend API Client for DjedOPS Frontend
 * 
 * This client handles all communication with the DjedOPS backend API server.
 * It replaces the direct CLI interaction approach with seamless HTTP requests
 * to the backend, which handles all WeilChain CLI operations.
 * 
 * Features:
 * - Wallet connection and management
 * - Transaction signing
 * - Workflow deployment
 * - Error handling and retry logic
 * - TypeScript type safety
 */

// API Types
export interface WalletConnectResponse {
  success: boolean;
  address?: string;
  message?: string;
}

export interface WalletBalanceResponse {
  success: boolean;
  balance?: string;
  message?: string;
}

export interface SignTransactionResponse {
  success: boolean;
  signedTx?: string;
  message?: string;
}

export interface DeployWorkflowResponse {
  success: boolean;
  workflowId?: string;
  txHash?: string;
  explorerUrl?: string;
  message?: string;
}

export interface WorkflowStatusResponse {
  success: boolean;
  status?: any;
  message?: string;
}

export interface ValidateWorkflowResponse {
  success: boolean;
  valid: boolean;
  errors?: string[];
  message?: string;
}

/**
 * API Client Configuration
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://djedops-backend.onrender.com';
const API_TIMEOUT = 30000; // 30 seconds

console.log('[API Client] Using backend URL:', API_BASE_URL);

/**
 * HTTP request helper with timeout and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - backend server may be unavailable');
    }
    
    throw new Error(error.message || 'API request failed');
  }
}

/**
 * Backend API Client Class
 */
export class BackendAPIClient {
  /**
   * Connect wallet and get account address
   * @param address - Optional address to verify
   */
  static async connectWallet(address?: string): Promise<WalletConnectResponse> {
    return apiRequest<WalletConnectResponse>('/api/wallet/connect', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  /**
   * Get current account address from backend
   */
  static async getAccount(): Promise<WalletConnectResponse> {
    return apiRequest<WalletConnectResponse>('/api/wallet/account', {
      method: 'GET',
    });
  }

  /**
   * Get account balance
   * @param address - WeilChain address
   */
  static async getBalance(address: string): Promise<WalletBalanceResponse> {
    return apiRequest<WalletBalanceResponse>(`/api/wallet/balance/${address}`, {
      method: 'GET',
    });
  }

  /**
   * Sign a transaction
   * @param txData - Transaction data to sign
   * @param address - Account address
   */
  static async signTransaction(
    txData: string,
    address: string
  ): Promise<SignTransactionResponse> {
    return apiRequest<SignTransactionResponse>('/api/wallet/sign', {
      method: 'POST',
      body: JSON.stringify({ txData, address }),
    });
  }

  /**
   * Deploy a workflow to WeilChain
   * @param workflow - Workflow object to deploy
   * @param address - Owner address
   */
  static async deployWorkflow(
    workflow: any,
    address: string
  ): Promise<DeployWorkflowResponse> {
    return apiRequest<DeployWorkflowResponse>('/api/workflow/deploy', {
      method: 'POST',
      body: JSON.stringify({ workflow, address }),
    });
  }

  /**
   * Query workflow status
   * @param workflowId - ID of the workflow to query
   */
  static async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResponse> {
    return apiRequest<WorkflowStatusResponse>(`/api/workflow/status/${workflowId}`, {
      method: 'GET',
    });
  }

  /**
   * Validate workflow structure
   * @param workflow - Workflow object to validate
   */
  static async validateWorkflow(workflow: any): Promise<ValidateWorkflowResponse> {
    return apiRequest<ValidateWorkflowResponse>('/api/workflow/validate', {
      method: 'POST',
      body: JSON.stringify({ workflow }),
    });
  }

  /**
   * Get workflow templates
   */
  static async getTemplates(): Promise<{ success: boolean; templates: any[] }> {
    return apiRequest<{ success: boolean; templates: any[] }>('/api/workflow/templates', {
      method: 'GET',
    });
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return apiRequest<{ status: string; timestamp: string }>('/health', {
      method: 'GET',
    });
  }
}

// Export convenience functions
export const {
  connectWallet,
  getAccount,
  getBalance,
  signTransaction,
  deployWorkflow,
  getWorkflowStatus,
  validateWorkflow,
  getTemplates,
  healthCheck,
} = BackendAPIClient;

export default BackendAPIClient;
