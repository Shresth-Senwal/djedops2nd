/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: app/api/routing/route.ts  
 * PURPOSE: DEX routing and slippage data from Paraswap
 * 
 * Fetches optimal swap routes and slippage estimates for trades
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - this route fetches live data
// export const dynamic = 'force-dynamic';  // Disabled for static export

// Paraswap API (free, no key required)
const PARASWAP_API = process.env.NEXT_PUBLIC_PARASWAP_API_URL || 'https://apiv5.paraswap.io';

// Common token addresses on Ethereum mainnet
const TOKEN_ADDRESSES: Record<string, string> = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EesD1cC71C7B69cB',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
};

interface SwapRoute {
  protocol: string;
  srcAmount: string;
  destAmount: string;
  gasCost: number;
  slippage: number;
  path: string[];
}

interface RoutingResponse {
  success: boolean;
  routes: SwapRoute[];
  bestRoute: SwapRoute | null;
  priceImpact: number;
  timestamp: number;
  source: string;
}

/**
 * Fetch swap quote from Paraswap
 */
async function fetchParaswapQuote(
  srcToken: string,
  destToken: string,
  amount: string,
  chainId: number = 1
): Promise<any> {
  const srcAddress = TOKEN_ADDRESSES[srcToken.toUpperCase()] || srcToken;
  const destAddress = TOKEN_ADDRESSES[destToken.toUpperCase()] || destToken;

  const url = `${PARASWAP_API}/prices?srcToken=${srcAddress}&destToken=${destAddress}&amount=${amount}&srcDecimals=18&destDecimals=18&side=SELL&network=${chainId}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paraswap API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Calculate slippage from price impact
 */
function calculateSlippage(priceRoute: any): number {
  if (!priceRoute || !priceRoute.srcAmount || !priceRoute.destAmount) {
    return 0;
  }
  
  // Estimate slippage from price impact data if available
  const srcUSD = parseFloat(priceRoute.srcUSD || '0');
  const destUSD = parseFloat(priceRoute.destUSD || '0');
  
  if (srcUSD > 0 && destUSD > 0) {
    return Math.abs((srcUSD - destUSD) / srcUSD * 100);
  }
  
  return 0.1; // Default 0.1% if can't calculate
}

/**
 * GET handler for routing data
 * Query params:
 * - srcToken: source token symbol or address
 * - destToken: destination token symbol or address
 * - amount: amount in wei (default: 1 ETH = 1e18)
 * - chainId: chain ID (default: 1 for Ethereum)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const srcToken = searchParams.get('srcToken') || 'ETH';
    const destToken = searchParams.get('destToken') || 'USDC';
    const amount = searchParams.get('amount') || '1000000000000000000'; // 1 token in wei
    const chainId = parseInt(searchParams.get('chainId') || '1');

    const quoteData = await fetchParaswapQuote(srcToken, destToken, amount, chainId);

    // Extract routes from Paraswap response
    const routes: SwapRoute[] = [];
    
    if (quoteData.priceRoute) {
      const priceRoute = quoteData.priceRoute;
      
      // Main route
      routes.push({
        protocol: priceRoute.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.[0]?.exchange || 'Paraswap',
        srcAmount: priceRoute.srcAmount,
        destAmount: priceRoute.destAmount,
        gasCost: parseInt(priceRoute.gasCost || '0'),
        slippage: calculateSlippage(priceRoute),
        path: [srcToken, destToken],
      });
    }

    const response: RoutingResponse = {
      success: true,
      routes,
      bestRoute: routes[0] || null,
      priceImpact: calculateSlippage(quoteData.priceRoute),
      timestamp: Date.now(),
      source: 'paraswap',
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
      },
    });
  } catch (error) {
    console.error('Routing API error:', error);

    // Return mock routes on error
    return NextResponse.json({
      success: false,
      routes: [
        { protocol: 'Uniswap V3', srcAmount: '1000000000000000000', destAmount: '3200000000', gasCost: 150000, slippage: 0.1, path: ['ETH', 'USDC'] },
        { protocol: '1inch', srcAmount: '1000000000000000000', destAmount: '3195000000', gasCost: 180000, slippage: 0.15, path: ['ETH', 'WETH', 'USDC'] },
      ],
      bestRoute: { protocol: 'Uniswap V3', srcAmount: '1000000000000000000', destAmount: '3200000000', gasCost: 150000, slippage: 0.1, path: ['ETH', 'USDC'] },
      priceImpact: 0.1,
      error: error instanceof Error ? error.message : 'Failed to fetch routing data',
      timestamp: Date.now(),
      source: 'fallback',
    }, { status: 200 });
  }
}
