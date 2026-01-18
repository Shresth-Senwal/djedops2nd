/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: components/WAuthConnect.tsx
 * PURPOSE: Connection button for Weilliptic wallet (WAuth)
 * 
 * This component provides a UI button for connecting to the Weilliptic wallet
 * browser extension. It displays connection status and wallet address when
 * connected.
 * 
 * FEATURES:
 * - Connect/disconnect button
 * - Shows truncated address when connected
 * - Loading state during connection
 * - Error messages
 * - Green pulse indicator when connected
 * 
 * USAGE:
 * ```tsx
 * import { WAuthConnect } from '@/components/WAuthConnect';
 * <WAuthConnect />
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import { motion } from 'framer-motion';
import { useWAuth } from '@/lib/hooks/useWAuth';

export type WAuthConnectProps = Record<string, never>;

/**
 * Truncate address for display
 * Example: 2832e1a6...6b482a
 */
function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * WAuthConnect Component
 * 
 * Button for connecting to Weilliptic wallet extension
 */
export function WAuthConnect({}: WAuthConnectProps) {
  const { isConnected, address, isLoading, error, connect, disconnect } = useWAuth();

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Log diagnostics before attempting connection
      if (typeof window !== 'undefined') {
        const win = window as any;
        console.log('=== WAuth Detection Diagnostics ===');
        console.log('window.WeilWallet:', win.WeilWallet);  // <- Check capital W
        console.log('window.wauth:', win.wauth);
        console.log('window.weilliptic:', win.weilliptic);
        console.log('window.weilWallet:', win.weilWallet);
        console.log('Available:', Object.keys(win).filter((k: string) => 
          k.toLowerCase().includes('weil') || k.toLowerCase().includes('wauth')
        ));
      }
      connect();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        className={`
          relative
          px-3 md:px-4 py-2 
          font-mono text-xs font-bold
          border-2 
          transition-all duration-200
          ${
            isConnected
              ? 'bg-transparent border-cyan-400 text-cyan-400'
              : 'bg-transparent border-cyan-400/50 text-cyan-400/70 hover:border-cyan-400 hover:text-cyan-400'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        {/* Cyan pulse indicator when connected */}
        {isConnected && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        )}
        
        <span className={isConnected ? 'ml-3' : ''}>
          {isLoading 
            ? 'CONNECTING...' 
            : isConnected && address
              ? `WEIL: ${truncateAddress(address)}`
              : 'CONNECT WAUTH'
          }
        </span>
      </motion.button>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full right-0 mt-2 w-80 z-50"
        >
          <div className="text-xs font-mono text-red-400 bg-red-950/95 border border-red-500/50 px-3 py-2 shadow-lg backdrop-blur">
            <div className="font-bold mb-1">⚠️ WAuth Not Connected</div>
            <div className="mb-2">{error}</div>
            <div className="text-red-300/70 text-[10px] space-y-1">
              <div>1. Install WAuth from Chrome Web Store</div>
              <div>2. Click WAuth icon in browser toolbar</div>
              <div>3. Unlock wallet and select account</div>
              <div>4. Refresh this page (Ctrl+Shift+R)</div>
              <div>5. Click "CONNECT WAUTH" again</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
