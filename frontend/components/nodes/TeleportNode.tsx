'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Repeat, Zap, ArrowRight, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Chain, CHAIN_CONFIGS, BridgeStatus } from '@/lib/workflow-types';

/**
 * TeleportNode Component
 * 
 * Specialized bridge node for cross-chain asset transfers with portal aesthetic.
 * Features:
 * - Dual-chain selector (source → destination)
 * - Token and amount configuration
 * - Real-time bridging status display
 * - Cost and time estimates
 * - Distinctive portal visual design
 * 
 * Visual Design:
 * - Gradient border with rotating animation
 * - Circular shape distinct from rectangular nodes
 * - Magenta/purple color scheme (#FF00FF)
 * - Particle effects during bridging state
 */

interface TeleportNodeProps {
  /** Node ID for workflow builder integration */
  nodeId: string;
  
  /** Source chain configuration */
  sourceChain?: Chain;
  
  /** Destination chain configuration */
  destinationChain?: Chain;
  
  /** Token symbol being bridged (e.g., 'USDC', 'WEIL') */
  tokenSymbol?: string;
  
  /** Amount to bridge in token units */
  amount?: number;
  
  /** Current bridging operation status */
  bridgeStatus?: BridgeStatus;
  
  /** Estimated bridging time in seconds */
  estimatedTime?: number;
  
  /** Bridge fee in USD */
  fee?: number;
  
  /** Callback when chain configuration changes */
  onConfigChange?: (config: {
    sourceChain: Chain;
    destinationChain: Chain;
    tokenSymbol: string;
    amount: number;
  }) => void;
  
  /** Whether node is selected in workflow builder */
  isSelected?: boolean;
  
  /** Whether node is active in simulation mode */
  isActive?: boolean;
}

export const TeleportNode: React.FC<TeleportNodeProps> = ({
  nodeId,
  sourceChain = 'weilchain',
  destinationChain = 'ethereum',
  tokenSymbol = 'USDC',
  amount = 100,
  bridgeStatus = 'pending',
  estimatedTime = 300, // 5 minutes default
  fee = 2.5,
  onConfigChange,
  isSelected = false,
  isActive = false,
}) => {
  const [localSourceChain, setLocalSourceChain] = useState<Chain>(sourceChain);
  const [localDestChain, setLocalDestChain] = useState<Chain>(destinationChain);
  const [localToken, setLocalToken] = useState(tokenSymbol);
  const [localAmount, setLocalAmount] = useState(amount);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Get chain metadata from configurations
  const sourceConfig = CHAIN_CONFIGS[localSourceChain];
  const destConfig = CHAIN_CONFIGS[localDestChain];

  // Handle configuration changes
  const handleApplyConfig = () => {
    if (onConfigChange) {
      onConfigChange({
        sourceChain: localSourceChain,
        destinationChain: localDestChain,
        tokenSymbol: localToken,
        amount: localAmount,
      });
    }
    setIsConfigOpen(false);
  };

  // Compute bridging status display
  const getStatusDisplay = () => {
    switch (bridgeStatus) {
      case 'pending':
        return { text: 'Ready to Bridge', color: '#FFD700', icon: Clock };
      case 'bridging':
        return { text: `Bridging... (${Math.floor(estimatedTime / 60)}m ${estimatedTime % 60}s)`, color: '#FF00FF', icon: Zap };
      case 'completed':
        return { text: 'Bridge Complete', color: '#39FF14', icon: Zap };
      case 'failed':
        return { text: 'Bridge Failed', color: '#FF4444', icon: AlertCircle };
      default:
        return { text: 'Unknown', color: '#888888', icon: AlertCircle };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="relative inline-block">
      {/* Portal Node Container - Circular with gradient border */}
      <motion.div
        className="relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: isActive ? 1.05 : 1, 
          opacity: 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Outer rotating gradient border */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-[3px]"
          animate={{
            rotate: bridgeStatus === 'bridging' ? 360 : 0,
          }}
          transition={{
            duration: 3,
            repeat: bridgeStatus === 'bridging' ? Infinity : 0,
            ease: 'linear',
          }}
          style={{
            filter: isActive ? 'brightness(1.3) drop-shadow(0 0 12px rgba(255, 0, 255, 0.6))' : 'brightness(1)',
          }}
        >
          {/* Inner circular node */}
          <div
            className={`relative h-full w-full rounded-full bg-black/90 backdrop-blur-sm ${
              isSelected ? 'ring-2 ring-cyan-400' : ''
            }`}
          >
            {/* Node content - 200px diameter */}
            <div className="flex h-[200px] w-[200px] flex-col items-center justify-center p-4 text-center">
              {/* Icon and title */}
              <div className="mb-2 flex items-center gap-2">
                <Repeat className="h-6 w-6 text-purple-400" />
                <span className="text-sm font-bold text-purple-300">TELEPORTER</span>
              </div>

              {/* Chain flow visualization */}
              <div className="mb-3 flex items-center gap-2">
                {/* Source chain badge */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: sourceConfig.color + '20', color: sourceConfig.color }}
                >
                  <span>{sourceConfig.icon}</span>
                  <span>{sourceConfig.name}</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-gray-400" />

                {/* Destination chain badge */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: destConfig.color + '20', color: destConfig.color }}
                >
                  <span>{destConfig.icon}</span>
                  <span>{destConfig.name}</span>
                </div>
              </div>

              {/* Token and amount */}
              <div className="mb-2 text-lg font-bold text-white">
                {localAmount.toLocaleString()} {localToken}
              </div>

              {/* Status indicator */}
              <div
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: statusDisplay.color }}
              >
                <StatusIcon className="h-3 w-3" />
                <span>{statusDisplay.text}</span>
              </div>

              {/* Fee and time estimate */}
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.floor(estimatedTime / 60)}m</span>
                </div>
              </div>

              {/* Configure button */}
              <button
                onClick={() => setIsConfigOpen(true)}
                className="mt-2 rounded-md bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                Configure
              </button>
            </div>
          </div>
        </motion.div>

        {/* Particle effects during bridging (optional enhancement) */}
        {bridgeStatus === 'bridging' && (
          <div className="pointer-events-none absolute inset-0">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-2 w-2 rounded-full bg-purple-400"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [0, Math.cos((i * Math.PI * 2) / 8) * 100],
                  y: [0, Math.sin((i * Math.PI * 2) / 8) * 100],
                  opacity: [1, 0],
                  scale: [1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsConfigOpen(false)}
        >
          <motion.div
            className="w-[500px] rounded-lg border border-purple-500/30 bg-black/95 p-6 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="mb-4 flex items-center gap-2 border-b border-gray-700 pb-3">
              <Repeat className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Configure Teleporter</h3>
            </div>

            {/* Source Chain Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Source Chain
              </label>
              <select
                value={localSourceChain}
                onChange={(e) => setLocalSourceChain(e.target.value as Chain)}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {Object.entries(CHAIN_CONFIGS).map(([chainId, config]) => (
                  <option key={chainId} value={chainId}>
                    {config.icon} {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Chain Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Destination Chain
              </label>
              <select
                value={localDestChain}
                onChange={(e) => setLocalDestChain(e.target.value as Chain)}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {Object.entries(CHAIN_CONFIGS).map(([chainId, config]) => (
                  <option key={chainId} value={chainId}>
                    {config.icon} {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Token Symbol */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Token Symbol
              </label>
              <input
                type="text"
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder="USDC"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Amount
              </label>
              <input
                type="number"
                value={localAmount}
                onChange={(e) => setLocalAmount(Number(e.target.value))}
                placeholder="100"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Bridge info display */}
            <div className="mb-4 rounded-md bg-purple-500/10 p-3 text-sm">
              <div className="mb-1 flex justify-between text-gray-300">
                <span>Estimated Time:</span>
                <span className="font-medium text-white">{Math.floor(estimatedTime / 60)} minutes</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Bridge Fee:</span>
                <span className="font-medium text-white">${fee.toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="flex-1 rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyConfig}
                className="flex-1 rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
              >
                Apply Configuration
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TeleportNode;
