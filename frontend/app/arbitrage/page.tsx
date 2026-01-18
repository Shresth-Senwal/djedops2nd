'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Clock, DollarSign, Activity, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDexPrice } from '@/lib/hooks/useDexPrice';

interface ArbitrageOpportunity {
  id: string;
  timestamp: Date;
  signal: 'MINT DJED' | 'REDEEM DJED' | 'NO CLEAR EDGE';
  dexPrice: number;
  protocolPrice: number;
  spread: number;
  spreadPercent: number;
  potentialProfit: number;
  liquidity: number;
  status: 'detected' | 'expired';
  source: string;
}

/**
 * Calculate realistic net profit for arbitrage opportunity
 * Accounts for DEX fees, slippage, and gas costs
 * 
 * @param dexPrice - Current DEX market price (USD per DJED)
 * @param protocolPrice - Protocol mint/redeem price (USD per DJED)
 * @param spread - Price difference (dexPrice - protocolPrice)
 * @param tradeAmount - Trade size in USD (default from env or $1000)
 * @returns Net profit after all fees and costs
 */
function calculateNetProfit(
  dexPrice: number,
  protocolPrice: number,
  spread: number,
  tradeAmount?: number
): number {
  // Fee constants from environment variables
  const DEX_FEE_PCT = parseFloat(process.env.NEXT_PUBLIC_DEX_FEE_PCT || '0.003');
  const SLIPPAGE_PCT = parseFloat(process.env.NEXT_PUBLIC_SLIPPAGE_PCT || '0.005');
  const GAS_COST_USD = parseFloat(process.env.NEXT_PUBLIC_GAS_COST_USD || '0.50');
  const DEFAULT_TRADE_AMOUNT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TRADE_AMOUNT || '1000');
  
  const amount = tradeAmount ?? DEFAULT_TRADE_AMOUNT;
  
  // Calculate tokens that can be bought/sold on DEX
  const tokensTraded = amount / dexPrice;
  
  // Gross profit: profit per token × number of tokens
  const grossProfit = tokensTraded * Math.abs(spread);
  
  // Calculate all costs
  const dexFee = amount * DEX_FEE_PCT;
  const slippageCost = amount * SLIPPAGE_PCT;
  const totalCosts = dexFee + slippageCost + GAS_COST_USD;
  
  // Net profit (never show negative)
  const netProfit = Math.max(0, grossProfit - totalCosts);
  
  return netProfit;
}

export default function ArbitragePage() {
  const router = useRouter();
  const [opportunityHistory, setOpportunityHistory] = useState<ArbitrageOpportunity[]>([]);
  const [filter, setFilter] = useState<'all' | 'detected' | 'expired'>('all');
  
  // Fetch live DEX data
  const { dexPrice, protocolPrice, spread, spreadPercent, signal, liquidity, source } = useDexPrice();

  useEffect(() => {
    // Only create opportunity if signal exists and spread is significant
    if (signal !== 'NO CLEAR EDGE' && Math.abs(spreadPercent) >= 0.5) {
      const newOpportunity: ArbitrageOpportunity = {
        id: `opp-${Date.now()}`,
        timestamp: new Date(),
        signal: signal as 'MINT DJED' | 'REDEEM DJED',
        dexPrice: dexPrice,
        protocolPrice: protocolPrice,
        spread: spread,
        spreadPercent: spreadPercent,
        potentialProfit: calculateNetProfit(dexPrice, protocolPrice, spread),
        liquidity: liquidity,
        status: 'detected',
        source: source,
      };

      // Add to history if it's a new unique opportunity (check if price/spread changed significantly)
      setOpportunityHistory(prev => {
        const lastOpp = prev[0];
        const isSignificantChange = !lastOpp || 
          Math.abs(lastOpp.spreadPercent - spreadPercent) > 0.1 || // Spread changed by >0.1%
          (Date.now() - lastOpp.timestamp.getTime()) > 60000; // Or 1 minute passed
        
        if (isSignificantChange) {
          // Keep only last 20 opportunities
          const newHistory = [newOpportunity, ...prev].slice(0, 20);
          
          // Mark old opportunities as expired if they're >5 minutes old
          return newHistory.map(opp => ({
            ...opp,
            status: (Date.now() - opp.timestamp.getTime() > 300000 && opp.status === 'detected') 
              ? 'expired' as const 
              : opp.status
          }));
        }
        
        // Update the current opportunity with latest data
        return [newOpportunity, ...prev.slice(1)];
      });
    } else {
      // Mark all detected opportunities as expired if no signal
      setOpportunityHistory(prev => 
        prev.map(opp => ({
          ...opp,
          status: opp.status === 'detected' ? 'expired' as const : opp.status
        }))
      );
    }
  }, [dexPrice, protocolPrice, spread, spreadPercent, signal, liquidity, source]);

  const filteredOpportunities = filter === 'all' 
    ? opportunityHistory 
    : opportunityHistory.filter(opp => opp.status === filter);

  const stats = {
    total: opportunityHistory.length,
    detected: opportunityHistory.filter(o => o.status === 'detected').length,
    expired: opportunityHistory.filter(o => o.status === 'expired').length,
    totalProfit: opportunityHistory
      .filter(o => o.status === 'detected')
      .reduce((sum, o) => sum + o.potentialProfit, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected': return 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30';
      case 'expired': return 'text-[#888888] bg-[#888888]/10 border-[#888888]/30';
      default: return 'text-white bg-white/10 border-white/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'detected': return <Activity className="w-4 h-4" />;
      case 'executed': return <CheckCircle2 className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Handle execute button - creates pre-configured arbitrage workflow
  const handleExecute = (opp: ArbitrageOpportunity) => {
    const workflowConfig = {
      type: 'arbitrage',
      signal: opp.signal,
      dexPrice: opp.dexPrice,
      protocolPrice: opp.protocolPrice,
      spread: opp.spreadPercent,
      liquidity: opp.liquidity,
      expectedProfit: opp.potentialProfit,
      autoExecute: true, // Flag to auto-load the workflow
    };
    
    router.push(`/workflows?autoConfig=${encodeURIComponent(JSON.stringify(workflowConfig))}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#888888] hover:text-[#39FF14] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-mono text-sm">Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-mono font-bold text-white">
                  ARBITRAGE OPPORTUNITIES
                </h1>
                <p className="text-[#888888] text-sm font-mono mt-1">
                  Recent signals and transaction history
                </p>
              </div>
            </div>
            
            <Link
              href="/workflows"
              className="flex items-center gap-2 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-mono font-bold text-sm uppercase px-4 py-2 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 p-4"
          >
            <p className="text-[#888888] text-xs font-mono uppercase mb-2">Total Signals</p>
            <p className="text-white text-3xl font-mono font-bold">{stats.total}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#39FF14]/5 border border-[#39FF14]/30 p-4"
          >
            <p className="text-[#888888] text-xs font-mono uppercase mb-2">Active Now</p>
            <p className="text-[#39FF14] text-3xl font-mono font-bold">{stats.detected}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#888888]/5 border border-[#888888]/30 p-4"
          >
            <p className="text-[#888888] text-xs font-mono uppercase mb-2">Expired</p>
            <p className="text-[#888888] text-3xl font-mono font-bold">{stats.expired}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#39FF14]/5 border border-[#39FF14]/30 p-4"
          >
            <p className="text-[#888888] text-xs font-mono uppercase mb-2">Total Profit</p>
            <p className="text-[#39FF14] text-3xl font-mono font-bold">${stats.totalProfit.toFixed(2)}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'detected', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`
                px-4 py-2 font-mono text-sm uppercase transition-all
                ${filter === status 
                  ? 'bg-[#39FF14] text-black' 
                  : 'bg-white/5 text-[#888888] hover:bg-white/10 hover:text-white border border-white/10'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {filteredOpportunities.length === 0 ? (
            <div className="bg-white/5 border border-white/10 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-[#888888] mx-auto mb-4" />
              <p className="text-[#888888] font-mono">No opportunities found</p>
            </div>
          ) : (
            filteredOpportunities.map((opp, index) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 hover:border-[#39FF14]/40 p-6 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Signal & Time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`
                        inline-flex items-center gap-2 px-3 py-1 border font-mono text-xs uppercase
                        ${opp.signal === 'MINT DJED' ? 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}
                      `}>
                        <TrendingUp className="w-3 h-3" />
                        {opp.signal}
                      </span>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 border font-mono text-xs uppercase ${getStatusColor(opp.status)}`}>
                        {getStatusIcon(opp.status)}
                        {opp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#888888] text-sm font-mono">
                      <Clock className="w-4 h-4" />
                      <span>{opp.timestamp.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Middle: Price Data */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-[#888888] text-xs font-mono uppercase mb-1">DEX Price</p>
                      <p className="text-white text-lg font-mono font-bold">${opp.dexPrice.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[#888888] text-xs font-mono uppercase mb-1">Protocol</p>
                      <p className="text-white text-lg font-mono font-bold">${opp.protocolPrice.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[#888888] text-xs font-mono uppercase mb-1">Spread</p>
                      <p className="text-[#39FF14] text-lg font-mono font-bold">{opp.spreadPercent.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[#888888] text-xs font-mono uppercase mb-1">Est. Profit</p>
                      <p className="text-[#39FF14] text-lg font-mono font-bold">${opp.potentialProfit.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {opp.status === 'detected' && (
                      <button
                        onClick={() => handleExecute(opp)}
                        className="flex items-center gap-2 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-mono font-bold text-xs uppercase px-4 py-2 transition-colors whitespace-nowrap"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Execute
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#888888]" />
                      <span className="text-[#888888]">Liquidity:</span>
                      <span className="text-white">${(opp.liquidity / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#888888]" />
                      <span className="text-[#888888]">Trade Amount:</span>
                      <span className="text-white">$1,000</span>
                    </div>
                    {opp.status === 'detected' && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#39FF14]" />
                        <span className="text-[#39FF14]">Ready to execute</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* What You Can Do */}
        <div className="mt-12 bg-white/5 border border-white/10 p-8">
          <h2 className="text-xl font-mono font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#39FF14]" />
            What You Can Do With These Opportunities
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-[#39FF14] font-mono font-bold mb-2">1. MANUAL EXECUTION</h3>
              <p className="text-[#888888] text-sm font-mono mb-2">
                Click "Execute" on active opportunities to create a workflow and execute the arbitrage manually through the platform.
              </p>
              <ul className="text-[#888888] text-xs font-mono space-y-1 ml-4">
                <li>• Review signal and spread</li>
                <li>• Adjust trade parameters</li>
                <li>• Execute when ready</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-[#39FF14] font-mono font-bold mb-2">2. AUTOMATED WORKFLOWS</h3>
              <p className="text-[#888888] text-sm font-mono mb-2">
                Create automated workflows that monitor and execute arbitrage opportunities 24/7 without manual intervention.
              </p>
              <ul className="text-[#888888] text-xs font-mono space-y-1 ml-4">
                <li>• Set profit thresholds</li>
                <li>• Configure MEV protection</li>
                <li>• Auto-execute when profitable</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-[#39FF14] font-mono font-bold mb-2">3. HISTORICAL ANALYSIS</h3>
              <p className="text-[#888888] text-sm font-mono mb-2">
                Study past opportunities to identify patterns, optimal execution times, and profitability trends.
              </p>
              <ul className="text-[#888888] text-xs font-mono space-y-1 ml-4">
                <li>• Track success rates</li>
                <li>• Analyze timing patterns</li>
                <li>• Optimize strategies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
