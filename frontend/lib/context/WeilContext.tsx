/**
 * Weil Wallet Context
 * 
 * Simple context for passing WeilWallet to legacy DjedOPS components
 * without rewriting every file.
 */

'use client'

import { createContext, useContext } from 'react'
import { WeilWalletConnection } from '@weilliptic/weil-sdk'

export interface WeilContextValue {
  wallet: WeilWalletConnection | null
  isConnected: boolean
  address: string | null
}

export const WeilContext = createContext<WeilContextValue>({
  wallet: null,
  isConnected: false,
  address: null,
})

export const useWeil = () => useContext(WeilContext)
