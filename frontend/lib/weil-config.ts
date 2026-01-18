/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/weil-config.ts
 * PURPOSE: WeilChain contract addresses and network configuration
 * 
 * This file centralizes all blockchain configuration for the DjedOps DApp.
 * Contract addresses must be updated with real deployed addresses before
 * production use. Current placeholders will cause transactions to fail
 * if they are invalid addresses.
 * 
 * USAGE:
 * ```typescript
 * import { WEILCHAIN_CONFIG } from '@/lib/weil-config';
 * const receipt = await deployWorkflowOnWeil(payload, WEILCHAIN_CONFIG);
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * WeilChain network and contract configuration
 * 
 * NOTE: Replace placeholder addresses with real deployed contract addresses
 * before production deployment. Invalid addresses will cause tx failures.
 */
export const WEILCHAIN_CONFIG = {
  /**
   * Network Configuration
   * UPDATED: Using Weilliptic Testnet for hackathon
   */
  chainId: 'weilliptic-testnet-1',
  rpcUrl: process.env.NEXT_PUBLIC_WEIL_RPC_URL || 'https://testnet-rpc.weilliptic.com',
  explorerUrl: process.env.NEXT_PUBLIC_WEIL_EXPLORER_URL || 'https://testnet-explorer.weilliptic.com',
  
  /**
   * Core Protocol Contract Addresses
   * 
   * DjedCoordinator: Deploys and manages workflow applets
   * TeleportGateway: Handles cross-chain asset bridging
   */
  coordinatorContractAddress: process.env.NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS || 'weil1coordinator00000000000000000000000',
  teleportGatewayContractAddress: process.env.NEXT_PUBLIC_TELEPORT_GATEWAY_ADDRESS || 'weil1teleport000000000000000000000000',
  
  /**
   * Contract Method Names
   * Change these if the deployed contracts use different method names
   */
  deployMethod: 'deploy_workflow',
  bridgeMethod: 'bridge_asset',
  
  /**
   * Transaction Configuration
   */
  defaultGasLimit: 500000, // 500k gas units
  gasPrice: 1, // 1 WEIL per gas unit
  confirmationBlocks: 3, // Wait for 3 block confirmations
} as const;

/**
 * Type-safe configuration object
 */
export type WeilChainConfig = typeof WEILCHAIN_CONFIG;
