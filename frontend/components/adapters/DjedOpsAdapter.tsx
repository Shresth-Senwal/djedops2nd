/**
 * DjedOPS Adapter Component
 * 
 * Multi-Mode Adapter for the Djed Protocol Suite:
 * - "monitor" mode: Main dashboard (Reserve Ratio, Price, Status)
 * - "simulator" mode: Time Travel / Scenario Testing
 * - "sentinel" mode: Stress Testing / Developer Tools
 * 
 * Deep Linking: Passes viewMode to Dashboard to show only relevant sections.
 */

'use client'

import React from 'react'
import { WeilContext } from '@/lib/context/WeilContext'
import { WeilWalletConnection } from '@weilliptic/weil-sdk'
import Home from '@/app/page'

/**
 * Applet Mode Types (View Modes)
 */
export type DjedAppletMode = 'monitor' | 'simulator' | 'sentinel' | 'transactions' | 'arbitrage'

/**
 * Adapter Props
 */
export interface DjedOpsAdapterProps {
  wallet: WeilWalletConnection | null
  isConnected: boolean
  address: string | null
  activeAppletId?: string // Which applet was clicked
}

/**
 * DjedOPS Multi-Mode Adapter
 * 
 * Maps applet IDs to view modes and passes to Dashboard.
 * All modes share the same WeilContext for unified protocol experience.
 */
export function DjedOpsAdapter({ wallet, isConnected, address, activeAppletId }: DjedOpsAdapterProps) {
  // Map applet IDs to view modes
  const getViewMode = (appletId?: string): DjedAppletMode | undefined => {
    if (!appletId) return undefined // Show everything if no mode specified
    
    switch(appletId) {
      case 'djed_monitor':
      case 'djedops': // Legacy ID
        return 'monitor'
      case 'djed_sim':
        return 'simulator'
      case 'djed_sentinel':
        return 'sentinel'
      case 'djed_ledger':
        return 'transactions'
      case 'djed_arbitrage':
        return 'arbitrage'
      default:
        return undefined
    }
  }

  const viewMode = getViewMode(activeAppletId)

  return (
    <WeilContext.Provider value={{ wallet, isConnected, address }}>
      <div 
        className="djed-ops-container" 
        style={{ 
          width: '100%', 
          height: '100%',
          overflow: 'auto'
        }}
      >
        {/* Pass viewMode to Dashboard for conditional rendering */}
        <Home viewMode={viewMode} />
      </div>
    </WeilContext.Provider>
  )
}

export default DjedOpsAdapter
