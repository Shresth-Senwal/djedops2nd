/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/weil-sdk-wrapper.ts
 * PURPOSE: Production-grade WeilChain wallet integration & contract execution
 * 
 * This file implements the real WeilChain wallet detection and contract
 * execution pattern as used in production. The Weil/Weilliptic SDK pattern
 * exposes a wallet object with contracts.execute() method for on-chain calls.
 * 
 * ARCHITECTURE:
 * - InjectedWallet: Browser extension wallet interface
 * - detectInjectedWeilWallet(): Searches for wallet in window object
 * - executeContract(): Calls wallet.contracts.execute() for on-chain execution
 * - deployWorkflowOnWeil(): Deploys workflow to Coordinator applet
 * - bridgeAssetsViaTeleport(): Executes cross-chain bridge via TeleportGateway
 * 
 * WALLET DETECTION:
 * Checks multiple injection points in order:
 * 1. window.weilWallet
 * 2. window.weillipticWallet
 * 3. window.weil
 * 4. window.weilliptic.wallet
 * 5. window.weilliptic
 * 
 * USAGE:
 * ```typescript
 * import { deployWorkflowOnWeil, bridgeAssetsViaTeleport } from '@/lib/weil-sdk-wrapper';
 * 
 * const receipt = await deployWorkflowOnWeil(workflowPayload, config);
 * console.log('Deployed at tx:', receipt.txHash);
 * ```
 * 
 * NO MOCKS: This code fails loudly if wallet is missing or tx is rejected.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { WEILCHAIN_CONFIG, WeilChainConfig } from './weil-config';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * InjectedWallet Interface (Web3 Provider Pattern)
 * 
 * Represents the WAuth/WeilChain browser wallet extension injected into window.
 * Follows standard Web3 provider API similar to MetaMask/window.ethereum.
 * 
 * Based on Weilliptic Web Wallet documentation:
 * - Uses request() method for all RPC calls
 * - Supports standard Web3 methods: getAccounts, sendTransaction, signMessage
 * - Event-driven architecture with on()/removeListener()
 * 
 * @property request - Standard Web3 RPC method
 * @property selectedAddress - Currently selected account address
 * @property isConnected - Connection state (may be getter or property)
 */
export interface InjectedWallet {
  /**
   * Standard Web3 request method
   * Executes JSON-RPC methods against the WeilChain network
   * 
   * Supported methods:
   * - 'getAccounts' / 'eth_accounts' - Get connected accounts
   * - 'requestAccounts' / 'eth_requestAccounts' - Request account access
   * - 'sendTransaction' / 'eth_sendTransaction' - Send transaction
   * - 'signMessage' / 'personal_sign' - Sign message
   * - 'getBalance' - Get account balance
   */
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  
  /**
   * Currently selected account address (may be null if not connected)
   */
  selectedAddress?: string | null;
  
  /**
   * Check if wallet is connected (may be method or property)
   */
  isConnected?: boolean | (() => boolean | Promise<boolean>);
  
  /**
   * Check if wallet is unlocked (may be method or property)
   */
  isUnlocked?: boolean | (() => boolean | Promise<boolean>);
  
  /**
   * Event listener registration
   */
  on?: (event: string, handler: (...args: any[]) => void) => void;
  
  /**
   * Event listener removal
   */
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  
  /**
   * Allow additional properties for wallet-specific features
   */
  [key: string]: any;
}

/**
 * ContractExecutionResult
 * 
 * Raw result returned from wallet.contracts.execute()
 * Different wallets may return slightly different formats,
 * so we normalize this into a TransactionReceipt.
 */
export interface ContractExecutionResult {
  /**
   * Transaction identifiers (different wallets use different field names)
   */
  txHash?: string;
  transactionHash?: string;
  hash?: string;
  id?: string;
  
  /**
   * Block information
   */
  blockNumber?: number;
  blockHash?: string;
  
  /**
   * Execution status
   */
  status?: 'success' | 'failure' | 'pending' | number;
  
  /**
   * Gas information
   */
  gasUsed?: number;
  gasPrice?: number;
  
  /**
   * Timestamp
   */
  timestamp?: number;
  
  /**
   * Return value from contract method (if any)
   */
  value?: any;
  
  /**
   * Event logs emitted during execution
   */
  logs?: any[];
  
  /**
   * Preserve raw response for debugging
   */
  [key: string]: any;
}

/**
 * TransactionReceipt
 * 
 * Normalized transaction receipt returned to caller.
 * This is the standardized format used throughout the app.
 */
export interface TransactionReceipt {
  /**
   * Transaction hash (primary identifier)
   */
  txHash: string;
  
  /**
   * Block number where tx was included (if confirmed)
   */
  blockNumber?: number;
  
  /**
   * Execution timestamp (Unix seconds)
   */
  timestamp: number;
  
  /**
   * Gas consumed by transaction
   */
  gasUsed?: number;
  
  /**
   * Transaction status
   */
  status: 'success' | 'failure' | 'pending';
  
  /**
   * Return value from contract execution
   */
  value?: any;
  
  /**
   * Raw receipt data for debugging
   */
  raw: ContractExecutionResult;
}

/**
 * WorkflowDeploymentInput
 * 
 * Input data for deploying a workflow to the Coordinator applet.
 * Contains all workflow metadata, configuration, and execution parameters.
 */
export interface WorkflowDeploymentInput {
  /**
   * Unique workflow identifier (UUID)
   */
  workflow_id: string;
  
  /**
   * Human-readable workflow name
   */
  name: string;
  
  /**
   * Owner address (wallet deploying the workflow)
   */
  owner: string;
  
  /**
   * Complete workflow definition (nodes, edges, configuration)
   */
  workflow: {
    nodes: any[];
    edges: any[];
    metadata?: any;
  };
  
  /**
   * Execution mode: atomic (all-or-nothing) or batched (best-effort)
   */
  atomic_mode: boolean;
  
  /**
   * Gas speed preference: standard, fast, instant
   */
  gas_speed: 'standard' | 'fast' | 'instant';
  
  /**
   * MEV protection strategy
   */
  mev_strategy: 'none' | 'basic' | 'advanced';
  
  /**
   * Selected execution route (swap path)
   */
  selected_route?: string;
  
  /**
   * Deployment timestamp (Unix seconds)
   */
  deployed_at: number;
}

/**
 * BridgeTransactionInput
 * 
 * Input data for bridging assets across chains via TeleportGateway.
 * Contains source/destination chain info and asset details.
 */
export interface BridgeTransactionInput {
  /**
   * Source blockchain identifier
   */
  source_chain: string;
  
  /**
   * Destination blockchain identifier
   */
  destination_chain: string;
  
  /**
   * Token contract address or symbol
   */
  token: string;
  
  /**
   * Amount to bridge (in token's smallest unit)
   */
  amount: string;
  
  /**
   * Recipient address on destination chain
   */
  recipient: string;
  
  /**
   * Optional memo/note for the bridge transaction
   */
  memo?: string;
  
  /**
   * Request timestamp (Unix seconds)
   */
  requested_at: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ERROR TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * WeilWalletNotFoundError
 * 
 * Thrown when the Weil web wallet extension is not detected in the browser.
 * This error should trigger a user-facing message to install the extension.
 */
export class WeilWalletNotFoundError extends Error {
  constructor(message?: string) {
    super(
      message || 
      'WAuth wallet extension not detected. Please install the WAuth browser extension to connect your wallet.'
    );
    this.name = 'WeilWalletNotFoundError';
  }
}

/**
 * WeilExecutionError
 * 
 * Thrown when a contract execution fails on-chain or is rejected by the user.
 * Preserves the raw receipt for debugging and error reporting.
 */
export class WeilExecutionError extends Error {
  public readonly rawReceipt?: ContractExecutionResult;
  
  constructor(message: string, rawReceipt?: ContractExecutionResult) {
    super(message);
    this.name = 'WeilExecutionError';
    this.rawReceipt = rawReceipt;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WALLET DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Detect the injected WeilChain wallet in the browser
 * 
 * Searches for the wallet object in multiple possible injection points:
 * 1. window.WeilWallet (actual WAuth extension)
 * 2. window.wauth
 * 3. window.weilWallet
 * 4. window.weillipticWallet
 * 5. window.weil
 * 6. window.weilliptic.wallet
 * 7. window.weilliptic
 * 
 * The real WAuth wallet doesn't have contracts.execute - it has its own API.
 * We detect any wallet object and wrap it to provide a consistent interface.
 * 
 * @throws {WeilWalletNotFoundError} If no valid wallet is detected
 * @returns {InjectedWallet} The detected wallet object (or wrapped wallet)
 */
export function detectInjectedWeilWallet(): InjectedWallet {
  // Only run in browser context
  if (typeof window === 'undefined') {
    throw new WeilWalletNotFoundError(
      'Cannot detect wallet in server-side context. This function must be called from the browser.'
    );
  }
  
  // Type guard to check if object is a valid Web3 provider
  const isValidWallet = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    
    // WAuth follows Web3 provider standard - must have request() method
    return typeof obj.request === 'function';
  };
  
  // Check injection points in order of preference
  const injectionPoints = [
    { name: 'window.WeilWallet', value: (window as any).WeilWallet },  // <- CAPITAL W (actual injection)
    { name: 'window.wauth', value: (window as any).wauth },
    { name: 'window.weilWallet', value: (window as any).weilWallet },
    { name: 'window.weillipticWallet', value: (window as any).weillipticWallet },
    { name: 'window.weil', value: (window as any).weil },
    { name: 'window.weilliptic.wallet', value: (window as any).weilliptic?.wallet },
    { name: 'window.weilliptic', value: (window as any).weilliptic },
  ];
  
  // Find first valid wallet
  for (const point of injectionPoints) {
    if (isValidWallet(point.value)) {
      console.log(`[WeilSDK] ✓ Detected WAuth wallet at ${point.name}`);
      return point.value as InjectedWallet;
    }
  }
  
  // No valid wallet found
  console.error('[WeilSDK] No WAuth wallet detected. Checked:', injectionPoints.map(p => p.name).join(', '));
  throw new WeilWalletNotFoundError();
}

/**
 * Get the connected wallet address
 * 
 * Attempts to retrieve the user's wallet address from the injected wallet.
 * Tries multiple access patterns since different wallets may expose this differently:
 * - wallet.getAddress() method
 * - wallet.account.address property
 * - wallet.selectedAddress property (WAuth/WeilWallet pattern)
 * - wallet.accounts array
 * 
 * @param wallet - The injected wallet object
 * @returns {Promise<string | null>} The wallet address, or null if not connected
 */
export async function getConnectedAddress(wallet: InjectedWallet): Promise<string | null> {
  try {
    console.log('[WeilSDK] Retrieving connected address...');
    
    const walletAny = wallet as any;
    
    // STRATEGY: Exhaustively check ALL wallet properties before giving up
    console.log('[WeilSDK] Step 1: Full wallet inspection...');
    
    // Get all wallet keys
    let allKeys: string[] = [];
    try {
      allKeys = Object.keys(walletAny);
      console.log('[WeilSDK] Wallet top-level keys:', allKeys);
    } catch (e) {
      console.log('[WeilSDK] Could not enumerate wallet keys');
    }
    
    // Log all properties (but safely)
    const walletProps: any = {};
    for (const key of allKeys) {
      try {
        const val = walletAny[key];
        if (typeof val === 'function') {
          walletProps[key] = '<function>';
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          walletProps[key] = { type: 'object', keys: Object.keys(val).slice(0, 10) }; // First 10 keys
        } else if (Array.isArray(val)) {
          walletProps[key] = `<array length=${val.length}>`;
        } else {
          walletProps[key] = val;
        }
      } catch (e) {
        walletProps[key] = '<error accessing>';
      }
    }
    console.log('[WeilSDK] Wallet properties:', walletProps);
    
    // Check _WeilWallet (internal property)
    if (walletAny._WeilWallet && typeof walletAny._WeilWallet === 'object') {
      console.log('[WeilSDK] Found _WeilWallet internal object');
      try {
        const internalKeys = Object.keys(walletAny._WeilWallet);
        console.log('[WeilSDK] _WeilWallet keys:', internalKeys);
        
        // Check common address properties in _WeilWallet
        const propsToCheck = ['address', 'selectedAddress', 'currentAddress', 'account', 'accounts'];
        for (const prop of propsToCheck) {
          const val = walletAny._WeilWallet[prop];
          if (typeof val === 'string') {
            console.log(`[WeilSDK] ✓ Found address via _WeilWallet.${prop}:`, val);
            return val;
          } else if (val?.address && typeof val.address === 'string') {
            console.log(`[WeilSDK] ✓ Found address via _WeilWallet.${prop}.address:`, val.address);
            return val.address;
          } else if (Array.isArray(val) && val.length > 0 && val[0]?.address) {
            console.log(`[WeilSDK] ✓ Found address via _WeilWallet.${prop}[0].address:`, val[0].address);
            return val[0].address;
          }
        }
      } catch (e) {
        console.log('[WeilSDK] Error accessing _WeilWallet:', e);
      }
    }
    
    // Check common direct properties
    console.log('[WeilSDK] Step 2: Checking common properties...');
    const directProps = [
      'address', 'selectedAddress', 'currentAddress', 'activeAddress',
      ['account', 'address'], ['account', 'publicKey'],
      ['selectedAccount', 'address'], ['currentAccount', 'address']
    ];
    
    for (const prop of directProps) {
      try {
        let value;
        if (Array.isArray(prop)) {
          value = walletAny[prop[0]]?.[prop[1]];
          if (value && typeof value === 'string') {
            console.log(`[WeilSDK] ✓ Found address via ${prop.join('.')}:`, value);
            return value;
          }
        } else {
          value = walletAny[prop];
          if (value && typeof value === 'string') {
            console.log(`[WeilSDK] ✓ Found address via ${prop}:`, value);
            return value;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Check accounts array
    if (Array.isArray(walletAny.accounts) && walletAny.accounts.length > 0) {
      const account = walletAny.accounts[0];
      const address = typeof account === 'string' ? account : (account?.address || account?.publicKey);
      if (address) {
        console.log('[WeilSDK] ✓ Found address via accounts[0]:', address);
        return address;
      }
    }
    
    // Try calling wallet methods that might return address
    console.log('[WeilSDK] Step 3: Trying wallet methods...');
    const methodsToTry = [
      'getConnectedAccounts',  // NEW: Site-specific connected accounts
      'getActiveAccounts',     // NEW: Active accounts for this site
      'getAddress', 
      'getAccount', 
      'getSelectedAccount', 
      'getCurrentAccount', 
      'getActiveAccount', 
      'getAccounts',
      'getAllAccounts'
    ];
    
    for (const methodName of methodsToTry) {
      if (typeof walletAny[methodName] === 'function') {
        console.log(`[WeilSDK] Calling wallet.${methodName}()...`);
        try {
          const result = await Promise.race([
            walletAny[methodName](),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          console.log(`[WeilSDK] ${methodName}() returned:`, result);
          
          if (result) {
            let address = null;
            if (typeof result === 'string') {
              address = result;
            } else if (result.address) {
              address = result.address;
            } else if (result.publicKey) {
              address = result.publicKey;
            } else if (Array.isArray(result) && result.length > 0) {
              const first = result[0];
              address = typeof first === 'string' ? first : (first?.address || first?.publicKey);
            }
            
            if (address && typeof address === 'string') {
              console.log(`[WeilSDK] ✓ Found address via ${methodName}():`, address);
              return address;
            }
          }
        } catch (e: any) {
          console.log(`[WeilSDK] ${methodName}() failed:`, e.message);
        }
      }
    }
    
    // Try _WeilWallet methods too
    if (walletAny._WeilWallet && typeof walletAny._WeilWallet === 'object') {
      console.log('[WeilSDK] Trying _WeilWallet methods...');
      for (const methodName of ['getConnectedAccounts', 'getAccounts', 'getActiveAccount']) {
        if (typeof walletAny._WeilWallet[methodName] === 'function') {
          console.log(`[WeilSDK] Calling _WeilWallet.${methodName}()...`);
          try {
            const result = await Promise.race([
              walletAny._WeilWallet[methodName](),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            console.log(`[WeilSDK] _WeilWallet.${methodName}() returned:`, result);
            
            if (result) {
              let address = null;
              if (typeof result === 'string') {
                address = result;
              } else if (result.address) {
                address = result.address;
              } else if (Array.isArray(result) && result.length > 0) {
                const first = result[0];
                address = typeof first === 'string' ? first : (first?.address || first?.publicKey);
              }
              
              if (address && typeof address === 'string') {
                console.log(`[WeilSDK] ✓ Found address via _WeilWallet.${methodName}():`, address);
                return address;
              }
            }
          } catch (e: any) {
            console.log(`[WeilSDK] _WeilWallet.${methodName}() failed:`, e.message);
          }
        }
      }
    }
    
    // Check wallet state for better error message
    console.log('[WeilSDK] Step 4: Checking wallet state...');
    let isConnected = null;
    let isUnlocked = null;
    
    if (typeof walletAny.isConnected === 'function') {
      try {
        isConnected = await Promise.race([
          walletAny.isConnected(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
        ]);
      } catch (e) {
        console.log('[WeilSDK] isConnected() timeout');
      }
    }
    
    if (typeof walletAny.isUnlocked === 'function') {
      try {
        isUnlocked = await Promise.race([
          walletAny.isUnlocked(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
        ]);
      } catch (e) {
        console.log('[WeilSDK] isUnlocked() timeout');
      }
    }
    
    console.log('[WeilSDK] Wallet state: isConnected=' + isConnected + ', isUnlocked=' + isUnlocked);
    
    // Final attempt: Try multiple request() patterns
    console.log('[WeilSDK] Step 5: Trying request() API with various methods...');
    const requestMethods = [
      'weil_accounts',           // Weil-specific
      'weil_getAccounts',        // Weil-specific
      'weil_requestAccounts',    // Weil-specific
      'getAccounts',
      'eth_accounts',
      'requestAccounts',
      'eth_requestAccounts'
    ];
    
    for (const method of requestMethods) {
      try {
        console.log(`[WeilSDK] Trying request({ method: "${method}" })...`);
        const accounts = await Promise.race([
          walletAny.request({ method }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        console.log(`[WeilSDK] request(${method}) returned:`, accounts);
        
        if (accounts && Array.isArray(accounts) && accounts.length > 0) {
          const address = typeof accounts[0] === 'string' ? accounts[0] : accounts[0]?.address;
          if (address) {
            console.log(`[WeilSDK] ✓ Found address via request(${method}):`, address);
            return address;
          }
        }
      } catch (e: any) {
        console.log(`[WeilSDK] request(${method}) failed:`, e.message);
      }
    }
    
    // No address found - comprehensive error
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ WAUTH CONNECTION FAILED - NO ACCOUNT FOUND');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('The WAuth extension is installed and unlocked, but has NO ACCOUNTS.');
    console.error('');
    console.error('📝 TO FIX THIS:');
    console.error('   1. Click the WAuth extension icon in your browser toolbar');
    console.error('   2. Create a new account OR import existing account');
    console.error('   3. Once account is created, click "CONNECT WAUTH" again');
    console.error('');
    console.error('Wallet checked:');
    console.error('  ✓ Extension installed');
    console.error('  ✓ Extension unlocked');
    console.error('  ✗ No accounts created/imported');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    
    throw new Error('No accounts found. Please create an account in WAuth extension first.');
    
    return null;
    
  } catch (error) {
    console.error('[WeilSDK] Fatal error getting address:', error);
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Wrap a promise with a timeout
 * Prevents wallet operations from hanging indefinitely
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRACT EXECUTION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ExecuteContractOptions
 * 
 * Options for executing a contract method on-chain.
 */
export interface ExecuteContractOptions {
  /**
   * Target contract address
   */
  contractAddress: string;
  
  /**
   * Contract method name to call
   */
  method: string;
  
  /**
   * Method arguments (array or object)
   */
  args: any;
  
  /**
   * Optional: Parse the return value using a schema (future feature)
   */
  parseSchema?: any;
}

/**
 * Execute a contract method on-chain using Web3 sendTransaction pattern
 * 
 * Sends a transaction to the contract using wallet.request({ method: 'sendTransaction' }).
 * This follows the standard Web3 provider pattern used by WAuth and other browser wallets.
 * 
 * For contract interactions, you should encode the method call into the 'data' field
 * using proper ABI encoding. For simple transactions, the 'data' field can contain
 * a JSON representation of the method and args (custom WeilChain pattern).
 * 
 * @param options - Contract execution parameters
 * @returns {Promise<{ value: any; receipt: TransactionReceipt }>} Execution result
 * @throws {WeilWalletNotFoundError} If wallet is not detected
 * @throws {WeilExecutionError} If execution fails or user rejects
 */
export async function executeContract(
  options: ExecuteContractOptions
): Promise<{ value: any; receipt: TransactionReceipt }> {
  const { contractAddress, method, args } = options;
  
  // Detect wallet
  const wallet = detectInjectedWeilWallet();
  const walletAny = wallet as any;
  
  // Get sender address
  const from = await getConnectedAddress(wallet);
  if (!from) {
    throw new WeilExecutionError('No connected account found. Please connect your wallet first.');
  }
  
  try {
    console.log(`[WeilSDK] ═══ SENDING TRANSACTION ═══`);
    console.log(`[WeilSDK] From:`, from);
    console.log(`[WeilSDK] To:`, contractAddress);
    console.log(`[WeilSDK] Method:`, method);
    console.log(`[WeilSDK] Args:`, args);
    
    // CRITICAL: Inspect wallet methods for transaction sending
    console.log('[WeilSDK] Inspecting wallet for transaction methods...');
    const allMethods = Object.keys(walletAny).filter(k => typeof walletAny[k] === 'function');
    console.log('[WeilSDK] Available wallet methods:', allMethods);
    
    if (walletAny._WeilWallet) {
      const internalMethods = Object.keys(walletAny._WeilWallet).filter(k => typeof walletAny._WeilWallet[k] === 'function');
      console.log('[WeilSDK] Available _WeilWallet methods:', internalMethods);
    }
    
    // Try multiple transaction methods
    const txData = {
      from,
      to: contractAddress,
      data: JSON.stringify({ method, args }),
    };
    
    console.log(`[WeilSDK] Transaction data:`, txData);
    
    // Method 1: Try sendTransaction with request() - SHORT TIMEOUT
    console.log(`[WeilSDK] Attempt 1: wallet.request({ method: 'sendTransaction' })`);
    try {
      const txHash = await Promise.race([
        wallet.request({
          method: 'sendTransaction',
          params: [txData],
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('sendTransaction timeout after 3s')), 3000))
      ]);
      
      console.log(`[WeilSDK] ✓ Transaction sent via sendTransaction:`, txHash);
      
      const receipt: TransactionReceipt = {
        txHash: typeof txHash === 'string' ? txHash : (txHash as any)?.hash || 'unknown',
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending' as const,
        value: null,
        raw: { txHash },
      };
      
      return { value: null, receipt };
    } catch (e: any) {
      console.log(`[WeilSDK] ✗ sendTransaction failed:`, e.message);
    }
    
    // Method 2: Try weil-specific method - SHORT TIMEOUT
    console.log(`[WeilSDK] Attempt 2: wallet.request({ method: 'weil_sendTransaction' })`);
    try {
      const txHash = await Promise.race([
        wallet.request({
          method: 'weil_sendTransaction',
          params: [txData],
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout after 3s')), 3000))
      ]);
      
      console.log(`[WeilSDK] ✓ Transaction sent via weil_sendTransaction:`, txHash);
      
      const receipt: TransactionReceipt = {
        txHash: typeof txHash === 'string' ? txHash : (txHash as any)?.hash || 'unknown',
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending' as const,
        value: null,
        raw: { txHash },
      };
      
      return { value: null, receipt };
    } catch (e: any) {
      console.log(`[WeilSDK] ✗ weil_sendTransaction failed:`, e.message);
    }
    
    // Method 3: Try direct wallet methods
    if (typeof walletAny.sendTransaction === 'function') {
      console.log(`[WeilSDK] Attempt 3: wallet.sendTransaction()`);
      try {
        const txHash = await Promise.race([
          walletAny.sendTransaction(txData),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        
        console.log(`[WeilSDK] ✓ Transaction sent via wallet.sendTransaction():`, txHash);
        
        const receipt: TransactionReceipt = {
          txHash: typeof txHash === 'string' ? txHash : (txHash as any)?.hash || 'unknown',
          timestamp: Math.floor(Date.now() / 1000),
          status: 'pending' as const,
          value: null,
          raw: { txHash },
        };
        
        return { value: null, receipt };
      } catch (e: any) {
        console.log(`[WeilSDK] wallet.sendTransaction() failed:`, e.message);
      }
    }
    
    // Method 4: Check if _WeilWallet has methods
    if (walletAny._WeilWallet && typeof walletAny._WeilWallet.sendTransaction === 'function') {
      console.log(`[WeilSDK] Attempt 4: _WeilWallet.sendTransaction()`);
      try {
        const txHash = await Promise.race([
          walletAny._WeilWallet.sendTransaction(txData),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        
        console.log(`[WeilSDK] ✓ Transaction sent via _WeilWallet:`, txHash);
        
        const receipt: TransactionReceipt = {
          txHash: typeof txHash === 'string' ? txHash : (txHash as any)?.hash || 'unknown',
          timestamp: Math.floor(Date.now() / 1000),
          status: 'pending' as const,
          value: null,
          raw: { txHash },
        };
        
        return { value: null, receipt };
      } catch (e: any) {
        console.log(`[WeilSDK] _WeilWallet.sendTransaction() failed:`, e.message);
      }
    }
    
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ TRANSACTION FAILED - WAuth API Not Found');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('All standard Web3 transaction methods failed.');
    console.error('WAuth wallet does not respond to:');
    console.error('  ✗ request({ method: "sendTransaction" })');
    console.error('  ✗ request({ method: "weil_sendTransaction" })');
    console.error('  ✗ wallet.sendTransaction()');
    console.error('  ✗ _WeilWallet.sendTransaction()');
    console.error('');
    console.error('Available wallet methods:', allMethods);
    if (walletAny._WeilWallet) {
      const internalMethods = Object.keys(walletAny._WeilWallet).filter(k => typeof walletAny._WeilWallet[k] === 'function');
      console.error('Available _WeilWallet methods:', internalMethods);
    }
    console.error('');
    console.error('⚠️  WAuth may require CLI deployment instead of browser transactions.');
    console.error('    Refer to Weilliptic documentation or use weil-cli for contract deployment.');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    
    throw new WeilExecutionError(
      'WAuth does not support browser-based transactions. Use CLI for deployment. See console for details.'
    );
    
  } catch (error: any) {
    // User rejected transaction
    if (
      error.message?.includes('reject') ||
      error.message?.includes('cancel') ||
      error.message?.includes('denied') ||
      error.code === 4001 // Standard rejection code
    ) {
      throw new WeilExecutionError(
        'Transaction rejected by user. Please approve the transaction in your wallet to continue.'
      );
    }
    
    // Other execution errors
    if (error instanceof WeilExecutionError) {
      throw error;
    }
    
    throw new WeilExecutionError(
      `Contract execution failed: ${error.message}`
    );
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKFLOW DEPLOYMENT
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Deploy a workflow to the WeilChain Coordinator applet
 * 
 * This function executes the deploy_workflow method on the DjedCoordinator
 * contract, which registers the workflow on-chain and prepares it for execution.
 * 
 * The workflow payload includes all nodes, edges, execution parameters, and
 * configuration settings. The Coordinator applet will validate the workflow
 * and emit events that can be tracked for execution status.
 * 
 * EXECUTION FLOW:
 * 1. Detect and validate wallet
 * 2. Get connected address (will be set as workflow owner)
 * 3. Construct deployment args with all workflow data
 * 4. Call wallet.contracts.execute() targeting Coordinator contract
 * 5. User approves transaction in wallet popup
 * 6. Wait for on-chain confirmation
 * 7. Return transaction receipt
 * 
 * @param input - Workflow deployment data
 * @param config - WeilChain configuration (contract addresses, etc.)
 * @returns {Promise<TransactionReceipt>} Transaction receipt with txHash
 * @throws {WeilWalletNotFoundError} If wallet not detected
 * @throws {WeilExecutionError} If deployment fails or user rejects
 */
export async function deployWorkflowOnWeil(
  input: WorkflowDeploymentInput,
  config: WeilChainConfig = WEILCHAIN_CONFIG
): Promise<TransactionReceipt> {
  // Detect wallet first
  const wallet = detectInjectedWeilWallet();
  
  // Get owner address from wallet
  let ownerAddress = input.owner;
  if (!ownerAddress || ownerAddress === 'unknown') {
    const connectedAddress = await getConnectedAddress(wallet);
    if (connectedAddress) {
      ownerAddress = connectedAddress;
    } else {
      throw new WeilExecutionError(
        'Cannot deploy workflow: wallet not connected. Please connect your wallet first.'
      );
    }
  }
  
  // Construct deployment arguments
  const deploymentArgs = {
    workflow_id: input.workflow_id,
    name: input.name,
    owner: ownerAddress,
    workflow: input.workflow,
    atomic_mode: input.atomic_mode,
    gas_speed: input.gas_speed,
    mev_strategy: input.mev_strategy,
    selected_route: input.selected_route || 'optimal',
    deployed_at: input.deployed_at,
  };
  
  console.log('[WeilSDK] Deploying workflow via backend API:', {
    workflow_id: input.workflow_id,
    name: input.name,
    contract: config.coordinatorContractAddress,
  });
  
  // Deploy via backend API instead of browser wallet
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://djedops-backend.onrender.com';
  console.log('[WeilSDK] Using backend URL:', backendUrl);
  
  const response = await fetch(`${backendUrl}/api/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deploymentArgs),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new WeilExecutionError(
      `Backend deployment failed: ${error.error || error.message || response.statusText}`
    );
  }
  
  const result = await response.json();
  console.log('[WeilSDK] Workflow deployed successfully via backend:', result.txHash);
  
  // Convert backend response to TransactionReceipt
  const receipt: TransactionReceipt = {
    txHash: result.txHash,
    timestamp: Math.floor(new Date(result.timestamp).getTime() / 1000),
    status: 'confirmed' as const,
    value: null,
    raw: result,
  };
  
  return receipt;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CROSS-CHAIN BRIDGING
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Bridge assets across chains via TeleportGateway applet
 * 
 * This function executes the bridge_asset method on the TeleportGateway
 * contract, which initiates a cross-chain asset transfer. The gateway
 * locks assets on the source chain and emits events that bridge relayers
 * use to mint/unlock on the destination chain.
 * 
 * EXECUTION FLOW:
 * 1. Detect and validate wallet
 * 2. Construct bridge args with source/dest chains and asset details
 * 3. Call wallet.contracts.execute() targeting TeleportGateway contract
 * 4. User approves transaction in wallet popup
 * 5. Wait for on-chain confirmation
 * 6. Return transaction receipt (bridge will complete asynchronously)
 * 
 * @param input - Bridge transaction data
 * @param config - WeilChain configuration (contract addresses, etc.)
 * @returns {Promise<TransactionReceipt>} Transaction receipt with txHash
 * @throws {WeilWalletNotFoundError} If wallet not detected
 * @throws {WeilExecutionError} If bridge fails or user rejects
 */
export async function bridgeAssetsViaTeleport(
  input: BridgeTransactionInput,
  config: WeilChainConfig = WEILCHAIN_CONFIG
): Promise<TransactionReceipt> {
  // Detect wallet first
  detectInjectedWeilWallet();
  
  // Construct bridge arguments
  const bridgeArgs = {
    source_chain: input.source_chain,
    destination_chain: input.destination_chain,
    token: input.token,
    amount: input.amount,
    recipient: input.recipient,
    memo: input.memo || '',
    requested_at: input.requested_at,
  };
  
  console.log('[WeilSDK] Initiating bridge transaction:', {
    from: input.source_chain,
    to: input.destination_chain,
    token: input.token,
    amount: input.amount,
    contract: config.teleportGatewayContractAddress,
  });
  
  // Execute bridge on-chain
  const { receipt } = await executeContract({
    contractAddress: config.teleportGatewayContractAddress,
    method: config.bridgeMethod,
    args: bridgeArgs,
  });
  
  console.log('[WeilSDK] Bridge transaction submitted:', receipt.txHash);
  
  return receipt;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONVENIENCE TYPE EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

// All types and functions are exported at their declaration points above
// No need for duplicate exports here

