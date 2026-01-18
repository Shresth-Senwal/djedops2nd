/**
 * Client-side Provider Wrapper
 * 
 * This wrapper ensures environment variables are properly evaluated
 * in the client context for the WeilChainProvider.
 */

'use client'

import { ReactNode } from 'react'
import WeilChainProvider from '@/lib/context/WeilChainContext'

export function ClientProviders({ children }: { children: ReactNode }) {
  // Evaluate mock mode directly from environment (synchronous)
  // This ensures mockMode is set BEFORE WeilChainProvider initializes
  const mockMode = typeof window !== 'undefined' && 
                   process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true'

  console.log('🎭 Client Providers - Mock mode:', mockMode, 'env:', process.env.NEXT_PUBLIC_MOCK_CONTRACT)

  return (
    <WeilChainProvider mockMode={mockMode}>
      {children}
    </WeilChainProvider>
  )
}
