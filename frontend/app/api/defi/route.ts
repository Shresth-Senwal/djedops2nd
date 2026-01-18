/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: app/api/defi/route.ts
 * PURPOSE: DeFi protocol data from DefiLlama
 * 
 * Fetches real-time DeFi data including:
 * - Protocol TVL (Total Value Locked)
 * - Yield/APY data for farming
 * - Pool information
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - this route fetches live data
// export const dynamic = 'force-dynamic';  // Disabled for static export

// DefiLlama API (free, no key required)
const DEFILLAMA_API = process.env.NEXT_PUBLIC_DEFILLAMA_API_URL || 'https://api.llama.fi';
const DEFILLAMA_YIELDS_API = 'https://yields.llama.fi';

interface Protocol {
  id: string;
  name: string;
  chain: string;
  tvl: number;
  change24h: number;
  category: string;
  logo?: string;
}

interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  rewardTokens: string[];
  underlyingTokens: string[];
  poolMeta?: string;
  ilRisk?: string;
}

interface DefiResponse {
  success: boolean;
  data: any;
  timestamp: number;
  source: string;
}

/**
 * Fetch top protocols by TVL
 */
async function fetchProtocols(): Promise<Protocol[]> {
  const response = await fetch(`${DEFILLAMA_API}/protocols`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`DefiLlama protocols error: ${response.status}`);
  }

  const data = await response.json();
  
  // Map to our format and take top 20
  return data
    .slice(0, 20)
    .map((p: any) => ({
      id: p.slug || p.name.toLowerCase(),
      name: p.name,
      chain: p.chain || 'Multi-chain',
      tvl: p.tvl || 0,
      change24h: p.change_1d || 0,
      category: p.category || 'DeFi',
      logo: p.logo,
    }));
}

/**
 * Fetch yield pools with highest APY
 */
async function fetchYieldPools(chain?: string): Promise<YieldPool[]> {
  const response = await fetch(`${DEFILLAMA_YIELDS_API}/pools`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`DefiLlama yields error: ${response.status}`);
  }

  const data = await response.json();
  
  let pools = data.data || [];
  
  // Filter by chain if specified
  if (chain) {
    pools = pools.filter((p: any) => 
      p.chain?.toLowerCase() === chain.toLowerCase()
    );
  }
  
  // Filter for stablecoin and popular pools, sort by APY
  return pools
    .filter((p: any) => p.tvlUsd > 100000 && p.apy > 0 && p.apy < 1000) // Reasonable filters
    .sort((a: any, b: any) => b.apy - a.apy)
    .slice(0, 50)
    .map((p: any) => ({
      pool: p.pool,
      chain: p.chain,
      project: p.project,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd,
      apyBase: p.apyBase || 0,
      apyReward: p.apyReward || 0,
      apy: p.apy,
      rewardTokens: p.rewardTokens || [],
      underlyingTokens: p.underlyingTokens || [],
      poolMeta: p.poolMeta,
      ilRisk: p.ilRisk,
    }));
}

/**
 * Fetch specific protocol TVL history
 */
async function fetchProtocolTvl(protocol: string): Promise<any> {
  const response = await fetch(`${DEFILLAMA_API}/protocol/${protocol}`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`DefiLlama protocol error: ${response.status}`);
  }

  return response.json();
}

/**
 * GET handler for DeFi data
 * Query params:
 * - type: 'protocols' | 'yields' | 'protocol-tvl'
 * - chain: filter by chain (optional)
 * - protocol: protocol slug for TVL history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'protocols';
    const chain = searchParams.get('chain') || undefined;
    const protocol = searchParams.get('protocol') || undefined;

    let data: any;

    switch (type) {
      case 'protocols':
        data = await fetchProtocols();
        break;
      case 'yields':
        data = await fetchYieldPools(chain);
        break;
      case 'protocol-tvl':
        if (!protocol) {
          return NextResponse.json({
            success: false,
            error: 'Protocol parameter required for protocol-tvl type',
          }, { status: 400 });
        }
        data = await fetchProtocolTvl(protocol);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown type: ${type}`,
        }, { status: 400 });
    }

    const response: DefiResponse = {
      success: true,
      data,
      timestamp: Date.now(),
      source: 'defillama',
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 60 seconds
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('DeFi API error:', error);

    return NextResponse.json({
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch DeFi data',
      timestamp: Date.now(),
      source: 'error',
    }, { status: 200 }); // Return 200 to not break UI
  }
}
