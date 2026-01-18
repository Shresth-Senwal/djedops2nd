/**
 * Liquidation Risk Tracker Component
 * 
 * Provides users with a daily-use dashboard for monitoring liquidation risk across DeFi positions.
 * Calculates and visualizes risk bands (SAFE/CAUTION/DANGER) based on collateral ratios and liquidation thresholds.
 * Integrates with Sentinel protocol status to enhance risk warnings during CRITICAL states.
 * 
 * Features:
 * - Real-time position monitoring with collateral ratio calculations
 * - Risk band classification with visual indicators
 * - Distance-to-liquidation visualizations
 * - Interactive actions (Add Collateral, Reduce Debt, Close Position)
 * - LocalStorage persistence for position adjustments
 * - Sentinel integration for enhanced risk alerting
 * 
 * Data Model:
 * - Positions stored in localStorage with fields: protocol, collateral/debt assets, values, ratios, prices
 * - Risk calculations: bufferPct = ((currentPrice - liquidationPrice) / currentPrice) * 100
 * - Risk bands: SAFE (>=150%), CAUTION (120-149.99%), DANGER (<120%)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeilChain } from '@/lib/context/WeilChainContext';
import useSWR from 'swr';

/**
 * Position data interface
 */
interface Position {
  id: string;
  protocol: string;
  collateralAsset: string;
  debtAsset: string;
  collateralValueUSD: number;
  debtValueUSD: number;
  collateralRatioPct: number;
  liquidationThresholdPct: number;
  liquidationPriceUSD: number;
  currentPriceUSD: number;
}

/**
 * Price data interface for API response
 */
interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

/**
 * Risk band type
 */
type RiskBand = 'SAFE' | 'CAUTION' | 'DANGER';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

/**
 * Calculate risk band based on collateral ratio
 */
function getRiskBand(collateralRatioPct: number): RiskBand {
  if (collateralRatioPct >= 150) return 'SAFE';
  if (collateralRatioPct >= 120) return 'CAUTION';
  return 'DANGER';
}

/**
 * Get risk band color
 */
function getRiskColor(band: RiskBand): string {
  switch (band) {
    case 'SAFE':
      return '#39FF14';
    case 'CAUTION':
      return '#FFD700';
    case 'DANGER':
      return '#FF4444';
  }
}

/**
 * Generate positions based on real price data
 * Creates sample DeFi positions with realistic ratios based on current market prices
 */
function generatePositionsFromPrices(prices: Record<string, PriceData>): Position[] {
  const ethPrice = prices?.ETH?.price;
  const btcPrice = prices?.BTC?.price;
  const wbtcPrice = prices?.WBTC?.price || btcPrice;
  
  // Don't generate positions without real prices
  if (!ethPrice || !btcPrice) {
    return [];
  }
  
  return [
    {
      id: 'pos_1',
      protocol: 'Aave-like',
      collateralAsset: 'ETH',
      debtAsset: 'USDC',
      collateralValueUSD: 5 * ethPrice,
      debtValueUSD: (5 * ethPrice) / 1.88,
      collateralRatioPct: 188.2,
      liquidationThresholdPct: 120,
      liquidationPriceUSD: ethPrice * 0.64,
      currentPriceUSD: ethPrice,
    },
    {
      id: 'pos_2',
      protocol: 'Maker-like',
      collateralAsset: 'ETH',
      debtAsset: 'DAI',
      collateralValueUSD: 3 * ethPrice,
      debtValueUSD: (3 * ethPrice) / 1.33,
      collateralRatioPct: 133.3,
      liquidationThresholdPct: 120,
      liquidationPriceUSD: ethPrice * 0.90,
      currentPriceUSD: ethPrice,
    },
    {
      id: 'pos_3',
      protocol: 'Compound-like',
      collateralAsset: 'BTC',
      debtAsset: 'USDC',
      collateralValueUSD: 1 * btcPrice,
      debtValueUSD: (1 * btcPrice) / 1.11,
      collateralRatioPct: 111.1,
      liquidationThresholdPct: 120,
      liquidationPriceUSD: btcPrice * 0.90,
      currentPriceUSD: btcPrice,
    },
    {
      id: 'pos_4',
      protocol: 'Aave-like',
      collateralAsset: 'WBTC',
      debtAsset: 'ETH',
      collateralValueUSD: 2 * wbtcPrice,
      debtValueUSD: (2 * wbtcPrice) / 1.79,
      collateralRatioPct: 179.2,
      liquidationThresholdPct: 120,
      liquidationPriceUSD: wbtcPrice * 0.67,
      currentPriceUSD: wbtcPrice,
    },
    {
      id: 'pos_5',
      protocol: 'Maker-like',
      collateralAsset: 'ETH',
      debtAsset: 'DAI',
      collateralValueUSD: 4 * ethPrice,
      debtValueUSD: (4 * ethPrice) / 1.41,
      collateralRatioPct: 140.7,
      liquidationThresholdPct: 120,
      liquidationPriceUSD: ethPrice * 0.85,
      currentPriceUSD: ethPrice,
    },
  ];
}

/**
 * Liquidation Risk Tracker Component
 */
export function LiquidationRiskTracker() {
  const { protocolStatus } = useWeilChain();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [actionModal, setActionModal] = useState<'add_collateral' | 'reduce_debt' | 'close' | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('');

  // Fetch real prices from our API
  const { data: priceData } = useSWR<{ success: boolean; prices: Record<string, PriceData> }>(
    '/api/prices?symbols=ETH,BTC,WBTC',
    fetcher,
    { refreshInterval: 30000 }
  );

  // Update positions when prices change
  const updatePositionsWithPrices = useCallback((prices: Record<string, PriceData>) => {
    // Get stored position adjustments
    const stored = localStorage.getItem('liquidation_positions_adjustments');
    const adjustments = stored ? JSON.parse(stored) : {};

    // Generate base positions from real prices
    const basePositions = generatePositionsFromPrices(prices);

    // Apply any user adjustments
    const adjustedPositions = basePositions.map(pos => {
      const adj = adjustments[pos.id];
      if (adj) {
        const newCollateral = pos.collateralValueUSD + (adj.collateralDelta || 0);
        const newDebt = pos.debtValueUSD - (adj.debtDelta || 0);
        const newRatio = newDebt > 0 ? (newCollateral / newDebt) * 100 : 999;
        return {
          ...pos,
          collateralValueUSD: newCollateral,
          debtValueUSD: newDebt,
          collateralRatioPct: newRatio
        };
      }
      return pos;
    });

    setPositions(adjustedPositions);
  }, []);

  // Load positions when price data is available
  useEffect(() => {
    if (priceData?.success && priceData.prices) {
      updatePositionsWithPrices(priceData.prices);
    }
  }, [priceData, updatePositionsWithPrices]);

  // Calculate summary stats
  const totalPositions = positions.length;
  const dangerPositions = positions.filter(p => getRiskBand(p.collateralRatioPct) === 'DANGER').length;
  const cautionPositions = positions.filter(p => getRiskBand(p.collateralRatioPct) === 'CAUTION').length;
  const avgCollateralRatio = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.collateralRatioPct, 0) / positions.length
    : 0;
  const totalCollateralUSD = positions.reduce((sum, p) => sum + p.collateralValueUSD, 0);
  const totalDebtUSD = positions.reduce((sum, p) => sum + p.debtValueUSD, 0);

  /**
   * Calculate buffer percentage (distance to liquidation)
   */
  function calculateBuffer(position: Position): number {
    return ((position.currentPriceUSD - position.liquidationPriceUSD) / position.currentPriceUSD) * 100;
  }

  /**
   * Handle action submission (Add Collateral / Reduce Debt)
   */
  function handleActionSubmit() {
    if (!selectedPosition || !actionAmount) return;

    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const updatedPositions = positions.map(p => {
      if (p.id === selectedPosition.id) {
        let newCollateralValue = p.collateralValueUSD;
        let newDebtValue = p.debtValueUSD;

        if (actionModal === 'add_collateral') {
          newCollateralValue += amount;
        } else if (actionModal === 'reduce_debt') {
          newDebtValue = Math.max(0, newDebtValue - amount);
        }

        const newRatio = newDebtValue > 0 ? (newCollateralValue / newDebtValue) * 100 : 999;

        return {
          ...p,
          collateralValueUSD: newCollateralValue,
          debtValueUSD: newDebtValue,
          collateralRatioPct: parseFloat(newRatio.toFixed(1)),
        };
      }
      return p;
    });

    setPositions(updatedPositions);
    localStorage.setItem('liquidation_positions', JSON.stringify(updatedPositions));
    
    // Close modal and reset
    setActionModal(null);
    setSelectedPosition(null);
    setActionAmount('');

    alert(`✅ Position updated successfully!\n\nNew collateral ratio: ${updatedPositions.find(p => p.id === selectedPosition.id)?.collateralRatioPct.toFixed(1)}%`);
  }

  /**
   * Handle close position
   */
  function handleClosePosition() {
    if (!selectedPosition) return;

    if (confirm(`⚠️ Close position on ${selectedPosition.protocol}?\n\nThis will remove the position from tracking.`)) {
      const updatedPositions = positions.filter(p => p.id !== selectedPosition.id);
      setPositions(updatedPositions);
      localStorage.setItem('liquidation_positions', JSON.stringify(updatedPositions));
      setActionModal(null);
      setSelectedPosition(null);
      alert('✅ Position closed and removed from tracking');
    }
  }

  /**
   * Calculate projected ratio for action preview
   */
  function getProjectedRatio(position: Position, amount: number, action: 'add_collateral' | 'reduce_debt'): number {
    let newCollateralValue = position.collateralValueUSD;
    let newDebtValue = position.debtValueUSD;

    if (action === 'add_collateral') {
      newCollateralValue += amount;
    } else {
      newDebtValue = Math.max(0, newDebtValue - amount);
    }

    return newDebtValue > 0 ? (newCollateralValue / newDebtValue) * 100 : 999;
  }

  return (
    <div className="border border-[#39FF14]/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#39FF14] font-mono mb-2">
            [LIQUIDATION_RISK_TRACKER]
          </h2>
          <p className="text-neutral-400 font-mono text-sm">
            Monitor your DeFi positions and manage liquidation risk
          </p>
        </div>
        {protocolStatus === 'CRITICAL' && (
          <div className="bg-red-500/20 border-2 border-red-500 px-4 py-2 animate-pulse">
            <div className="text-red-400 font-mono text-sm font-bold">
              🛡️ SENTINEL: CRITICAL
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-neutral-700 p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500 font-mono mb-1">TOTAL POSITIONS</div>
          <div className="text-2xl font-bold text-white font-mono">{totalPositions}</div>
        </div>
        
        <div className={`border p-4 ${
          protocolStatus === 'CRITICAL' && dangerPositions > 0
            ? 'border-red-500 bg-red-500/20 animate-pulse'
            : dangerPositions > 0
            ? 'border-red-500 bg-red-500/10'
            : 'border-neutral-700 bg-neutral-900'
        }`}>
          <div className="text-xs text-neutral-500 font-mono mb-1">AT RISK (DANGER)</div>
          <div className={`text-2xl font-bold font-mono ${
            dangerPositions > 0 ? 'text-red-500' : 'text-neutral-600'
          }`}>
            {dangerPositions}
          </div>
        </div>

        <div className="border border-neutral-700 p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500 font-mono mb-1">AVG COLLATERAL RATIO</div>
          <div className={`text-2xl font-bold font-mono ${
            getRiskColor(getRiskBand(avgCollateralRatio))
          }`} style={{ color: getRiskColor(getRiskBand(avgCollateralRatio)) }}>
            {avgCollateralRatio.toFixed(1)}%
          </div>
        </div>

        <div className="border border-neutral-700 p-4 bg-neutral-900">
          <div className="text-xs text-neutral-500 font-mono mb-1">HEALTH FACTOR</div>
          <div className="text-2xl font-bold text-[#00D4FF] font-mono">
            {(totalCollateralUSD / totalDebtUSD).toFixed(2)}
          </div>
        </div>
      </div>

      {/* CRITICAL Warning Banner */}
      {protocolStatus === 'CRITICAL' && dangerPositions > 0 && (
        <div className="border-2 border-red-500 bg-red-500/10 p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="text-red-400 font-mono text-sm font-bold mb-1">
                URGENT: PROTOCOL IN CRITICAL STATE
              </div>
              <div className="text-red-400/80 font-mono text-xs">
                You have {dangerPositions} position{dangerPositions !== 1 ? 's' : ''} at immediate liquidation risk. 
                Take action now to avoid losses.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      {positions.length > 0 && (
        <div className="mb-6">
          <div className="text-sm text-neutral-400 font-mono mb-2">RISK DISTRIBUTION</div>
          <div className="flex gap-2">
            <div 
              className="h-8 bg-[#39FF14] flex items-center justify-center font-mono text-xs text-black font-bold"
              style={{ width: `${(positions.filter(p => getRiskBand(p.collateralRatioPct) === 'SAFE').length / totalPositions) * 100}%` }}
            >
              {positions.filter(p => getRiskBand(p.collateralRatioPct) === 'SAFE').length > 0 && 'SAFE'}
            </div>
            <div 
              className="h-8 bg-[#FFD700] flex items-center justify-center font-mono text-xs text-black font-bold"
              style={{ width: `${(cautionPositions / totalPositions) * 100}%` }}
            >
              {cautionPositions > 0 && 'CAUTION'}
            </div>
            <div 
              className="h-8 bg-[#FF4444] flex items-center justify-center font-mono text-xs text-white font-bold"
              style={{ width: `${(dangerPositions / totalPositions) * 100}%` }}
            >
              {dangerPositions > 0 && 'DANGER'}
            </div>
          </div>
        </div>
      )}

      {/* Position Cards */}
      {positions.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 font-mono">
          No positions to track. Connect your wallet to import positions.
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map(position => {
            const riskBand = getRiskBand(position.collateralRatioPct);
            const buffer = calculateBuffer(position);
            const borderColor = getRiskColor(riskBand);
            const isCriticalAndDanger = protocolStatus === 'CRITICAL' && riskBand === 'DANGER';

            return (
              <div
                key={position.id}
                className={`border-l-4 border-r border-t border-b p-5 transition-all ${
                  isCriticalAndDanger ? 'animate-pulse bg-red-500/10' : 'bg-neutral-900'
                }`}
                style={{ borderLeftColor: borderColor, borderRightColor: '#404040', borderTopColor: '#404040', borderBottomColor: '#404040' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-lg text-white font-bold">
                        {position.collateralAsset} → {position.debtAsset}
                      </span>
                      <span 
                        className="text-xs px-3 py-1 border-2 font-mono font-bold"
                        style={{ 
                          borderColor: borderColor,
                          color: borderColor,
                          backgroundColor: `${borderColor}15`
                        }}
                      >
                        {riskBand}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
                      {position.protocol}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold font-mono" style={{ color: borderColor }}>
                      {position.collateralRatioPct.toFixed(1)}%
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
                      Collateral Ratio
                    </div>
                  </div>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-neutral-500 font-mono mb-1">COLLATERAL VALUE</div>
                    <div className="text-sm text-white font-mono font-bold">
                      ${position.collateralValueUSD.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-mono mb-1">DEBT VALUE</div>
                    <div className="text-sm text-white font-mono font-bold">
                      ${position.debtValueUSD.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-mono mb-1">CURRENT PRICE</div>
                    <div className="text-sm text-[#00D4FF] font-mono font-bold">
                      ${position.currentPriceUSD.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-mono mb-1">LIQUIDATION PRICE</div>
                    <div className="text-sm text-red-500 font-mono font-bold">
                      ${position.liquidationPriceUSD.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Distance to Liquidation Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-500 font-mono">
                      DISTANCE TO LIQUIDATION
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color: borderColor }}>
                      {buffer.toFixed(1)}% buffer
                    </span>
                  </div>
                  <div className="w-full h-4 bg-neutral-800 border border-neutral-700 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, buffer))}%`,
                        backgroundColor: borderColor,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-neutral-600 font-mono">
                    <span>LIQUIDATION</span>
                    <span>SAFE</span>
                  </div>
                </div>

                {/* Action Buttons (DANGER only) */}
                {riskBand === 'DANGER' && (
                  <div className="flex gap-2 pt-4 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        setSelectedPosition(position);
                        setActionModal('add_collateral');
                      }}
                      className="flex-1 bg-[#39FF14] text-black px-4 py-2 font-mono text-sm font-bold hover:bg-[#2EE010] transition-colors"
                    >
                      [ADD COLLATERAL]
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPosition(position);
                        setActionModal('reduce_debt');
                      }}
                      className="flex-1 bg-[#FFD700] text-black px-4 py-2 font-mono text-sm font-bold hover:bg-[#E5C100] transition-colors"
                    >
                      [REDUCE DEBT]
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPosition(position);
                        setActionModal('close');
                      }}
                      className="border-2 border-red-500 text-red-500 px-4 py-2 font-mono text-sm font-bold hover:bg-red-500 hover:text-white transition-colors"
                    >
                      [CLOSE]
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && selectedPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-[#39FF14] bg-black p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#39FF14] font-mono mb-4">
              {actionModal === 'add_collateral' && '[ADD_COLLATERAL]'}
              {actionModal === 'reduce_debt' && '[REDUCE_DEBT]'}
              {actionModal === 'close' && '[CLOSE_POSITION]'}
            </h3>

            {actionModal !== 'close' ? (
              <>
                {/* Position Info */}
                <div className="mb-6 p-4 border border-neutral-700 bg-neutral-900">
                  <div className="text-sm text-neutral-400 font-mono mb-2">POSITION</div>
                  <div className="text-white font-mono mb-4">
                    {selectedPosition.collateralAsset} → {selectedPosition.debtAsset} on {selectedPosition.protocol}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400 font-mono">Current Ratio:</span>
                    <span className="text-white font-mono font-bold">
                      {selectedPosition.collateralRatioPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400 font-mono">Risk Band:</span>
                    <span 
                      className="font-mono font-bold"
                      style={{ color: getRiskColor(getRiskBand(selectedPosition.collateralRatioPct)) }}
                    >
                      {getRiskBand(selectedPosition.collateralRatioPct)}
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="mb-6">
                  <label className="text-sm text-neutral-400 font-mono block mb-2">
                    {actionModal === 'add_collateral' ? 'COLLATERAL AMOUNT (USD)' : 'DEBT AMOUNT TO REPAY (USD)'}
                  </label>
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-black border border-[#39FF14] px-4 py-3 text-white font-mono text-lg"
                    min="0"
                    step="100"
                  />
                </div>

                {/* Projected Outcome */}
                {actionAmount && parseFloat(actionAmount) > 0 && (
                  <div className="mb-6 p-4 border-2 border-[#00D4FF] bg-[#00D4FF]/10">
                    <div className="text-sm text-[#00D4FF] font-mono mb-2">PROJECTED OUTCOME</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono">New Collateral Ratio:</span>
                      <span className="text-[#00D4FF] font-mono font-bold text-xl">
                        {getProjectedRatio(selectedPosition, parseFloat(actionAmount), actionModal).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-400 font-mono">
                      Risk Band: <span 
                        className="font-bold"
                        style={{ color: getRiskColor(getRiskBand(getProjectedRatio(selectedPosition, parseFloat(actionAmount), actionModal))) }}
                      >
                        {getRiskBand(getProjectedRatio(selectedPosition, parseFloat(actionAmount), actionModal))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActionModal(null);
                      setSelectedPosition(null);
                      setActionAmount('');
                    }}
                    className="flex-1 border border-neutral-700 px-4 py-3 text-neutral-400 hover:bg-neutral-900 transition-colors text-sm font-mono"
                  >
                    [CANCEL]
                  </button>
                  <button
                    onClick={handleActionSubmit}
                    disabled={!actionAmount || parseFloat(actionAmount) <= 0}
                    className="flex-1 bg-[#39FF14] px-4 py-3 text-black hover:bg-[#2EE010] transition-colors text-sm font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    [CONFIRM]
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Close Position Confirmation */}
                <div className="mb-6 p-4 border border-red-500 bg-red-500/10">
                  <div className="text-red-400 font-mono text-sm mb-4">
                    ⚠️ Are you sure you want to close this position?
                  </div>
                  <div className="text-white font-mono text-sm mb-2">
                    {selectedPosition.collateralAsset} → {selectedPosition.debtAsset}
                  </div>
                  <div className="text-neutral-400 font-mono text-xs">
                    This will remove the position from tracking. This action is for demo purposes only.
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActionModal(null);
                      setSelectedPosition(null);
                    }}
                    className="flex-1 border border-neutral-700 px-4 py-3 text-neutral-400 hover:bg-neutral-900 transition-colors text-sm font-mono"
                  >
                    [CANCEL]
                  </button>
                  <button
                    onClick={handleClosePosition}
                    className="flex-1 bg-red-500 px-4 py-3 text-white hover:bg-red-600 transition-colors text-sm font-mono font-bold"
                  >
                    [CONFIRM CLOSE]
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
