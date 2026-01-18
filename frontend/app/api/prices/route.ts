/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: app/api/prices/route.ts
 * PURPOSE: Multi-asset price feeds from CoinGecko
 * 
 * Fetches real-time prices for multiple cryptocurrencies:
 * - ERG (Ergo)
 * - ETH (Ethereum)
 * - BTC (Bitcoin)
 * - WBTC (Wrapped Bitcoin)
 * - And more as needed
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - this route fetches live data
// export const dynamic = 'force-dynamic';  // Disabled for static export

// CoinGecko API (free tier - no key required for basic usage)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Token ID mapping for CoinGecko
const TOKEN_IDS: Record<string, string> = {
  ERG: 'ergo',
  ETH: 'ethereum',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'weth',
  MATIC: 'matic-network',
  SOL: 'solana',
  ADA: 'cardano',
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: number;
}

interface PricesResponse {
  success: boolean;
  prices: Record<string, PriceData>;
  timestamp: number;
  source: string;
}

/**
 * Fetch prices from CoinGecko API
 */
async function fetchPricesFromCoinGecko(symbols: string[]): Promise<Record<string, PriceData>> {
  const coinIds = symbols
    .map(s => TOKEN_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(',');

  if (!coinIds) {
    throw new Error('No valid token symbols provided');
  }

  const url = `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      // Add API key if provided in env
      ...(process.env.NEXT_PUBLIC_COINGECKO_API_KEY && {
        'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
      }),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    // Check for rate limiting
    if (response.status === 429) {
      throw new Error('Rate limited by CoinGecko. Please wait and try again.');
    }
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  const prices: Record<string, PriceData> = {};

  // Map CoinGecko response to our format
  for (const symbol of symbols) {
    const coinId = TOKEN_IDS[symbol.toUpperCase()];
    if (coinId && data[coinId]) {
      const coinData = data[coinId];
      prices[symbol.toUpperCase()] = {
        symbol: symbol.toUpperCase(),
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
        marketCap: coinData.usd_market_cap || 0,
        volume24h: coinData.usd_24h_vol || 0,
        lastUpdated: (coinData.last_updated_at || Math.floor(Date.now() / 1000)) * 1000,
      };
    }
  }

  return prices;
}

/**
 * GET handler - fetch prices for requested symbols
 * Query params:
 * - symbols: comma-separated list of token symbols (e.g., "ERG,ETH,BTC")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    
    // Default symbols if none provided
    const symbols = symbolsParam 
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
      : ['ERG', 'ETH', 'BTC', 'USDC'];

    const prices = await fetchPricesFromCoinGecko(symbols);

    const response: PricesResponse = {
      success: true,
      prices,
      timestamp: Date.now(),
      source: 'coingecko',
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 30 seconds to respect rate limits
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Prices API error:', error);

    // Return error - no fallback prices
    return NextResponse.json({
      success: false,
      prices: {},
      error: error instanceof Error ? error.message : 'Failed to fetch real prices. No fallback data available.',
      timestamp: Date.now(),
    }, { status: 502 }); // Return 502 to indicate API failure
  }
}
