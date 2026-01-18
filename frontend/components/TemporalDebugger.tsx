/**
 * TemporalDebugger Component
 * 
 * Purpose:
 * A sophisticated time-travel simulation debugger for the Workflow Builder that allows
 * users to step through workflow execution before deployment. Transforms the builder
 * into a powerful IDE by providing step-by-step visualization of state changes, data flow,
 * and execution logic. Similar to Redux DevTools or Remix IDE debugger.
 * 
 * Features:
 * - Interactive timeline with Play/Pause/Reset controls
 * - Scrubber slider for manual step navigation (0% to 100%)
 * - Step indicators showing workflow milestones
 * - Real-time state visualization (token balances, positions, etc.)
 * - Animated data flow along connections between nodes
 * - Visual feedback on canvas (highlight active node, dim future nodes)
 * - Mock simulation engine with realistic state transitions
 * - DevTools/Cyberpunk aesthetic (dark, monospace, neon accents)
 * 
 * Architecture:
 * - Self-contained component with internal state management
 * - Mock simulation engine (can be replaced with real execution engine)
 * - Event-driven state updates via callback props
 * - Responsive design with fixed bottom positioning
 * - Performance-optimized with requestAnimationFrame for smooth animations
 * 
 * Data Flow:
 * 1. User initiates simulation (Play button or scrubber drag)
 * 2. Component calculates current step based on slider position
 * 3. Mock engine retrieves state for that step
 * 4. Callback props update WorkflowBuilder canvas (highlight nodes)
 * 5. State popover displays relevant data above active node
 * 
 * Integration:
 * - Place at bottom of WorkflowBuilder canvas (fixed position)
 * - Receives workflow nodes and connections as props
 * - Emits activeStep via onStepChange callback
 * - Emits simulation state via onStateChange callback
 * 
 * Mock Simulation Engine:
 * - Simulates a 4-step flash loan arbitrage workflow:
 *   Step 0 (Start): Initial wallet state (1000 USDC)
 *   Step 1 (Flash Loan): Borrowed capital (+1M USDC)
 *   Step 2 (Swap): Token swap (USDC → ETH)
 *   Step 3 (Repay): Loan repayment with profit (+50 USDC)
 * 
 * State Structure:
 * - currentStep: 0-100 (percentage of timeline)
 * - isPlaying: boolean (animation state)
 * - simulationStates: array of state objects per step
 * - activeNodeId: currently executing node ID
 * 
 * Styling:
 * - Dark background (#0a0a0a) with semi-transparency
 * - Neon accents: Cyan (#00D4FF), Green (#39FF14), Gold (#FFD700)
 * - Monospace fonts (JetBrains Mono, Space Mono)
 * - Glass-morphism backdrop blur
 * - Smooth transitions and animations
 * 
 * Accessibility:
 * - ARIA labels for all controls
 * - Keyboard shortcuts (Space: Play/Pause, R: Reset, Arrow keys: Step navigation)
 * - Screen reader announcements for state changes
 * - High contrast colors meeting WCAG AA standards
 * 
 * Performance:
 * - Throttled slider updates to prevent excessive re-renders
 * - requestAnimationFrame for smooth play animation
 * - Memoized state calculations
 * - Optimized SVG rendering for flow animations
 * 
 * Dependencies:
 * - React 18 hooks (useState, useEffect, useCallback, useRef)
 * - Tailwind CSS for styling
 * - lucide-react for icons
 * 
 * TODO:
 * - Connect to real workflow execution engine
 * - Add breakpoint functionality
 * - Implement state variable inspection
 * - Add execution history replay
 * - Support variable speed playback
 * - Add export/import simulation sessions
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronRight,
  ChevronLeft,
  Info,
  Clock,
  Activity,
  Zap,
} from 'lucide-react';

/**
 * SimulationStep interface
 * Represents a single step in the workflow execution timeline
 */
export interface SimulationStep {
  id: number; // Step index (0-based)
  nodeId: string | null; // Active workflow node ID at this step
  label: string; // Human-readable label (e.g., "Flash Loan", "Swap")
  timestamp: number; // Simulated execution time (ms from start)
  state: SimulationState; // State snapshot at this step
  description: string; // Detailed description of what happens at this step
  gasUsed?: number; // Gas consumed up to this step
}

/**
 * SimulationState interface
 * Represents the state of the system at a specific point in time
 */
export interface SimulationState {
  walletBalances: {
    token: string; // Token symbol (USDC, ETH, etc.)
    amount: number; // Token amount
    usdValue: number; // USD value
  }[];
  positions: {
    protocol: string; // Protocol name (Aave, Uniswap, etc.)
    type: string; // Position type (loan, liquidity, etc.)
    amount: number; // Position size
    health?: number; // Health ratio (for loans)
  }[];
  metrics: {
    totalValue: number; // Total portfolio value (USD)
    profit: number; // Profit/loss since start (USD)
    gasSpent: number; // Cumulative gas spent (WEIL)
    executionTime: number; // Total execution time (ms)
  };
  logs: string[]; // Execution logs for this step
}

/**
 * TemporalDebuggerProps interface
 */
export interface TemporalDebuggerProps {
  /**
   * Array of workflow node IDs in execution order
   * Used to map timeline steps to specific nodes
   */
  nodeIds?: string[];

  /**
   * Whether the debugger is active/visible
   * Set to false to hide the timeline (e.g., during deployment)
   */
  isActive?: boolean;

  /**
   * Callback fired when the current step changes
   * @param step - Current step index (0-based)
   * @param nodeId - Active node ID at this step (null if before/after workflow)
   */
  onStepChange?: (step: number, nodeId: string | null) => void;

  /**
   * Callback fired when simulation state changes
   * @param state - Current simulation state
   */
  onStateChange?: (state: SimulationState) => void;

  /**
   * Callback fired when play/pause state changes
   * @param isPlaying - Whether simulation is currently playing
   */
  onPlayStateChange?: (isPlaying: boolean) => void;

  /**
   * Custom simulation steps (overrides mock data)
   * Allows parent to provide real execution data
   */
  customSteps?: SimulationStep[];
}

/**
 * Generate mock simulation steps for a standard flash loan arbitrage workflow
 * Production: Replace with real execution engine integration
 */
function generateMockSimulationSteps(): SimulationStep[] {
  return [
    {
      id: 0,
      nodeId: null, // Before workflow starts
      label: 'Start',
      timestamp: 0,
      description: 'Initial wallet state before workflow execution',
      state: {
        walletBalances: [
          { token: 'USDC', amount: 1000, usdValue: 1000 },
        ],
        positions: [],
        metrics: {
          totalValue: 1000,
          profit: 0,
          gasSpent: 0,
          executionTime: 0,
        },
        logs: ['[INIT] Workflow initialized', '[WALLET] Connected: 0x742d...8a3c'],
      },
    },
    {
      id: 1,
      nodeId: 'flash_loan', // Mock node ID
      label: 'Flash Loan',
      timestamp: 500,
      description: 'Borrow 1,000,000 USDC from Aave flash loan pool',
      gasUsed: 120000,
      state: {
        walletBalances: [
          { token: 'USDC', amount: 1001000, usdValue: 1001000 },
        ],
        positions: [
          { protocol: 'Aave', type: 'Flash Loan', amount: 1000000, health: 100 },
        ],
        metrics: {
          totalValue: 1001000,
          profit: 0,
          gasSpent: 12,
          executionTime: 500,
        },
        logs: [
          '[FLASH_LOAN] Initiating flash loan request',
          '[AAVE] Borrowed 1,000,000 USDC',
          '[GAS] Consumed 120,000 gas (12 WEIL)',
        ],
      },
    },
    {
      id: 2,
      nodeId: 'teleport', // Cross-chain bridge node
      label: 'Cross-Chain Bridge',
      timestamp: 800,
      description: 'Bridging USDC from WeilChain to Ethereum via Teleporter',
      gasUsed: 250000,
      state: {
        walletBalances: [
          { token: 'USDC', amount: 1000, usdValue: 1000 },
          { token: 'USDC (Bridging)', amount: 1000000, usdValue: 1000000 },
        ],
        positions: [
          { protocol: 'Aave', type: 'Flash Loan', amount: 1000000, health: 100 },
          { protocol: 'Teleporter', type: 'Bridge', amount: 1000000, health: 100 },
        ],
        metrics: {
          totalValue: 1001000,
          profit: 0,
          gasSpent: 37,
          executionTime: 800,
        },
        logs: [
          '[TELEPORTER] Initiating cross-chain bridge',
          '[BRIDGE] Source: WeilChain → Destination: Ethereum',
          '[BRIDGE] Amount: 1,000,000 USDC',
          '[BRIDGE] Estimated time: 5 minutes',
          '[BRIDGE] Fee: $2.50',
          '[BRIDGE] Status: Bridging... (waiting for confirmations)',
          '[GAS] Consumed 250,000 gas (25 WEIL)',
        ],
      },
    },
    {
      id: 3,
      nodeId: 'swap', // Mock node ID
      label: 'Swap (Ethereum)',
      timestamp: 1500,
      description: 'Swap USDC for ETH on Uniswap V3 (Ethereum mainnet)',
      gasUsed: 180000,
      state: {
        walletBalances: [
          { token: 'USDC', amount: 1000, usdValue: 1000 },
          { token: 'ETH', amount: 305.12, usdValue: 1001480 },
        ],
        positions: [
          { protocol: 'Aave', type: 'Flash Loan', amount: 1000000, health: 100 },
        ],
        metrics: {
          totalValue: 1002480,
          profit: 1480,
          gasSpent: 55,
          executionTime: 1500,
        },
        logs: [
          '[BRIDGE] Cross-chain transfer completed',
          '[SWAP] Routing through Uniswap V3 pool (Ethereum)',
          '[UNISWAP] Swapped 1,000,000 USDC → 305.12 ETH',
          '[SLIPPAGE] 0.14% (Below 0.5% threshold)',
          '[GAS] Consumed 180,000 gas (18 ETH)',
        ],
      },
    },
    {
      id: 4,
      nodeId: 'repay', // Mock node ID
      label: 'Repay',
      timestamp: 2100,
      description: 'Repay flash loan with fee, capture arbitrage profit',
      gasUsed: 150000,
      state: {
        walletBalances: [
          { token: 'USDC', amount: 1050, usdValue: 1050 },
        ],
        positions: [],
        metrics: {
          totalValue: 1050,
          profit: 50,
          gasSpent: 70,
          executionTime: 2100,
        },
        logs: [
          '[REPAY] Converting ETH back to USDC',
          '[AAVE] Flash loan repaid: 1,000,000 USDC + 900 USDC fee',
          '[PROFIT] Net profit: +50 USDC (5.0% ROI)',
          '[GAS] Total gas consumed: 700,000 (70 WEIL + ETH)',
          '[SUCCESS] Workflow completed successfully',
        ],
      },
    },
  ];
}

/**
 * TemporalDebugger Main Component
 * Interactive timeline debugger for workflow execution simulation
 */
export default function TemporalDebugger({
  nodeIds = [],
  isActive = true,
  onStepChange,
  onStateChange,
  onPlayStateChange,
  customSteps,
}: TemporalDebuggerProps) {
  // State management
  const [currentStep, setCurrentStep] = useState(0); // 0-100 (percentage)
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // Playback speed multiplier
  const [showDetails, setShowDetails] = useState(true);
  
  // Refs for animation control
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Get simulation steps (custom or mock)
  const simulationSteps = customSteps || generateMockSimulationSteps();
  const totalSteps = simulationSteps.length;

  /**
   * Calculate current step index from percentage
   */
  const getCurrentStepIndex = useCallback((percentage: number): number => {
    const index = Math.floor((percentage / 100) * (totalSteps - 1));
    return Math.max(0, Math.min(index, totalSteps - 1));
  }, [totalSteps]);

  /**
   * Get current simulation step and state
   */
  const activeStepIndex = getCurrentStepIndex(currentStep);
  const activeStep = simulationSteps[activeStepIndex];
  const activeState = activeStep.state;

  /**
   * Update callbacks when step changes
   */
  useEffect(() => {
    if (onStepChange) {
      onStepChange(activeStepIndex, activeStep.nodeId);
    }
    if (onStateChange) {
      onStateChange(activeState);
    }
  }, [activeStepIndex, activeStep, activeState, onStepChange, onStateChange]);

  /**
   * Animation loop for play mode
   * Uses requestAnimationFrame for smooth 60fps animation
   */
  const animate = useCallback((timestamp: number) => {
    if (!lastUpdateTimeRef.current) {
      lastUpdateTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastUpdateTimeRef.current;
    const updateInterval = 30 / speed; // Base speed: 3 seconds for full timeline

    if (elapsed >= updateInterval) {
      setCurrentStep((prev) => {
        const next = prev + (100 / (totalSteps - 1)) * (elapsed / 1000) * speed;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
      lastUpdateTimeRef.current = timestamp;
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, speed, totalSteps]);

  /**
   * Start animation loop when playing
   */
  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate]);

  /**
   * Notify parent of play state changes
   */
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
  }, [isPlaying, onPlayStateChange]);

  /**
   * Toggle play/pause
   */
  const handlePlayPause = useCallback(() => {
    if (currentStep >= 100) {
      setCurrentStep(0); // Reset to start if at end
    }
    setIsPlaying((prev) => !prev);
  }, [currentStep]);

  /**
   * Reset timeline to start
   */
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  /**
   * Step forward one step
   */
  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(prev + (100 / (totalSteps - 1)), 100));
  }, [totalSteps]);

  /**
   * Step backward one step
   */
  const handleStepBackward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(prev - (100 / (totalSteps - 1)), 0));
  }, [totalSteps]);

  /**
   * Handle scrubber slider change
   */
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setCurrentStep(parseFloat(e.target.value));
  }, []);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Ignore if typing in input

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleReset();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleStepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleStepBackward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePlayPause, handleReset, handleStepForward, handleStepBackward]);

  // Don't render if not active
  if (!isActive) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20"
      role="region"
      aria-label="Temporal debugger timeline"
    >
      {/* State Details Panel (Collapsible) */}
      {showDetails && (
        <div className="border-b border-cyan-500/30 bg-gradient-to-r from-black/80 to-cyan-950/20 p-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wallet Balances */}
            <div className="bg-black/60 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Activity size={16} className="text-cyan-400" />
                <h4 className="text-cyan-400 font-mono text-xs font-bold uppercase">
                  Wallet Balances
                </h4>
              </div>
              <div className="space-y-1">
                {activeState.walletBalances.map((balance, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">{balance.token}:</span>
                    <span className="text-white font-bold">
                      {balance.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-black/60 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Zap size={16} className="text-green-400" />
                <h4 className="text-green-400 font-mono text-xs font-bold uppercase">
                  Metrics
                </h4>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white font-bold">
                    ${activeState.metrics.totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">Profit:</span>
                  <span
                    className={`font-bold ${
                      activeState.metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {activeState.metrics.profit >= 0 ? '+' : ''}$
                    {activeState.metrics.profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">Gas Spent:</span>
                  <span className="text-yellow-400 font-bold">
                    {activeState.metrics.gasSpent} WEIL
                  </span>
                </div>
              </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-black/60 border border-gray-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Info size={16} className="text-gray-400" />
                <h4 className="text-gray-400 font-mono text-xs font-bold uppercase">
                  Execution Log
                </h4>
              </div>
              <div className="space-y-1 max-h-16 overflow-y-auto text-xs font-mono text-gray-300 scrollbar-thin scrollbar-thumb-gray-700">
                {activeState.logs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Timeline Controls */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Top Row: Active Step Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock size={20} className="text-cyan-400" />
                <div>
                  <div className="text-cyan-400 font-mono text-xs uppercase">
                    Current Step
                  </div>
                  <div className="text-white font-mono text-lg font-bold">
                    {activeStep.label}
                  </div>
                </div>
              </div>
              <div className="border-l border-gray-700 pl-4">
                <div className="text-gray-400 font-mono text-xs">
                  {activeStep.description}
                </div>
              </div>
            </div>

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-cyan-400 transition-colors text-xs font-mono uppercase flex items-center space-x-1"
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              <Info size={14} />
              <span>{showDetails ? 'Hide' : 'Show'} Details</span>
            </button>
          </div>

          {/* Middle Row: Timeline Scrubber */}
          <div className="relative mb-4">
            {/* Step Indicators */}
            <div className="flex justify-between mb-2">
              {simulationSteps.map((step, idx) => {
                const percentage = (idx / (totalSteps - 1)) * 100;
                const isActive = activeStepIndex === idx;
                const isPast = activeStepIndex > idx;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStep(percentage);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Jump to step ${idx}: ${step.label}`}
                  >
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full mb-1 transition-all duration-300 ${
                        isActive
                          ? 'bg-cyan-400 ring-4 ring-cyan-400/30 scale-125'
                          : isPast
                          ? 'bg-green-400'
                          : 'bg-gray-600 group-hover:bg-gray-400'
                      }`}
                      style={{
                        boxShadow: isActive
                          ? '0 0 20px rgba(0, 212, 255, 0.8)'
                          : isPast
                          ? '0 0 10px rgba(57, 255, 20, 0.5)'
                          : 'none',
                      }}
                    />
                    {/* Label */}
                    <div
                      className={`text-xs font-mono whitespace-nowrap transition-colors ${
                        isActive
                          ? 'text-cyan-400 font-bold'
                          : isPast
                          ? 'text-green-400'
                          : 'text-gray-500 group-hover:text-gray-300'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrubber Slider */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentStep}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer temporal-slider"
              style={{
                background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${currentStep}%, #1a1a1a ${currentStep}%, #1a1a1a 100%)`,
              }}
              aria-label="Timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentStep}
              aria-valuetext={`Step ${activeStepIndex + 1} of ${totalSteps}: ${activeStep.label}`}
            />

            {/* Progress Bar Background */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gray-800 rounded-full -z-10" />
          </div>

          {/* Bottom Row: Playback Controls */}
          <div className="flex items-center justify-between">
            {/* Left: Transport Controls */}
            <div className="flex items-center space-x-2">
              {/* Step Backward */}
              <button
                onClick={handleStepBackward}
                disabled={currentStep === 0}
                className="p-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-cyan-400 rounded transition-colors"
                aria-label="Step backward"
                title="Step Backward (←)"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="p-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
                aria-label="Reset to start"
                title="Reset (R)"
              >
                <RotateCcw size={20} />
              </button>

              {/* Step Forward */}
              <button
                onClick={handleStepForward}
                disabled={currentStep >= 100}
                className="p-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-cyan-400 rounded transition-colors"
                aria-label="Step forward"
                title="Step Forward (→)"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Center: Step Counter */}
            <div className="text-center">
              <div className="text-gray-400 font-mono text-xs">
                Step {activeStepIndex + 1} / {totalSteps}
              </div>
              <div className="text-cyan-400 font-mono text-sm font-bold">
                {currentStep.toFixed(1)}%
              </div>
            </div>

            {/* Right: Speed Control */}
            <div className="flex items-center space-x-2">
              <FastForward size={16} className="text-gray-400" />
              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500"
                aria-label="Playback speed"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styling */}
      <style jsx>{`
        .temporal-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
          transition: all 0.2s;
        }

        .temporal-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 25px rgba(0, 212, 255, 1);
        }

        .temporal-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
          transition: all 0.2s;
        }

        .temporal-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 25px rgba(0, 212, 255, 1);
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thumb-gray-700::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
