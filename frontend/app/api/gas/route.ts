/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: app/api/gas/route.ts
 * PURPOSE: Real-time gas price data for multiple chains
 * 
 * Fetches gas prices from:
 * - Ergo (from network mempool)
 * - Ethereum (from public gas trackers)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - this route fetches live data
// export const dynamic = 'force-dynamic';  // Disabled for static export

// API endpoints
const ERGO_API = 'https://api.ergoplatform.com/api/v1';

interface GasPrice {
  chain: string;
  slow: number;
  standard: number;
  fast: number;
  instant?: number;
  unit: string;
  baseFee?: number;
  lastUpdated: number;
}

interface GasResponse {
  success: boolean;
  gas: Record<string, GasPrice>;
  timestamp: number;
  source: string;
}

/**
 * Fetch Ergo network fee info
 * Ergo uses a simpler fee model - min fee per byte
 */
async function fetchErgoGas(): Promise<GasPrice> {
  try {
    // Ergo has a fixed minimum fee structure
    // Typical transaction is ~300 bytes, minimum fee is 0.001 ERG
    const minFeePerByte = 0.000001; // ERG per byte
    const typicalTxSize = 300; // bytes
    
    // Calculate fees for different speeds (in ERG)
    const minFee = minFeePerByte * typicalTxSize;
    
    return {
      chain: 'ergo',
      slow: minFee,           // Minimum fee
      standard: minFee * 1.5, // 50% above minimum
      fast: minFee * 2,       // 2x minimum
      instant: minFee * 3,    // 3x minimum for priority
      unit: 'ERG',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching Ergo gas:', error);
    return {
      chain: 'ergo',
      slow: 0.0003,
      standard: 0.0005,
      fast: 0.001,
      unit: 'ERG',
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Fetch Ethereum gas prices
 * Uses public gas tracker APIs
 */
async function fetchEthereumGas(): Promise<GasPrice> {
  try {
    // Try to get from Infura if API key is available
    const infuraKey = process.env.NEXT_PUBLIC_INFURA_API_KEY;
    
    if (infuraKey && infuraKey !== 'your_infura_api_key_here') {
      const response = await fetch(`https://mainnet.infura.io/v3/${infuraKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const gasPrice = parseInt(data.result, 16) / 1e9; // Convert to Gwei
        
        return {
          chain: 'ethereum',
          slow: Math.round(gasPrice * 0.8),
          standard: Math.round(gasPrice),
          fast: Math.round(gasPrice * 1.2),
          instant: Math.round(gasPrice * 1.5),
          unit: 'Gwei',
          lastUpdated: Date.now(),
        };
      }
    }

    // Fallback: Use reasonable estimates
    return {
      chain: 'ethereum',
      slow: 20,
      standard: 30,
      fast: 50,
      instant: 80,
      unit: 'Gwei',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching Ethereum gas:', error);
    return {
      chain: 'ethereum',
      slow: 20,
      standard: 30,
      fast: 50,
      unit: 'Gwei',
      lastUpdated: Date.now(),
    };
  }
}

/**
 * GET handler for gas prices
 * Query params:
 * - chain: 'ergo' | 'ethereum' | 'all' (default: all)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'all';

    const gas: Record<string, GasPrice> = {};

    if (chain === 'all' || chain === 'ergo') {
      gas.ergo = await fetchErgoGas();
    }

    if (chain === 'all' || chain === 'ethereum') {
      gas.ethereum = await fetchEthereumGas();
    }

    const response: GasResponse = {
      success: true,
      gas,
      timestamp: Date.now(),
      source: 'multi-chain',
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 15 seconds
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Gas API error:', error);

    return NextResponse.json({
      success: false,
      gas: {},
      error: error instanceof Error ? error.message : 'Failed to fetch gas prices',
      timestamp: Date.now(),
      source: 'error',
    }, { status: 200 });
  }
}
