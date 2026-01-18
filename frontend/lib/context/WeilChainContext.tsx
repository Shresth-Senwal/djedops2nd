/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/context/WeilChainContext.tsx
 * PURPOSE: WeilChain Wallet Context Provider using @weilliptic/weil-sdk
 * 
 * This context provides global WeilWallet connection state to all components.
 * Based on the official SDK pattern from senior developers using
 * WeilWalletConnection from @weilliptic/weil-sdk.
 * 
 * ARCHITECTURE:
 * - Uses window.WeilWallet browser extension for wallet detection
 * - Wraps WeilWalletConnection for contract execution
 * - Handles connection/disconnection lifecycle
 * - Provides contract execution via wallet.contracts.execute()
 * 
 * USAGE:
 * ```tsx
 * // In layout.tsx:
 * <WeilChainProvider>
 *   <YourApp />
 * </WeilChainProvider>
 * 
 * // In any component:
 * const { wallet, isConnected, connect, executeContract } = useWeilChain()
 * 
 * // Execute contract method:
 * const result = await executeContract('contractAddr', 'method_name', { param: value })
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react';
import { WeilWalletConnection } from '@weilliptic/weil-sdk';
import { 
  deployWorkflowSDK, 
  DeployableWorkflow, 
  DeploymentReceipt, 
  DeploymentError 
} from '@/lib/services/workflow-deployment';

/**
 * WeilWallet browser extension interface
 * Used for type-safe access to window.WeilWallet
 */
interface WeilWalletExtension {
  isConnected: () => boolean;
  isSetUp: () => Promise<boolean>;
  isUnlocked: () => Promise<boolean>;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
}

/**
 * Get WeilWallet from window safely
 */
function getWeilWallet(): WeilWalletExtension | null {
  if (typeof window === 'undefined') return null;
  return (window as any).WeilWallet || null;
}

/**
 * Contract address from environment variable
 * In Next.js, use NEXT_PUBLIC_ prefix for client-side env vars
 */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

/**
 * WeilChain state interface
 */
export interface WeilChainState {
  wallet: WeilWalletConnection | null;
  isConnected: boolean;
  isInstalled: boolean;
  address: string | null;
  chainId: string | null;
  error: string | null;
  protocolStatus: 'OPTIMAL' | 'CRITICAL';
}

/**
 * WeilChain context value interface
 */
export interface WeilChainContextValue extends WeilChainState {
  contractAddress: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  executeContract: (contractAddress: string, method: string, params: any) => Promise<any>;
  deployWorkflow: (workflow: DeployableWorkflow) => Promise<DeploymentReceipt | DeploymentError>;
  refreshData: () => Promise<void>;
  setProtocolStatus: (status: 'OPTIMAL' | 'CRITICAL') => void;
}

/**
 * WeilChain Context
 */
const WeilChainContext = createContext<WeilChainContextValue | undefined>(undefined);

/**
 * Local storage key for connection persistence
 */
const STORAGE_KEY = 'weil_wallet_connected';

/**
 * Provider props
 */
export interface WeilChainProviderProps {
  children: ReactNode;
  mockMode?: boolean;
}

/**
 * Helper function to extract address from account object
 * Handles both string addresses and object accounts from WeilWallet
 * Recursively searches for address-like strings in nested objects
 */
function extractAddress(account: any): string | null {
  console.log('[extractAddress] Input:', account, 'Type:', typeof account);
  
  if (!account) {
    console.log('[extractAddress] Account is null/undefined');
    return null;
  }
  
  // Handle string addresses directly
  if (typeof account === 'string' && account.length > 0) {
    console.log('[extractAddress] String address:', account);
    return account;
  }
  
  // Handle object accounts
  if (typeof account === 'object' && account !== null) {
    const keys = Object.keys(account);
    console.log('[extractAddress] Account object keys:', keys);
    
    // Try direct address properties first (case-insensitive)
    const addressKeys = ['address', 'addr', 'account', 'accountAddress', 'walletAddress', 
                         'publicKey', 'pubKey', 'id', 'name', 'value', 'data'];
    
    for (const key of addressKeys) {
      if (key in account) {
        const value = account[key];
        if (typeof value === 'string' && value.length > 10) {
          console.log(`[extractAddress] Found address in .${key}:`, value);
          return value;
        }
        // Recursively check nested object
        if (typeof value === 'object' && value !== null) {
          const nested = extractAddress(value);
          if (nested) return nested;
        }
      }
    }
    
    // Search ALL properties for a string that looks like an address
    for (const key of keys) {
      const value = account[key];
      // Look for hex-like strings (wallet addresses are typically hex)
      if (typeof value === 'string' && value.length >= 20) {
        // Check if it looks like an address (alphanumeric, possibly with weil prefix)
        if (/^(weil)?[a-f0-9]{20,}$/i.test(value) || /^[a-zA-Z0-9]{20,}$/.test(value)) {
          console.log(`[extractAddress] Found address-like string in .${key}:`, value);
          return value;
        }
      }
      // Recursively check nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = extractAddress(value);
        if (nested) return nested;
      }
    }
    
    // Try toString() as last resort
    if ('toString' in account && typeof account.toString === 'function') {
      const str = account.toString();
      if (str && str !== '[object Object]' && str.length > 10) {
        console.log('[extractAddress] Using toString():', str);
        return str;
      }
    }
    
    // If we still have keys and one contains a long string, use it
    for (const key of keys) {
      const value = account[key];
      if (typeof value === 'string' && value.length > 20) {
        console.log(`[extractAddress] Using first long string in .${key}:`, value);
        return value;
      }
    }
  }
  
  console.log('[extractAddress] Failed to extract address from:', JSON.stringify(account));
  return null;
}

/**
 * Parse contract execution result from WeilWallet response
 * Handles Result<T, Error> format with Ok/Err variants
 */
function parseContractResult(result: any): { success: boolean; data?: any; error?: string } {
  if (!result || typeof result !== 'object') {
    return { success: true, data: result };
  }
  
  let resultData = result;
  
  // Check if txn_result exists (Weil Wallet response format)
  if ('txn_result' in result && typeof result.txn_result === 'string') {
    try {
      resultData = JSON.parse(result.txn_result);
    } catch (e) {
      // If parsing fails, treat as string result
      return { success: true, data: result.txn_result };
    }
  }
  
  // Handle Result<T, Error> enum
  if ('Ok' in resultData) {
    const okValue = typeof resultData.Ok === 'string' 
      ? JSON.parse(resultData.Ok) 
      : resultData.Ok;
    return { success: true, data: okValue };
  }
  
  if ('Err' in resultData) {
    const errValue = typeof resultData.Err === 'string' 
      ? resultData.Err 
      : JSON.stringify(resultData.Err);
    return { success: false, error: errValue };
  }
  
  // Fallback: return as-is
  return { success: true, data: resultData };
}

/**
 * WeilChain Provider Component
 * 
 * Manages wallet connection state and provides contract execution capabilities
 * to all child components via React Context.
 */
export function WeilChainProvider({ children, mockMode = false }: WeilChainProviderProps) {
  const [wallet, setWallet] = useState<WeilWalletConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [protocolStatus, setProtocolStatusState] = useState<'OPTIMAL' | 'CRITICAL'>('OPTIMAL');

  /**
   * Check if WeilWallet extension is installed
   */
  const checkWalletInstalled = useCallback((): boolean => {
    // Mock mode always returns true
    if (mockMode || process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      return true;
    }
    
    return !!getWeilWallet();
  }, [mockMode]);

  /**
   * Connect to WeilWallet
   * 
   * Connection flow:
   * 1. Check if wallet extension is installed
   * 2. Check if wallet is set up and unlocked
   * 3. Request accounts via weil_requestAccounts
   * 4. Create WeilWalletConnection instance
   * 5. Store connection state
   */
  const connect = useCallback(async () => {
    setError(null);
    
    try {
      // Mock mode: simulate successful connection
      if (mockMode || process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
        console.log('🎭 Mock wallet connection enabled');
        setIsConnected(true);
        setAddress('weil1mock00000000000000000000000000demo');
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, 'true');
        }
        return;
      }
      
      // Check if wallet extension exists
      const weilWallet = getWeilWallet();
      if (!weilWallet) {
        throw new Error('Weil Wallet not found. Please install the Weil Wallet browser extension.');
      }

      console.log('[WeilChain] Wallet extension detected');

      // Check if wallet is set up
      const isSetUp = await weilWallet.isSetUp();
      console.log('[WeilChain] Wallet setup status:', isSetUp);
      if (!isSetUp) {
        throw new Error('Weil Wallet is not set up. Please set up your wallet first.');
      }

      // Check if wallet is unlocked
      const isUnlocked = await weilWallet.isUnlocked();
      console.log('[WeilChain] Wallet unlock status:', isUnlocked);
      if (!isUnlocked) {
        throw new Error('Weil Wallet is locked. Please unlock your wallet first.');
      }

      // Request accounts connection
      console.log('[WeilChain] Requesting accounts...');
      let accounts: any;
      
      // Try weil_requestAccounts first, then fall back to weil_accounts
      try {
        accounts = await weilWallet.request({ method: 'weil_requestAccounts' });
        console.log('[WeilChain] weil_requestAccounts response:', accounts);
      } catch (err) {
        console.log('[WeilChain] weil_requestAccounts failed, trying weil_accounts...');
        accounts = await weilWallet.request({ method: 'weil_accounts' });
        console.log('[WeilChain] weil_accounts response:', accounts);
      }
      
      console.log('[WeilChain] Accounts type:', typeof accounts, 'Is array:', Array.isArray(accounts));
      console.log('[WeilChain] Full accounts dump:', JSON.stringify(accounts, null, 2));
      
      // Handle different response formats from wallet
      let accountsList: any[] = [];
      
      if (Array.isArray(accounts)) {
        accountsList = accounts;
      } else if (accounts && typeof accounts === 'object') {
        // Check common wrapper properties
        if ('accounts' in accounts && Array.isArray(accounts.accounts)) {
          accountsList = accounts.accounts;
        } else if ('result' in accounts && Array.isArray(accounts.result)) {
          accountsList = accounts.result;
        } else if ('data' in accounts && Array.isArray(accounts.data)) {
          accountsList = accounts.data;
        } else {
          // The response object itself might be the account
          accountsList = [accounts];
        }
      }
      
      console.log('[WeilChain] Processed accounts list:', accountsList);
      console.log('[WeilChain] Accounts list length:', accountsList?.length);
      console.log('[WeilChain] First account (raw):', accountsList?.[0]);
      
      if (!accountsList || !Array.isArray(accountsList) || accountsList.length === 0) {
        throw new Error('No accounts found. Please create an account in Weil Wallet.');
      }

      // Extract address from first account
      const firstAccount = accountsList[0];
      console.log('[WeilChain] Extracting address from:', firstAccount, 'Type:', typeof firstAccount);
      const extractedAddress = extractAddress(firstAccount);
      console.log('[WeilChain] Extracted address:', extractedAddress);
      
      if (!extractedAddress) {
        console.error('[WeilChain] Invalid account format:', accounts[0]);
        throw new Error('Invalid account address format. Please check console for details.');
      }
      
      // Create WeilWalletConnection instance
      const walletConnection = new WeilWalletConnection({
        walletProvider: window.WeilWallet,
      });

      // Update state
      setWallet(walletConnection);
      setIsConnected(true);
      setAddress(extractedAddress);
      
      // Persist connection
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }

      console.log('[WeilChain] Connected successfully:', extractedAddress);
    } catch (err: any) {
      console.error('[WeilChain] Connection failed:', err);
      setError(err.message || 'Failed to connect wallet. Please try again.');
      setIsConnected(false);
      setAddress(null);
      setWallet(null);
    }
  }, [mockMode]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    try {
      // Try to disconnect via wallet extension
      if (window.WeilWallet && window.WeilWallet.isConnected && window.WeilWallet.isConnected()) {
        await window.WeilWallet.request({ method: 'wallet_disconnect' });
      }
    } catch (err) {
      console.error('[WeilChain] Error during disconnect:', err);
    } finally {
      // Always clear state
      setWallet(null);
      setIsConnected(false);
      setAddress(null);
      setError(null);
      setProtocolStatusState('OPTIMAL');
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      
      console.log('[WeilChain] Disconnected');
    }
  }, []);

  /**
   * Execute contract method
   * 
   * Uses wallet.contracts.execute() to call smart contract methods on WeilChain.
   * 
   * @param contractAddr - Contract address (hex string)
   * @param method - Method name to call
   * @param params - Method parameters object
   * @returns Parsed contract execution result
   */
  const executeContract = useCallback(async (
    contractAddr: string, 
    method: string, 
    params: any
  ): Promise<any> => {
    // Mock mode response
    if (mockMode || process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      console.log(`🎭 Mock contract call: ${method}`, params);
      return { success: true, mock: true, data: null };
    }
    
    if (!isConnected || !wallet) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    if (!contractAddr) {
      throw new Error('Contract address is required.');
    }

    try {
      console.log(`[WeilChain] Executing ${method} on ${contractAddr}`, params);
      
      // Execute via WeilWalletConnection SDK
      const result = await wallet.contracts.execute(
        contractAddr,
        method,
        params
      );
      
      console.log(`[WeilChain] ${method} result:`, result);
      
      // Parse the result (handles Ok/Err variants)
      const parsed = parseContractResult(result);
      
      if (!parsed.success) {
        throw new Error(parsed.error || 'Contract execution failed');
      }
      
      return parsed.data;
    } catch (err: any) {
      console.error(`[WeilChain] Contract execution failed (${method}):`, err);
      throw err;
    }
  }, [isConnected, wallet, mockMode]);

  /**
   * Refresh data (placeholder for app-specific refresh logic)
   * Child components can override this behavior as needed
   */
  const refreshData = useCallback(async () => {
    if (!isConnected || !wallet) {
      console.log('[WeilChain] Cannot refresh: wallet not connected');
      return;
    }
    
    console.log('[WeilChain] Refreshing data...');
    // App-specific refresh logic can be added here or in child components
  }, [isConnected, wallet]);

  /**
   * Deploy workflow to WeilChain via SDK
   * 
   * This method deploys a workflow directly through the WeilWallet browser
   * extension, bypassing the backend CLI entirely.
   * 
   * @param workflow - The workflow to deploy
   * @returns DeploymentReceipt on success, DeploymentError on failure
   */
  const deployWorkflow = useCallback(async (
    workflow: DeployableWorkflow
  ): Promise<DeploymentReceipt | DeploymentError> => {
    console.log('[WeilChain] deployWorkflow called');
    
    // Mock mode response
    if (mockMode || process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      console.log('🎭 Mock workflow deployment:', workflow.name);
      return {
        success: true,
        workflowId: workflow.id || `mock_${Date.now()}`,
        txHash: `0xmock${Date.now().toString(16)}`,
        contractAddress: CONTRACT_ADDRESS || 'weil1mock00000000000000000000000000demo',
        timestamp: Date.now(),
        explorerUrl: `https://www.unweil.me/tx/mock${Date.now()}`
      };
    }
    
    if (!wallet || !isConnected) {
      return {
        success: false,
        error: 'Wallet not connected. Please connect your wallet first.',
        code: 'NOT_CONNECTED'
      };
    }
    
    if (!address) {
      return {
        success: false,
        error: 'No wallet address available. Please reconnect.',
        code: 'NO_ADDRESS'
      };
    }
    
    // Deploy using the SDK service
    return await deployWorkflowSDK(workflow, wallet, address);
  }, [wallet, isConnected, address, mockMode]);

  /**
   * Set protocol status (for cross-applet communication)
   */
  const setProtocolStatus = useCallback((status: 'OPTIMAL' | 'CRITICAL') => {
    console.log('[WeilChain] Protocol status changed:', status);
    setProtocolStatusState(status);
  }, []);

  /**
   * Check for existing connection on mount
   */
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window === 'undefined') return;
      
      const wasConnected = localStorage.getItem(STORAGE_KEY) === 'true';
      
      if (wasConnected && window.WeilWallet && window.WeilWallet.isConnected()) {
        try {
          // Get existing accounts
          const accounts = await window.WeilWallet.request({ method: 'weil_accounts' });
          console.log('[WeilChain] Checking existing connection:', accounts);
          
          if (accounts && Array.isArray(accounts) && accounts.length > 0) {
            const extractedAddress = extractAddress(accounts[0]);
            
            if (extractedAddress) {
              const walletConnection = new WeilWalletConnection({
                walletProvider: window.WeilWallet,
              });
              
              setWallet(walletConnection);
              setIsConnected(true);
              setAddress(extractedAddress);
              console.log('[WeilChain] Auto-reconnected:', extractedAddress);
            }
          }
        } catch (err) {
          console.error('[WeilChain] Auto-reconnect failed:', err);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    checkExistingConnection();
  }, []);

  /**
   * Build context value
   */
  const value: WeilChainContextValue = {
    wallet,
    isConnected,
    isInstalled: checkWalletInstalled(),
    address,
    chainId: null,
    error,
    protocolStatus,
    contractAddress: CONTRACT_ADDRESS,
    connect,
    disconnect,
    executeContract,
    deployWorkflow,
    refreshData,
    setProtocolStatus,
  };

  return (
    <WeilChainContext.Provider value={value}>
      {children}
    </WeilChainContext.Provider>
  );
}

/**
 * Hook to access WeilChain context
 * 
 * @throws Error if used outside WeilChainProvider
 * @returns WeilChainContextValue
 */
export function useWeilChain(): WeilChainContextValue {
  const context = useContext(WeilChainContext);
  
  if (context === undefined) {
    throw new Error('useWeilChain must be used within a WeilChainProvider');
  }
  
  return context;
}

/**
 * Default export for convenience
 */
export default WeilChainProvider;
