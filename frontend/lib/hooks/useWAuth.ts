/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/hooks/useWAuth.ts
 * PURPOSE: React hook for Weil Wallet (WAuth) connection using SDK pattern
 * 
 * This hook manages the connection state for the Weil Wallet browser extension
 * using the @weilliptic/weil-sdk WeilWalletConnection class.
 * 
 * FEATURES:
 * - Auto-detection of WeilWallet extension
 * - SDK-based wallet connection (no CLI required)
 * - Connection/disconnection flow
 * - Persistent connection state (localStorage)
 * - Address retrieval from wallet
 * - Contract execution via wallet.contracts.execute()
 * - Error handling with user-friendly messages
 * 
 * USAGE:
 * ```typescript
 * const { isConnected, address, connect, disconnect, executeContract, error } = useWAuth();
 * 
 * // Connect wallet
 * await connect();
 * 
 * // Execute contract method
 * const result = await executeContract('contractAddr', 'method_name', { param: value });
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeilWalletConnection } from '@weilliptic/weil-sdk';

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
 * Hook return type
 */
interface UseWAuthReturn {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  wallet: WeilWalletConnection | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  executeContract: (contractAddress: string, method: string, params: any) => Promise<any>;
}

/**
 * Local storage key for persisting connection state
 */
const STORAGE_KEY = 'wauth_connected';

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
  
  return { success: true, data: resultData };
}

/**
 * useWAuth - React hook for WeilWallet connection using SDK pattern
 * 
 * Provides wallet connection state and contract execution capabilities
 * using the @weilliptic/weil-sdk WeilWalletConnection class.
 */
export function useWAuth(): UseWAuthReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WeilWalletConnection | null>(null);

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
    setIsLoading(true);
    setError(null);

    try {
      // Check if wallet extension exists
      const weilWallet = getWeilWallet();
      if (!weilWallet) {
        throw new Error('Weil Wallet not found. Please install the Weil Wallet browser extension.');
      }

      console.log('[WAuth] Wallet extension detected');

      // Check if wallet is set up
      const isSetUp = await weilWallet.isSetUp();
      console.log('[WAuth] Wallet setup status:', isSetUp);
      if (!isSetUp) {
        throw new Error('Weil Wallet is not set up. Please set up your wallet first.');
      }

      // Check if wallet is unlocked
      const isUnlocked = await weilWallet.isUnlocked();
      console.log('[WAuth] Wallet unlock status:', isUnlocked);
      if (!isUnlocked) {
        throw new Error('Weil Wallet is locked. Please unlock your wallet first.');
      }

      // Request accounts connection
      console.log('[WAuth] Requesting accounts...');
      let accounts: any;
      
      // Try weil_requestAccounts first, then fall back to weil_accounts
      try {
        accounts = await weilWallet.request({ method: 'weil_requestAccounts' });
        console.log('[WAuth] weil_requestAccounts response:', accounts);
      } catch (err) {
        console.log('[WAuth] weil_requestAccounts failed, trying weil_accounts...');
        accounts = await weilWallet.request({ method: 'weil_accounts' });
        console.log('[WAuth] weil_accounts response:', accounts);
      }
      
      console.log('[WAuth] Accounts type:', typeof accounts, 'Is array:', Array.isArray(accounts));
      console.log('[WAuth] Full accounts dump:', JSON.stringify(accounts, null, 2));
      
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
      
      console.log('[WAuth] Processed accounts list:', accountsList);
      console.log('[WAuth] Accounts list length:', accountsList?.length);
      console.log('[WAuth] First account (raw):', accountsList?.[0]);
      
      if (!accountsList || !Array.isArray(accountsList) || accountsList.length === 0) {
        throw new Error('No accounts found. Please create an account in Weil Wallet.');
      }

      // Extract address from first account
      const firstAccount = accountsList[0];
      console.log('[WAuth] Extracting address from:', firstAccount, 'Type:', typeof firstAccount);
      const extractedAddress = extractAddress(firstAccount);
      console.log('[WAuth] Extracted address:', extractedAddress);
      
      if (!extractedAddress) {
        console.error('[WAuth] Invalid account format:', accountsList[0]);
        throw new Error('Invalid account address format. Please check console for details.');
      }
      
      // Create WeilWalletConnection instance from SDK
      const walletConnection = new WeilWalletConnection({
        walletProvider: weilWallet as any,
      });

      // Update state
      setWallet(walletConnection);
      setIsConnected(true);
      setAddress(extractedAddress);
      
      // Persist connection
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }

      console.log('[WAuth] Connected successfully:', extractedAddress);
    } catch (err: any) {
      console.error('[WAuth] Connection failed:', err);
      
      // Provide helpful error messages
      if (err.message?.includes('not found')) {
        setError('WAuth wallet extension not installed. Please install the extension to connect.');
      } else if (err.message?.includes('rejected')) {
        setError('Connection cancelled. Please approve the connection in your Weil Wallet.');
      } else if (err.message?.includes('No accounts')) {
        setError('⚠️ NO ACCOUNT FOUND: Please open Weil Wallet and create or import an account first!');
      } else {
        setError(err.message || 'Connection failed. Please ensure Weil Wallet is installed and unlocked.');
      }
      
      setIsConnected(false);
      setAddress(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    try {
      // Try to disconnect via wallet extension
      const weilWallet = getWeilWallet();
      if (weilWallet && weilWallet.isConnected && weilWallet.isConnected()) {
        await weilWallet.request({ method: 'wallet_disconnect' });
      }
    } catch (err) {
      console.error('[WAuth] Error during disconnect:', err);
    } finally {
      // Always clear state
      setWallet(null);
      setIsConnected(false);
      setAddress(null);
      setError(null);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      
      console.log('[WAuth] Disconnected');
    }
  }, []);

  /**
   * Execute contract method
   * 
   * Uses wallet.contracts.execute() to call smart contract methods on WeilChain.
   * 
   * @param contractAddress - Contract address (hex string)
   * @param method - Method name to call
   * @param params - Method parameters object
   * @returns Parsed contract execution result
   */
  const executeContract = useCallback(async (
    contractAddress: string, 
    method: string, 
    params: any
  ): Promise<any> => {
    if (!isConnected || !wallet) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    if (!contractAddress) {
      throw new Error('Contract address is required.');
    }

    try {
      console.log(`[WAuth] Executing ${method} on ${contractAddress}`, params);
      
      // Execute via WeilWalletConnection SDK
      const result = await wallet.contracts.execute(
        contractAddress,
        method,
        params
      );
      
      console.log(`[WAuth] ${method} result:`, result);
      
      // Parse the result (handles Ok/Err variants)
      const parsed = parseContractResult(result);
      
      if (!parsed.success) {
        throw new Error(parsed.error || 'Contract execution failed');
      }
      
      return parsed.data;
    } catch (err: any) {
      console.error(`[WAuth] Contract execution failed (${method}):`, err);
      throw err;
    }
  }, [isConnected, wallet]);

  /**
   * Auto-reconnect on mount if previously connected
   */
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window === 'undefined') return;
      
      const wasConnected = localStorage.getItem(STORAGE_KEY) === 'true';
      
      // Only attempt reconnection if wallet extension is present
      const weilWallet = getWeilWallet();
      if (wasConnected && weilWallet) {
        try {
          // Check if wallet is still connected
          if (weilWallet.isConnected && weilWallet.isConnected()) {
            // Get existing accounts
            const accounts = await weilWallet.request({ method: 'weil_accounts' });
            console.log('[WAuth] Checking existing connection:', accounts);
            
            if (accounts && Array.isArray(accounts) && accounts.length > 0) {
              const extractedAddress = extractAddress(accounts[0]);
              
              if (extractedAddress) {
                const walletConnection = new WeilWalletConnection({
                  walletProvider: weilWallet as any,
                });
                
                setWallet(walletConnection);
                setIsConnected(true);
                setAddress(extractedAddress);
                console.log('[WAuth] Auto-reconnected:', extractedAddress);
                return;
              }
            }
          }
        } catch (err) {
          console.error('[WAuth] Auto-reconnect failed:', err);
        }
        
        // Clear stored state if reconnection fails
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    checkExistingConnection();
  }, []);

  return {
    isConnected,
    address,
    isLoading,
    error,
    wallet,
    connect,
    disconnect,
    executeContract,
  };
}

/**
 * Default export for convenience
 */
export default useWAuth;
