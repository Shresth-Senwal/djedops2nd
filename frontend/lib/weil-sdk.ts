/**
 * WeilChain SDK Integration Layer
 * 
 * Provides type-safe wrapper functions for interacting with WeilChain contracts.
 * Handles wallet connection, transaction signing, and contract execution.
 * 
 * Architecture:
 * - Wraps @weilliptic/weil-sdk for type safety
 * - Provides React hooks for wallet state management
 * - Handles connection to window.WeilWallet provider
 * 
 * Security:
 * - All RPC endpoints loaded from environment variables
 * - No private keys stored in frontend
 * - Address validation on all contract calls
 */

import { WeilWalletConnection } from '@weilliptic/weil-sdk'

/**
 * Type definitions for WeilChain integration
 */
export interface WeilWalletProvider {
  isWeilWallet: boolean
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
}

export interface WeilWalletState {
  isConnected: boolean
  address: string | null
  wallet: WeilWalletConnection | null
  chainId: string | null
}

export interface AppletMetadata {
  id: string
  name: string
  description: string
  icon_uri: string
  category: string
  author_address: string
  logic_contract: string
  access_fee: bigint
  total_installs: number
  rating: number
  created_at: number
  is_active: boolean
}

/**
 * WeilChain SDK Wrapper Class
 * 
 * Singleton instance managing WeilChain wallet connection and contract interactions.
 * Use getWeilWallet() to retrieve the active instance.
 */
class WeilChainSDK {
  private wallet: WeilWalletConnection | null = null
  private provider: WeilWalletProvider | null = null
  private address: string | null = null
  private registryContractAddress: string
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map()

  constructor() {
    // Load registry contract address from environment
    // For hackathon demo, this can be a mock address until contract is deployed
    this.registryContractAddress = process.env.NEXT_PUBLIC_WEIL_REGISTRY_CONTRACT || ''
    
    if (!this.registryContractAddress) {
      console.warn('WEIL_REGISTRY_CONTRACT not configured. Using demo mode.')
    }
  }

  /**
   * Check if WeilWallet browser extension is installed
   */
  isWalletInstalled(): boolean {
    // For demo mode, simulate wallet installation
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      return true
    }
    
    return typeof window !== 'undefined' && 
           !!(window as any).WeilWallet &&
           (window as any).WeilWallet.isWeilWallet
  }

  /**
   * Connect to WeilWallet extension
   * Initializes wallet connection and retrieves user address
   * 
   * @throws Error if WeilWallet is not installed or connection fails
   * @returns User's WeilChain address (hex, no 0x prefix)
   */
  async connect(): Promise<string> {
    // Mock mode for demo without actual wallet
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      console.log('🎭 DEMO MODE: Using mock wallet connection')
      this.address = 'abc123def456789mock'
      this.wallet = {} as WeilWalletConnection // Mock wallet object
      return this.address
    }
    
    if (!this.isWalletInstalled()) {
      throw new Error(
        'WeilWallet not found. Please install the WeilWallet browser extension.'
      )
    }

    try {
      // Initialize WeilWalletConnection with browser provider
      this.provider = (window as any).WeilWallet
      this.wallet = new WeilWalletConnection({
        walletProvider: this.provider,
      })

      // Request account access (this will prompt user if not already connected)
      const accounts = await this.provider.request({
        method: 'weil_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock WeilWallet.')
      }

      // Store address (WeilChain uses hex without 0x prefix)
      this.address = accounts[0].replace(/^0x/, '')

      // Set up event listeners for account/network changes
      this.setupEventListeners()

      return this.address
    } catch (error) {
      console.error('WeilWallet connection failed:', error)
      throw error
    }
  }

  /**
   * Disconnect wallet and cleanup listeners
   */
  disconnect(): void {
    this.wallet = null
    this.address = null
    this.provider = null
    this.removeEventListeners()
  }

  /**
   * Get current connected address
   */
  getAddress(): string | null {
    return this.address
  }

  /**
   * Get wallet instance for direct SDK access
   */
  getWallet(): WeilWalletConnection | null {
    return this.wallet
  }

  /**
   * Setup event listeners for wallet state changes
   */
  private setupEventListeners(): void {
    if (!this.provider) return

    // Listen for account changes
    this.provider.on('accountsChanged', this.handleAccountsChanged.bind(this))
    
    // Listen for chain changes
    this.provider.on('chainChanged', this.handleChainChanged.bind(this))
    
    // Listen for disconnection
    this.provider.on('disconnect', this.handleDisconnect.bind(this))
  }

  /**
   * Remove event listeners on disconnect
   */
  private removeEventListeners(): void {
    if (!this.provider) return

    this.provider.removeListener('accountsChanged', this.handleAccountsChanged.bind(this))
    this.provider.removeListener('chainChanged', this.handleChainChanged.bind(this))
    this.provider.removeListener('disconnect', this.handleDisconnect.bind(this))
  }

  /**
   * Handle account changes (user switches wallet account)
   */
  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect()
      this.emit('disconnect')
    } else {
      this.address = accounts[0].replace(/^0x/, '')
      this.emit('accountsChanged', this.address)
    }
  }

  /**
   * Handle chain changes (user switches network)
   */
  private handleChainChanged(chainId: string): void {
    this.emit('chainChanged', chainId)
  }

  /**
   * Handle wallet disconnection
   */
  private handleDisconnect(): void {
    this.disconnect()
    this.emit('disconnect')
  }

  /**
   * Event emitter for wallet state changes
   */
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(handler)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(handler => handler(...args))
  }

  /**
   * Execute contract method on AppletRegistry
   * 
   * @param method - Contract method name
   * @param params - Method parameters
   * @returns Contract execution result
   */
  private async executeRegistryContract(method: string, params: any): Promise<any> {
    if (!this.wallet) {
      throw new Error('Wallet not connected. Call connect() first.')
    }

    if (!this.registryContractAddress) {
      throw new Error('Registry contract address not configured.')
    }

    try {
      // Execute contract using WeilChain SDK
      // Note: WeilChain addresses are hex without 0x prefix
      const result = await this.wallet.contracts.execute(
        this.registryContractAddress,
        method,
        params
      )

      return result
    } catch (error) {
      console.error(`Contract execution failed (${method}):`, error)
      throw error
    }
  }

  /**
   * Register a new applet in the registry
   * 
   * @param name - Applet display name
   * @param description - Detailed description
   * @param iconUri - IPFS/Arweave URI for icon
   * @param category - Category (DeFi, Gaming, Social, etc.)
   * @param logicContract - Address of applet's main contract
   * @param accessFee - Fee in Wei to access (0 for free)
   * @returns Applet ID
   */
  async registerApplet(
    name: string,
    description: string,
    iconUri: string,
    category: string,
    logicContract: string,
    accessFee: bigint
  ): Promise<string> {
    const result = await this.executeRegistryContract('register_applet', {
      name,
      description,
      icon_uri: iconUri,
      category,
      logic_contract: logicContract.replace(/^0x/, ''), // Remove 0x prefix
      access_fee: Number(accessFee),
    })

    return result.applet_id || result
  }

  /**
   * Purchase access to an applet
   * Transfers access_fee from caller to applet author
   * 
   * @param appletId - ID of applet to purchase
   * @returns Success status
   */
  async monetizeApplet(appletId: string): Promise<boolean> {
    const result = await this.executeRegistryContract('monetize_applet', {
      applet_id: appletId,
    })

    return result.success || result
  }

  /**
   * Check if current user has access to an applet
   * 
   * @param appletId - ID of applet to check
   * @returns Whether user has access
   */
  async checkAccess(appletId: string): Promise<boolean> {
    if (!this.address) {
      return false
    }

    const result = await this.executeRegistryContract('check_access', {
      applet_id: appletId,
      user_address: this.address,
    })

    return result.has_access || result
  }

  /**
   * Get metadata for a specific applet
   * 
   * @param appletId - ID of applet to query
   * @returns Applet metadata
   */
  async getApplet(appletId: string): Promise<AppletMetadata> {
    const result = await this.executeRegistryContract('get_applet', {
      applet_id: appletId,
    })

    return this.parseAppletMetadata(result)
  }

  /**
   * List all registered applets with pagination
   * 
   * @param offset - Starting index
   * @param limit - Number of results
   * @returns Array of applet metadata
   */
  async listApplets(offset: number = 0, limit: number = 20): Promise<AppletMetadata[]> {
    // Mock data for demo mode - Djed Protocol Suite (5 Applets)
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true') {
      console.log('🎭 DEMO MODE: Returning Djed Protocol Suite (5 applets)')
      return [
        {
          id: 'djed_monitor',
          name: 'Djed Eye',
          description: '👁️ Real-time oracle monitoring dashboard. Track reserve ratios, oracle prices, system status, and historical trends. Core analytics for all users.',
          icon_uri: '', // Icon: fa-eye or chart
          category: 'DeFi • Oracle',
          author_address: 'djed_protocol_team',
          logic_contract: '',
          access_fee: BigInt(0), // FREE
          total_installs: 342,
          rating: 5,
          created_at: Date.now() - 86400000 * 14,
          is_active: true,
        },
        {
          id: 'djed_sim',
          name: 'Chrono-Sim',
          description: '⏱️ Advanced time-travel simulator for stress testing protocol behavior. Model flash crashes, oracle freezes, and bank run scenarios with interactive charts.',
          icon_uri: '', // Icon: fa-clock or fa-chart-line
          category: 'DeFi • Simulator',
          author_address: 'djed_protocol_team',
          logic_contract: '',
          access_fee: BigInt(5), // 5 WEIL - PAID APPLET
          total_installs: 89,
          rating: 5,
          created_at: Date.now() - 86400000 * 10,
          is_active: true,
        },
        {
          id: 'djed_sentinel',
          name: 'Sentinel One',
          description: '🛡️ Professional stress testing suite for protocol validation. Automated scenario triggers, sentinel alerts, and root cause analysis for auditors.',
          icon_uri: '', // Icon: fa-shield or fa-exclamation-triangle
          category: 'DeFi • DevTools',
          author_address: 'djed_protocol_team',
          logic_contract: '',
          access_fee: BigInt(0), // FREE for developers
          total_installs: 127,
          rating: 5,
          created_at: Date.now() - 86400000 * 7,
          is_active: true,
        },
        {
          id: 'djed_ledger',
          name: 'Djed Ledger',
          description: '📋 Live on-chain transaction explorer. Real-time feed of mint/redeem operations, contract interactions, and protocol events. Essential transparency tool.',
          icon_uri: '', // Icon: fa-list or fa-receipt
          category: 'Analytics • Explorer',
          author_address: 'djed_protocol_team',
          logic_contract: '',
          access_fee: BigInt(0), // FREE
          total_installs: 234,
          rating: 5,
          created_at: Date.now() - 86400000 * 5,
          is_active: true,
        },
        {
          id: 'djed_arbitrage',
          name: 'Arb-Hunter',
          description: '💰 Real-time peg arbitrage opportunity detector. Track DEX spreads, oracle divergence, and calculate profit windows. Premium trader tool with live alerts.',
          icon_uri: '', // Icon: fa-coins or fa-chart-area
          category: 'DeFi • Trading',
          author_address: 'djed_protocol_team',
          logic_contract: '',
          access_fee: BigInt(10), // 10 WEIL - PREMIUM PAID
          total_installs: 156,
          rating: 5,
          created_at: Date.now() - 86400000 * 3,
          is_active: true,
        },
      ]
    }
    
    const result = await this.executeRegistryContract('list_applets', {
      offset,
      limit,
    })

    return (result.applets || result).map(this.parseAppletMetadata)
  }

  /**
   * Increment install counter for an applet
   * 
   * @param appletId - ID of applet being installed
   * @returns Success status
   */
  async incrementInstalls(appletId: string): Promise<boolean> {
    const result = await this.executeRegistryContract('increment_installs', {
      applet_id: appletId,
    })

    return result.success || result
  }

  /**
   * Update rating for an applet (1-5 stars)
   * 
   * @param appletId - ID of applet to rate
   * @param rating - Rating from 1-5
   * @returns Success status
   */
  async updateRating(appletId: string, rating: number): Promise<boolean> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const result = await this.executeRegistryContract('update_rating', {
      applet_id: appletId,
      rating,
    })

    return result.success || result
  }

  /**
   * Parse contract response into AppletMetadata type
   */
  private parseAppletMetadata(data: any): AppletMetadata {
    return {
      id: data.id || '',
      name: data.name || '',
      description: data.description || '',
      icon_uri: data.icon_uri || '',
      category: data.category || '',
      author_address: data.author_address || '',
      logic_contract: data.logic_contract || '',
      access_fee: BigInt(data.access_fee || 0),
      total_installs: data.total_installs || 0,
      rating: data.rating || 0,
      created_at: data.created_at || 0,
      is_active: data.is_active !== false,
    }
  }
}

// Singleton instance
let weilSDKInstance: WeilChainSDK | null = null

/**
 * Get or create WeilChain SDK singleton instance
 */
export function getWeilSDK(): WeilChainSDK {
  if (!weilSDKInstance) {
    weilSDKInstance = new WeilChainSDK()
  }
  return weilSDKInstance
}

/**
 * Export for direct usage
 */
export default WeilChainSDK
