'use client';

import useSWR from 'swr';
import { useAppStore } from '@/lib/store';

// Arbitrage thresholds (configurable constants)
export const MINT_THRESHOLD_PCT = 0.5;  // DEX at least 0.5% above protocol
export const REDEEM_THRESHOLD_PCT = -0.5;  // DEX at least 0.5% below protocol

// Demo/fallback DEX price
const DEMO_DEX_PRICE = 1.02;

interface DexPriceResponse {
  success: boolean;
  price: number;
  pair: string;
  liquidity: number;
  source: string;
  error?: string;
}

interface DjedPriceResponse {
  mintPrice: number;
  redeemPrice: number;
  peg: number;
  timestamp: number;
  source: string;
}

/**
 * Fetch live DEX price from Spectrum Finance API
 */
async function fetchDexPrice(): Promise<DexPriceResponse> {
  const response = await fetch('/api/dex', {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch DEX price: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Djed protocol price (mint/redeem rates)
 */
async function fetchDjedPrice(): Promise<DjedPriceResponse> {
  const response = await fetch('/api/djed?endpoint=djed/price', {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Djed price: ${response.status}`);
  }

  return response.json();
}

/**
 * Hook to fetch DEX price and calculate arbitrage opportunity
 * Fetches live price from Spectrum Finance DEX and Djed protocol
 */
export function useDexPrice() {
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  
  const { data: dexData, error: dexError } = useSWR<DexPriceResponse>(
    isDemoMode ? null : '/api/dex',
    fetchDexPrice,
    {
      refreshInterval: 15000, // 15 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      onError: (err) => {
        console.error('DEX price fetch error:', err);
      },
    }
  );

  const { data: djedData, error: djedError } = useSWR<DjedPriceResponse>(
    isDemoMode ? null : '/api/djed?endpoint=djed/price',
    fetchDjedPrice,
    {
      refreshInterval: 30000, // 30 seconds (protocol price changes less frequently)
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 20000,
      onError: (err) => {
        console.error('Djed price fetch error:', err);
      },
    }
  );

  // Determine effective DEX price
  let effectiveDexPrice: number;
  let liquidity = 0;
  let source = 'demo';

  if (isDemoMode) {
    effectiveDexPrice = DEMO_DEX_PRICE;
  } else if (dexData && dexData.success) {
    effectiveDexPrice = dexData.price;
    liquidity = dexData.liquidity;
    source = dexData.source;
  } else {
    // No real data available - return 0 to indicate no data
    effectiveDexPrice = 0;
  }

  // Determine protocol price (use mint price for arbitrage calculation)
  // Mint price = what protocol charges you to mint Djed
  let protocolPrice = 1.00; // Default to peg
  if (!isDemoMode && djedData) {
    protocolPrice = djedData.mintPrice;
  }

  // Calculate arbitrage metrics with safety guards
  const spread = (effectiveDexPrice || 0) - protocolPrice;
  
  // Safety: Guard against division by zero
  const spreadPercent = protocolPrice > 0 ? (spread / protocolPrice) * 100 : 0;

  // Determine signal based on thresholds
  let signal: 'MINT DJED' | 'REDEEM DJED' | 'NO CLEAR EDGE';
  if (spreadPercent >= MINT_THRESHOLD_PCT) {
    signal = 'MINT DJED';
  } else if (spreadPercent <= REDEEM_THRESHOLD_PCT) {
    signal = 'REDEEM DJED';
  } else {
    signal = 'NO CLEAR EDGE';
  }

  return {
    dexPrice: effectiveDexPrice,
    protocolPrice,
    spread,
    spreadPercent,
    signal,
    liquidity,
    source,
    isLoading: (!dexData && !isDemoMode && !dexError) || (!djedData && !isDemoMode && !djedError),
    isError: !!dexError || !!djedError,
  };
}
