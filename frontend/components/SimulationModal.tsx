'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { determineSystemStatus } from '@/lib/calculations';
import { useAppStore } from '@/lib/store';
import { ScenarioControls } from './ScenarioControls';
import type { SimulationScenario } from '@/lib/types';

export interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  currentReserveRatio: number;
  onSimulatedPriceChange: (price: number, ratio: number, status: 'NORMAL' | 'CRITICAL') => void;
  onScenarioActivate: (scenario: SimulationScenario) => void;
}

/**
 * SimulationModal - Interactive modal for testing protocol behavior under different price scenarios
 * 
 * Features:
 * - Price range slider: $0.10 to $10.00
 * - Real-time ratio calculation based on actual protocol state
 * - Visual feedback when simulated ratio crosses 400% threshold
 * - Escape key and backdrop click to close
 * 
 * Calculation:
 * - Reserve Ratio = (Reserves in USD / Stablecoin Supply) * 100
 * - When ERG price changes, reserves value changes proportionally
 * - New ratio = (baseReserves * newPrice / stablecoinSupply) * 100
 * 
 * Requirements: 12.1, 12.2, 12.3, 5.1, 5.2
 */
export function SimulationModal({
  isOpen,
  onClose,
  currentPrice,
  currentReserveRatio,
  onSimulatedPriceChange,
  onScenarioActivate,
}: SimulationModalProps) {
  const simulationScenario = useAppStore((state) => state.simulationScenario);
  
  // ====================================================================
  // 1. STATE MANAGEMENT
  // ====================================================================
  // Use only real current price - no fallback
  const [simulatedPrice, setSimulatedPrice] = useState(currentPrice);
  const [frozenPrice, setFrozenPrice] = useState<number | null>(null);
  const [forcedRatio, setForcedRatio] = useState<number | null>(null);
  const [protocolState, setProtocolState] = useState<{
    baseReserves: number;
    stablecoinSupply: number;
    currentRatio: number;
  } | null>(null);
  
  // ====================================================================
  // 2. FETCH REAL PROTOCOL STATE ON MOUNT
  // ====================================================================
  useEffect(() => {
    const fetchProtocolState = async () => {
      try {
        const response = await fetch('/api/djed?endpoint=djed/state');
        
        if (!response.ok) {
          console.error('Failed to fetch protocol state:', response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          // Handle NOT_DEPLOYED status - protocol exists but has 0 values
          if (data.data.status === 'NOT_DEPLOYED' || data.data.djedSupply === 0) {
            console.info('📊 Protocol not deployed yet - using proportional simulation');
            setProtocolState(null); // Will use proportional adjustment instead
            return;
          }
          
          // Only set state if we have real deployed data
          if (data.data.baseReserves > 0 && data.data.djedSupply > 0) {
            setProtocolState({
              baseReserves: data.data.baseReserves,
              stablecoinSupply: data.data.djedSupply,
              currentRatio: data.data.reserveRatio,
            });
            console.log('📊 Protocol State Loaded:', data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch protocol state:', error);
        // Don't set fallback state - let UI show error
      }
    };
    
    fetchProtocolState();
  }, []);
  
  // ====================================================================
  // 3. CALCULATE RATIO BASED ON PRICE CHANGE
  // ====================================================================
  // Formula: Reserve Ratio = (baseReserves * ergPrice / stablecoinSupply) * 100
  const calculateRatioFromPrice = (price: number): number => {
    if (!protocolState) {
      // If protocol state not loaded, proportionally adjust current ratio
      return currentReserveRatio > 0 ? currentReserveRatio * (price / currentPrice) : 0;
    }
    
    const reservesUSD = protocolState.baseReserves * price;
    const ratio = (reservesUSD / protocolState.stablecoinSupply) * 100;
    return ratio;
  };
  
  const displayedRatio = forcedRatio !== null 
    ? forcedRatio 
    : calculateRatioFromPrice(simulatedPrice);
  const simulatedStatus = determineSystemStatus(displayedRatio);
  
  // Debug log
  console.log('🔄 Simulation State:', {
    simulatedPrice,
    displayedRatio,
    forcedRatio,
    status: simulatedStatus,
    protocolState,
  });

  // ====================================================================
  // 4. UPDATE ON OPEN
  // ====================================================================
  useEffect(() => {
    if (isOpen && currentPrice > 0) {
      setSimulatedPrice(currentPrice);
      setForcedRatio(null);
    }
  }, [isOpen, currentPrice]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value);
    setSimulatedPrice(newPrice);
    setForcedRatio(null);
    
    // Calculate new ratio based on price change
    const newRatio = calculateRatioFromPrice(newPrice);
    const newStatus = determineSystemStatus(newRatio);
    
    console.log('🎚️ Slider Changed:', { newPrice, newRatio, newStatus });
    
    // Notify parent
    onSimulatedPriceChange(newPrice, newRatio, newStatus);
  };

  const handleScenarioActivate = (scenario: SimulationScenario) => {
    console.log('🎭 Scenario Activated:', scenario);
    onScenarioActivate(scenario);
    
    // Use only real data - no fallbacks
    const basePrice = currentPrice;
    const baseRatio = currentReserveRatio;
    
    // Don't run simulation without real data
    if (!basePrice || !baseRatio) {
      console.error('Cannot run simulation without real price and ratio data');
      return;
    }
    
    if (scenario === 'flash_crash') {
      // Instant 50% price drop
      const crashPrice = basePrice * 0.5;
      setSimulatedPrice(crashPrice);
      setForcedRatio(null);
      const newRatio = calculateRatioFromPrice(crashPrice);
      onSimulatedPriceChange(crashPrice, newRatio, determineSystemStatus(newRatio));
    } else if (scenario === 'oracle_freeze') {
      // Lock price at current value
      setFrozenPrice(simulatedPrice);
    } else if (scenario === 'bank_run') {
      // Force ratio below 400%
      const bankRunRatio = 350;
      setForcedRatio(bankRunRatio);
      onSimulatedPriceChange(simulatedPrice, bankRunRatio, 'CRITICAL');
    } else if (scenario === 'none') {
      // Reset to live state
      setFrozenPrice(null);
      setForcedRatio(null);
      setSimulatedPrice(basePrice);
      onSimulatedPriceChange(basePrice, baseRatio, determineSystemStatus(baseRatio));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md p-2 sm:p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-obsidian border-2 border-terminal p-4 sm:p-6 md:p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto mx-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="simulation-modal-title"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-terminal hover:text-white text-3xl sm:text-2xl font-mono touch-manipulation active:scale-95 w-10 h-10 flex items-center justify-center"
              aria-label="Close modal"
            >
              ×
            </button>

            {/* Modal Header */}
            <h2 id="simulation-modal-title" className="text-xl sm:text-2xl md:text-3xl font-display font-black text-terminal mb-4 sm:mb-6 uppercase pr-10 sm:pr-8">
              Price Simulation
            </h2>

            {/* Risk Scenarios */}
            <ScenarioControls
              onScenarioActivate={handleScenarioActivate}
              currentScenario={simulationScenario}
            />

            {/* Oracle Freeze Warning */}
            {simulationScenario === 'oracle_freeze' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-yellow-500 bg-opacity-10 border border-yellow-500"
              >
                <p className="text-yellow-500 font-mono text-xs font-bold">
                  ⚠ ORACLE FEED UNRESPONSIVE – price frozen at ${frozenPrice?.toFixed(2)}
                </p>
              </motion.div>
            )}

            {/* Current vs Simulated Price */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 font-mono">
              <div className="min-w-0">
                <p className="text-textSecondary text-[10px] sm:text-xs md:text-sm mb-1 truncate">CURRENT PRICE</p>
                <p className="text-lg sm:text-xl md:text-2xl text-textPrimary">${currentPrice.toFixed(2)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-textSecondary text-[10px] sm:text-xs md:text-sm mb-1 truncate">SIMULATED PRICE</p>
                <p className="text-lg sm:text-xl md:text-2xl text-terminal">${simulatedPrice.toFixed(2)}</p>
              </div>
            </div>

            {/* Price Slider */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="price-slider" className="block text-textSecondary text-xs sm:text-sm mb-2 font-mono">
                ADJUST ERG PRICE (USD)
              </label>
              <input
                id="price-slider"
                type="range"
                min="0.10"
                max="10.00"
                step="0.01"
                value={simulatedPrice}
                onChange={handleSliderChange}
                disabled={simulationScenario === 'oracle_freeze'}
                className="w-full h-3 sm:h-2 bg-obsidian border border-terminal appearance-none cursor-pointer slider-thumb touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-textSecondary font-mono mt-1">
                <span>$0.10</span>
                <span>$10.00</span>
              </div>
            </div>

            {/* Simulated Reserve Ratio Display */}
            <div className="bg-void border-2 border-terminal p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
              <p className="text-textSecondary text-[10px] sm:text-xs md:text-sm mb-2 font-mono">SIMULATED RESERVE RATIO</p>
              <p className={`text-2xl sm:text-3xl md:text-4xl font-mono font-bold break-words ${
                simulatedStatus === 'CRITICAL' ? 'text-alert' : 'text-terminal'
              }`}>
                {displayedRatio.toFixed(2)}%
              </p>
              
              {/* Debug info */}
              <p className="text-xs text-gray-500 mt-2 font-mono">
                {forcedRatio !== null 
                  ? `Forced: ${forcedRatio.toFixed(1)}% (Bank Run Scenario)`
                  : protocolState
                    ? `Calculated: ${displayedRatio.toFixed(1)}% based on ${protocolState.baseReserves.toLocaleString()} ERG at $${simulatedPrice.toFixed(2)}`
                    : `Loading protocol state...`
                }
              </p>
              
              {/* Red alert indicator when ratio < 400% */}
              {simulatedStatus === 'CRITICAL' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 sm:mt-4 p-2 sm:p-3 bg-alert bg-opacity-10 border border-alert"
                >
                  <p className="text-alert font-mono text-xs sm:text-sm font-bold">
                    ⚠ CRITICAL: Reserve ratio below 400% threshold
                  </p>
                </motion.div>
              )}
            </div>

            {/* Instructions */}
            <p className="text-textSecondary text-[10px] sm:text-xs md:text-sm font-mono mb-2 leading-relaxed">
              Adjust the slider to simulate different ERG price scenarios and see how they affect the reserve ratio.
            </p>
            <p className="text-textSecondary text-[10px] sm:text-xs font-mono mb-4 leading-relaxed">
              Keyboard: Use arrow keys to adjust slider, Tab to navigate, Escape to close.
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-full px-6 sm:px-8 py-3 sm:py-4 font-display font-bold text-base sm:text-lg transition-all uppercase touch-manipulation active:scale-95 ${
                simulatedStatus === 'CRITICAL'
                  ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-glow'
                  : 'bg-terminal text-void hover:shadow-green-glow'
              }`}
            >
              Close Simulation
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
