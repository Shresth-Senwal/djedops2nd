'use client';

import { motion } from 'framer-motion';
import { useDexPrice } from '@/lib/hooks/useDexPrice';
import { TrendingUp, RefreshCw, Eye, History } from 'lucide-react';
import Link from 'next/link';

/**
 * MarketOpportunityCard - Real-time Arbitrage Detector
 * 
 * Displays live arbitrage opportunities by comparing:
 * - Protocol price: Djed mint/redeem rate (~$0.88)
 * - DEX price: Real-time SigUSD/ERG price from Spectrum Finance
 * 
 * Signals:
 * - MINT DJED (green): DEX trading above protocol → Mint cheap, sell high
 * - REDEEM DJED (red): DEX trading below protocol → Buy cheap, redeem at protocol rate
 * - NO CLEAR EDGE (gray): Spread < 0.5% threshold
 * 
 * Features:
 * - Real-time price updates every 15 seconds
 * - Live liquidity data from DEX pools
 * - One-click workflow creation for arbitrage execution
 * - Profit calculator based on current spread
 */
export function MarketOpportunityCard() {
  const { dexPrice, spread, spreadPercent, signal, isLoading, liquidity, source, protocolPrice } = useDexPrice();
  
  // Show loading state while fetching prices
  if (isLoading || !dexPrice || !protocolPrice) {
    return (
      <motion.div
        className="bg-black/40 border border-[#39FF14]/20 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#39FF14]/60 animate-spin" />
            <h3 className="text-lg font-bold text-[#39FF14]/60 font-mono">ARBITRAGE SCANNER</h3>
          </div>
        </div>
        <div className="text-sm text-gray-400 font-mono animate-pulse">
          Loading real-time market data...
        </div>
      </motion.div>
    );
  }
  
  const hasOpportunity = signal !== 'NO CLEAR EDGE';
  
  // Calculate potential profit on a $1000 trade
  const potentialProfit = Math.abs(spread) * 1000;

  // Signal styling
  const signalStyles = {
    'MINT DJED': {
      color: 'text-[#39FF14]',
      bgGlow: 'bg-[#39FF14]/10',
      borderColor: 'border-[#39FF14]/30',
      description: 'DEX price > Protocol → Mint cheap, sell high on DEX',
      action: 'Mint at $' + protocolPrice.toFixed(4) + ' → Sell at $' + dexPrice.toFixed(4),
    },
    'REDEEM DJED': {
      color: 'text-[#FF4444]',
      bgGlow: 'bg-[#FF4444]/10',
      borderColor: 'border-[#FF4444]/30',
      description: 'DEX price < Protocol → Buy cheap on DEX, redeem at protocol',
      action: 'Buy at $' + dexPrice.toFixed(4) + ' → Redeem at $' + protocolPrice.toFixed(4),
    },
    'NO CLEAR EDGE': {
      color: 'text-[#888888]',
      bgGlow: 'bg-[#888888]/5',
      borderColor: 'border-[#888888]/20',
      description: 'Spread below 0.5% threshold - No profitable arbitrage',
      action: 'Waiting for opportunity...',
    },
  };

  const style = signalStyles[signal];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-black/80 backdrop-blur-xl 
        border-2 ${style.borderColor} 
        ${style.bgGlow}
        p-6 sm:p-8 relative 
        transition-all duration-300
        hover:border-[#39FF14]/60
        shadow-xl
      `}
    >
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${hasOpportunity ? 'bg-[#39FF14]' : 'bg-[#888888]'} rounded-full animate-pulse`} aria-hidden="true"></div>
          <h3 className="text-[#39FF14] font-mono text-xs uppercase tracking-widest">
            LIVE ARBITRAGE DETECTOR
          </h3>
        </div>
        
        {/* Refresh indicator */}
        {isLoading && (
          <RefreshCw className="w-4 h-4 text-[#39FF14] animate-spin" />
        )}
      </div>

      {/* Price Comparison Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white/5 p-4 border border-white/10">
          <p className="text-[#888888] text-xs font-mono uppercase tracking-widest mb-2">
            DEX PRICE (LIVE)
          </p>
          <p className="text-white text-2xl sm:text-3xl font-mono font-bold">
            ${dexPrice.toFixed(4)}
          </p>
          {source !== 'demo' && (
            <p className="text-[#39FF14] text-xs font-mono mt-1">
              ✓ Spectrum Finance
            </p>
          )}
        </div>
        <div className="bg-white/5 p-4 border border-white/10">
          <p className="text-[#888888] text-xs font-mono uppercase tracking-widest mb-2">
            PROTOCOL RATE
          </p>
          <p className="text-white text-2xl sm:text-3xl font-mono font-bold">
            ${protocolPrice.toFixed(4)}
          </p>
          <p className="text-[#888888] text-xs font-mono mt-1">
            Mint/Redeem
          </p>
        </div>
      </div>

      {/* Spread & Liquidity */}
      <div className="mb-6 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#888888] text-xs font-mono uppercase tracking-widest">
            SPREAD
          </p>
          <p className={`text-xl font-mono font-bold ${style.color}`}>
            {spreadPercent >= 0 ? '+' : ''}{spreadPercent.toFixed(2)}%
          </p>
        </div>
        
        <p className="text-white text-lg font-mono mb-3">
          ${Math.abs(spread).toFixed(4)} per DJED
        </p>
        
        {liquidity > 0 && source !== 'demo' && (
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#888888]">DEX Liquidity:</span>
            <span className="text-[#39FF14]">
              ${(liquidity / 1000).toFixed(1)}K
            </span>
          </div>
        )}

        {/* Profit Estimate */}
        {hasOpportunity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 bg-[#39FF14]/10 border border-[#39FF14]/30 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#888888] text-xs font-mono uppercase">
                Est. Profit ($1000 trade):
              </span>
              <span className="text-[#39FF14] text-lg font-mono font-bold">
                +${potentialProfit.toFixed(2)}
              </span>
            </div>
            <p className="text-[#888888] text-xs font-mono mt-1">
              Before gas fees & slippage
            </p>
          </motion.div>
        )}
      </div>

      {/* Signal Display */}
      <div className="mb-6">
        <p className="text-[#888888] text-xs font-mono uppercase tracking-widest mb-3">
          SIGNAL STATUS
        </p>
        <motion.div
          className={`${style.bgGlow} border-2 ${style.borderColor} p-4`}
          animate={hasOpportunity ? {
            borderColor: ['rgba(57, 255, 20, 0.3)', 'rgba(57, 255, 20, 0.6)', 'rgba(57, 255, 20, 0.3)'],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <p className={`text-2xl sm:text-3xl font-mono font-black uppercase ${style.color} mb-2`}>
            {signal}
          </p>
          <p className="text-[#888888] text-sm font-mono mb-2">
            {style.description}
          </p>
          <div className="flex items-center gap-2 text-white text-xs font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>{style.action}</span>
          </div>
        </motion.div>
      </div>

      {/* Monitor Status */}
      <div className="bg-white/5 border border-[#888888]/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#39FF14]" />
            <p className="text-[#39FF14] text-sm font-mono font-bold uppercase">
              Live Monitoring Active
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isLoading ? (
              <RefreshCw className="w-3 h-3 text-[#39FF14] animate-spin" />
            ) : (
              <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
            )}
          </div>
        </div>
        <p className="text-[#888888] text-xs font-mono">
          {hasOpportunity 
            ? '✓ Profitable arbitrage opportunity detected' 
            : '🔍 Scanning DEX pools for arbitrage opportunities'
          }
        </p>
        <p className="text-[#888888] text-xs font-mono mt-1">
          Auto-refresh: Every 15 seconds
        </p>
      </div>

      {/* View History Button */}
      <Link
        href="/arbitrage"
        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#39FF14]/40 text-white hover:text-[#39FF14] font-mono font-bold text-sm uppercase tracking-wider py-3 px-4 transition-all duration-200"
      >
        <History className="w-4 h-4" />
        <span>View Recent Opportunities</span>
      </Link>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[#39FF14] animate-spin mx-auto mb-2" />
            <p className="text-[#39FF14] font-mono text-sm animate-pulse">
              FETCHING LIVE DEX DATA...
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
