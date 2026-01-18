/**
 * MEV Protection Selector Component
 * 
 * Provides users with MEV (Maximal Extractable Value) protection options to prevent
 * front-running and sandwich attacks during workflow execution. Calculates and displays
 * cost-benefit analysis for each protection strategy.
 * 
 * Features:
 * - Four protection strategies with varying levels and costs
 * - Real-time net benefit calculations showing savings vs fees
 * - Visual comparison table for informed decision-making
 * - Strategy persistence across sessions
 * - Integration with deployment receipts for auditability
 * 
 * MEV Protection Strategies:
 * 1. Private Mempool: 100% protection, 0.05% fee - Highest security
 * 2. Batch Auction: 87% protection, 0.02% fee - Good balance (RECOMMENDED)
 * 3. Intent-Based: 75% protection, 0.01% fee - Lightweight protection
 * 4. None: 0% protection, 0% fee - No protection (risky for large trades)
 * 
 * Calculations:
 * - Baseline MEV Loss: workflowValue × 0.32% (industry average)
 * - Protection Fee: workflowValue × strategy.feePct
 * - Savings: baselineMEVLoss × strategy.saveFactor
 * - Net Benefit: savings - protectionFee
 * 
 * Integration:
 * - Embeds in WorkflowBuilder deploy modal
 * - Selected strategy included in deployment receipt
 * - Strategy persisted in localStorage for user preference
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * MEV Protection Strategy interface
 */
export interface MEVProtectionStrategy {
  id: string;
  name: string;
  description: string;
  saveFactor: number; // 0-1, percentage of MEV loss avoided
  feePct: number; // Fee as percentage (0.05 = 0.05%)
  protectionLevel: 'MAXIMUM' | 'HIGH' | 'MODERATE' | 'NONE';
  speed: 'SLOW' | 'STANDARD' | 'FAST';
  isRecommended?: boolean;
}

/**
 * MEV Protection Selector Props
 */
interface MEVProtectionSelectorProps {
  workflowValueUSD?: number;
  onStrategySelect?: (strategy: MEVProtectionStrategy) => void;
  showTitle?: boolean;
}

/**
 * Constants for MEV calculations
 */
const BASELINE_MEV_LOSS_PCT = 0.32; // 0.32% baseline MEV loss
const DEFAULT_WORKFLOW_VALUE_USD = 1_000_000; // $1M default workflow value

/**
 * MEV Protection Strategies
 */
const MEV_STRATEGIES: MEVProtectionStrategy[] = [
  {
    id: 'private_mempool',
    name: 'Private Mempool',
    description: 'Maximum protection via private transaction relay. Transactions never hit public mempool.',
    saveFactor: 1.0, // 100% protection
    feePct: 0.05,
    protectionLevel: 'MAXIMUM',
    speed: 'SLOW',
    isRecommended: true,
  },
  {
    id: 'batch_auction',
    name: 'Batch Auction',
    description: 'Group transactions in batches, preventing frontrunning within batch windows.',
    saveFactor: 0.87, // 87% protection
    feePct: 0.02,
    protectionLevel: 'HIGH',
    speed: 'STANDARD',
  },
  {
    id: 'intent_based',
    name: 'Intent-Based',
    description: 'Submit intent instead of transaction, solvers compete to fill at best price.',
    saveFactor: 0.75, // 75% protection
    feePct: 0.01,
    protectionLevel: 'MODERATE',
    speed: 'FAST',
  },
  {
    id: 'none',
    name: 'No Protection',
    description: 'Standard public mempool submission. Vulnerable to MEV extraction.',
    saveFactor: 0, // 0% protection
    feePct: 0,
    protectionLevel: 'NONE',
    speed: 'FAST',
  },
];

/**
 * Calculate MEV metrics for a strategy
 */
function calculateMEVMetrics(strategy: MEVProtectionStrategy, workflowValueUSD: number) {
  const baselineMEVLossUSD = workflowValueUSD * (BASELINE_MEV_LOSS_PCT / 100);
  const protectionFeeUSD = workflowValueUSD * (strategy.feePct / 100);
  const savingsUSD = baselineMEVLossUSD * strategy.saveFactor;
  const netBenefitUSD = savingsUSD - protectionFeeUSD;

  return {
    baselineMEVLossUSD,
    protectionFeeUSD,
    savingsUSD,
    netBenefitUSD,
  };
}

/**
 * Get protection level color
 */
function getProtectionColor(level: MEVProtectionStrategy['protectionLevel']): string {
  switch (level) {
    case 'MAXIMUM':
      return '#39FF14';
    case 'HIGH':
      return '#00D4FF';
    case 'MODERATE':
      return '#FFD700';
    case 'NONE':
      return '#FF4444';
  }
}

/**
 * Get speed color
 */
function getSpeedColor(speed: MEVProtectionStrategy['speed']): string {
  switch (speed) {
    case 'FAST':
      return '#39FF14';
    case 'STANDARD':
      return '#FFD700';
    case 'SLOW':
      return '#FF9500';
  }
}

/**
 * MEV Protection Selector Component
 */
export function MEVProtectionSelector({
  workflowValueUSD = DEFAULT_WORKFLOW_VALUE_USD,
  onStrategySelect,
  showTitle = true,
}: MEVProtectionSelectorProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('private_mempool');

  // Load saved strategy preference
  useEffect(() => {
    const savedStrategyId = localStorage.getItem('workflow_mev_strategy');
    if (savedStrategyId && MEV_STRATEGIES.find(s => s.id === savedStrategyId)) {
      setSelectedStrategyId(savedStrategyId);
    } else {
      // Default to recommended strategy
      const recommended = MEV_STRATEGIES.find(s => s.isRecommended);
      if (recommended) {
        setSelectedStrategyId(recommended.id);
      }
    }
  }, []);

  // Handle strategy selection
  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    localStorage.setItem('workflow_mev_strategy', strategyId);

    const strategy = MEV_STRATEGIES.find(s => s.id === strategyId);
    if (strategy && onStrategySelect) {
      onStrategySelect(strategy);
    }
  };

  const selectedStrategy = MEV_STRATEGIES.find(s => s.id === selectedStrategyId);
  const baselineMEVLoss = workflowValueUSD * (BASELINE_MEV_LOSS_PCT / 100);

  return (
    <div className="border-2 border-[#FF9500] bg-[#FF9500]/5 p-6">
      {showTitle && (
        <div className="mb-6">
          <h3 className="text-[#FF9500] font-mono text-lg font-bold mb-2 flex items-center gap-2">
            <span>🛡️</span>
            <span>MEV PROTECTION</span>
          </h3>
          <p className="text-neutral-400 font-mono text-xs mb-3">
            Prevent front-running and sandwich attacks with advanced protection strategies
          </p>
          <div className="bg-red-500/10 border border-red-500/30 p-3">
            <div className="text-red-400 font-mono text-xs">
              ⚠️ Without protection, estimated MEV loss: <span className="font-bold">${baselineMEVLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({BASELINE_MEV_LOSS_PCT}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Value Display */}
      <div className="mb-6 p-4 border border-neutral-700 bg-black">
        <div className="flex items-center justify-between font-mono">
          <div>
            <div className="text-xs text-neutral-500 mb-1">WORKFLOW VALUE</div>
            <div className="text-white font-bold text-lg">
              ${workflowValueUSD.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">BASELINE MEV RISK</div>
            <div className="text-red-500 font-bold text-lg">
              ${baselineMEVLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Strategy Summary */}
      {selectedStrategy && (
        <div className="mb-6 p-4 border-2 border-[#39FF14] bg-[#39FF14]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#39FF14] font-mono text-sm font-bold">
              ✅ SELECTED PROTECTION
            </div>
            <div className="text-white font-mono text-xs">
              {selectedStrategy.name}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <div className="text-neutral-500 mb-1">Net Benefit:</div>
              <div className={`font-bold text-lg ${
                calculateMEVMetrics(selectedStrategy, workflowValueUSD).netBenefitUSD > 0
                  ? 'text-[#39FF14]'
                  : 'text-red-500'
              }`}>
                {calculateMEVMetrics(selectedStrategy, workflowValueUSD).netBenefitUSD > 0 ? '+' : ''}
                ${calculateMEVMetrics(selectedStrategy, workflowValueUSD).netBenefitUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Protection Level:</div>
              <div 
                className="font-bold text-lg"
                style={{ color: getProtectionColor(selectedStrategy.protectionLevel) }}
              >
                {selectedStrategy.protectionLevel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Selection Cards */}
      <div className="space-y-3 mb-6">
        {MEV_STRATEGIES.map((strategy) => {
          const metrics = calculateMEVMetrics(strategy, workflowValueUSD);
          const isSelected = selectedStrategyId === strategy.id;

          return (
            <div
              key={strategy.id}
              onClick={() => handleStrategySelect(strategy.id)}
              className={`border-2 p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#39FF14] bg-[#39FF14]/10'
                  : strategy.isRecommended
                  ? 'border-[#FFD700] bg-[#FFD700]/5 hover:border-[#FFD700]'
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {/* Strategy Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Radio Button */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-[#39FF14]' : 'border-neutral-600'
                  }`}>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-[#39FF14]" />
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                      {strategy.name}
                      {strategy.isRecommended && (
                        <span className="text-xs bg-[#FFD700] text-black px-2 py-0.5 rounded font-bold">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono mt-1">
                      {strategy.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy Metrics */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <div className="text-xs text-neutral-500 font-mono mb-1">SAVINGS</div>
                  <div className="text-[#39FF14] font-mono font-bold">
                    ${metrics.savingsUSD.toLocaleString(undefined, { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0 
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 font-mono mb-1">FEE</div>
                  <div className="text-red-500 font-mono font-bold">
                    ${metrics.protectionFeeUSD.toLocaleString(undefined, { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0 
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 font-mono mb-1">NET BENEFIT</div>
                  <div className={`font-mono font-bold ${
                    metrics.netBenefitUSD > 0 ? 'text-[#39FF14]' : 'text-red-500'
                  }`}>
                    {metrics.netBenefitUSD > 0 ? '+' : ''}${metrics.netBenefitUSD.toLocaleString(undefined, { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0 
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 font-mono mb-1">SPEED</div>
                  <div 
                    className="font-mono font-bold text-xs"
                    style={{ color: getSpeedColor(strategy.speed) }}
                  >
                    {strategy.speed}
                  </div>
                </div>
              </div>

              {/* Protection Level Badge */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs px-3 py-1 border font-mono font-bold"
                    style={{ 
                      borderColor: getProtectionColor(strategy.protectionLevel),
                      color: getProtectionColor(strategy.protectionLevel),
                      backgroundColor: `${getProtectionColor(strategy.protectionLevel)}15`
                    }}
                  >
                    {strategy.protectionLevel}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {(strategy.saveFactor * 100).toFixed(0)}% MEV avoided
                  </span>
                </div>
                {strategy.feePct > 0 && (
                  <div className="text-xs text-neutral-500 font-mono">
                    Fee: {strategy.feePct}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="border border-neutral-700 bg-black">
        <div className="border-b border-neutral-700 bg-neutral-900 p-3">
          <div className="text-sm font-mono text-neutral-400 font-bold">
            STRATEGY COMPARISON
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left p-3 text-neutral-500 font-bold">STRATEGY</th>
                <th className="text-right p-3 text-neutral-500 font-bold">SAVINGS</th>
                <th className="text-right p-3 text-neutral-500 font-bold">FEE</th>
                <th className="text-right p-3 text-neutral-500 font-bold">NET BENEFIT</th>
                <th className="text-center p-3 text-neutral-500 font-bold">SPEED</th>
                <th className="text-center p-3 text-neutral-500 font-bold">PROTECTION</th>
              </tr>
            </thead>
            <tbody>
              {MEV_STRATEGIES.map((strategy, idx) => {
                const metrics = calculateMEVMetrics(strategy, workflowValueUSD);
                return (
                  <tr 
                    key={strategy.id}
                    className={`${idx < MEV_STRATEGIES.length - 1 ? 'border-b border-neutral-800' : ''} ${
                      selectedStrategyId === strategy.id ? 'bg-[#39FF14]/10' : ''
                    }`}
                  >
                    <td className="p-3 text-white font-bold">{strategy.name}</td>
                    <td className="p-3 text-right text-[#39FF14]">
                      ${metrics.savingsUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right text-red-500">
                      ${metrics.protectionFeeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`p-3 text-right font-bold ${
                      metrics.netBenefitUSD > 0 ? 'text-[#39FF14]' : 'text-red-500'
                    }`}>
                      {metrics.netBenefitUSD > 0 ? '+' : ''}${metrics.netBenefitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-center">
                      <span 
                        className="text-xs px-2 py-1"
                        style={{ color: getSpeedColor(strategy.speed) }}
                      >
                        {strategy.speed}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span 
                        className="text-xs"
                        style={{ color: getProtectionColor(strategy.protectionLevel) }}
                      >
                        {strategy.protectionLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 border border-neutral-700 bg-neutral-900">
        <div className="text-xs text-neutral-400 font-mono space-y-1">
          <div>ℹ️ MEV protection strategy persisted for deployment</div>
          <div>💡 Net Benefit = MEV Savings - Protection Fee</div>
          <div>🎯 Baseline MEV loss calculated at {BASELINE_MEV_LOSS_PCT}% (industry average)</div>
          <div>⚡ Higher protection may result in slower execution times</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get currently selected MEV strategy from localStorage
 */
export function getSelectedMEVStrategy(): MEVProtectionStrategy | null {
  if (typeof window === 'undefined') return null;

  const savedStrategyId = localStorage.getItem('workflow_mev_strategy');
  if (!savedStrategyId) {
    // Return recommended strategy as default
    return MEV_STRATEGIES.find(s => s.isRecommended) || MEV_STRATEGIES[0];
  }

  return MEV_STRATEGIES.find(s => s.id === savedStrategyId) || null;
}
