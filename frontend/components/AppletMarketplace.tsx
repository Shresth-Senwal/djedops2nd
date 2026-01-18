/**
 * AppletMarketplace Component
 * 
 * Main hub for the WeilChain Applet Protocol.
 * Displays available applets in a brutalist hacker aesthetic.
 * Handles wallet connection, access control, and applet launching.
 * 
 * Design Philosophy:
 * - Pure black (#000000) background
 * - Neon green (#00FF41) accents
 * - Monospace typography
 * - Terminal/command-line inspired UI
 * - Minimal borders, maximum information density
 */

'use client'

import { useState, useEffect } from 'react'
import { useWeilChain } from '@/lib/context/WeilChainContext'
import { useAppletRegistry } from '@/lib/hooks/useWeilWallet'
import DjedOpsAdapter from '@/components/adapters/DjedOpsAdapter'
import type { AppletMetadata } from '@/lib/weil-sdk'
import { APPLET_DEFINITIONS } from '@/lib/workflow-types'

/**
 * Marketplace Hub - Main landing page
 */
export default function AppletMarketplace() {
  const { isConnected, address, connect, isInstalled, error: walletError } = useWeilChain()
  const { applets, loading, error: registryError, loadMore, hasMore } = useAppletRegistry(isConnected)
  const [selectedApplet, setSelectedApplet] = useState<string | null>(null)
  const [purchasedApplets, setPurchasedApplets] = useState<Set<string>>(
    new Set(['djed_monitor', 'djed_sentinel', 'djed_ledger']) // Free applets
  )
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issue - only show dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Handle wallet connection
   */
  const handleConnect = async () => {
    console.log('Connect button clicked, isInstalled:', isInstalled, 'mockMode:', process.env.NEXT_PUBLIC_MOCK_CONTRACT)
    
    // Check if we're in mock mode
    const mockMode = process.env.NEXT_PUBLIC_MOCK_CONTRACT === 'true'
    
    if (!isInstalled && !mockMode) {
      // For hackathon demo: Show instructions instead of broken link
      alert(
        'WeilWallet Extension Required\n\n' +
        'Installation Options:\n' +
        '1. Contact WeilChain team for testnet wallet\n' +
        '2. GitHub: https://github.com/weilliptic-public/wadk.git\n' +
        '3. For demo: Enable mock mode in .env.local\n\n' +
        'Set NEXT_PUBLIC_MOCK_CONTRACT=true to test without wallet'
      )
      return
    }

    try {
      console.log('Calling connect()...')
      await connect()
      console.log('Connection successful!')
    } catch (err) {
      console.error('Connection failed:', err)
      alert('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  /**
   * Launch selected applet
   */
  const handleLaunchApplet = (appletId: string) => {
    setSelectedApplet(appletId)
  }

  /**
   * Handle purchase of paid applet
   */
  const handlePurchaseApplet = (appletId: string) => {
    // Simulate purchase transaction
    console.log(`[PURCHASE] Applet: ${appletId}`)
    setPurchasedApplets(prev => {
      const newSet = new Set(Array.from(prev))
      newSet.add(appletId)
      return newSet
    })
    alert(`✅ PURCHASE SUCCESSFUL\n\nApplet: ${appletId}\nCost: 5 WEIL\n\nYou can now launch this applet!`)
  }

  // If applet is selected, render it fullscreen
  if (selectedApplet) {
    return (
      <AppletViewer 
        appletId={selectedApplet} 
        onClose={() => setSelectedApplet(null)} 
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-[#00FF41] font-mono">
      {/* Header / Connection Bar */}
      <header className="border-b border-[#00FF41] p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold tracking-tighter">
            [WeilChain_Applet_Protocol]
          </div>
          <div className="text-sm opacity-70">
            v1.0.0-alpha
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/analytics"
            className="border border-[#FFD700] px-4 py-2 text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-colors text-sm font-bold"
            title="View Analytics Dashboard"
          >
            [📊 ANALYTICS]
          </a>
          
          <a
            href="/workflows"
            className="border-2 border-[#00D4FF] px-4 py-2 text-[#00D4FF] hover:bg-[#00D4FF] hover:text-black transition-colors text-sm font-bold"
            title="Open Workflow Composer"
          >
            [WORKFLOW_COMPOSER →]
          </a>
          
          {isConnected && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="border border-yellow-500 px-4 py-2 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors text-sm"
              title="Register your own applet on WeilChain"
            >
              [+ REGISTER_APPLET]
            </button>
          )}
          
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="border border-[#00FF41] px-6 py-2 hover:bg-[#00FF41] hover:text-black transition-colors"
              title={mounted && isInstalled ? 'Connect WeilWallet' : 'Get WeilWallet installation info'}
            >
              {mounted && isInstalled ? '[CONNECT_WALLET]' : '[GET_WALLET_INFO]'}
            </button>
          ) : (
            <div className="border border-[#00FF41] px-6 py-2">
              [CONNECTED: {address?.slice(0, 6)}...{address?.slice(-4)}]
            </div>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {(walletError || registryError) && (
        <div className="border-b border-red-500 bg-red-950 bg-opacity-20 p-4 text-red-500">
          [ERROR] {walletError || registryError}
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto p-8">
        {/* Title Section */}
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            {'>'} DECENTRALIZED_APPLET_REGISTRY
          </h1>
          <p className="text-lg opacity-80 max-w-3xl">
            On-chain application marketplace powered by WeilChain WASM contracts.
            <br />
            Discover, purchase, and launch decentralized applets directly from the blockchain.
          </p>
        </section>

        {/* Connection Required Message */}
        {!isConnected && (
          <div className="border border-[#00FF41] p-8 mb-8">
            <div className="text-2xl mb-4">[AUTHENTICATION_REQUIRED]</div>
            <p className="mb-6 opacity-80">
              Connect your WeilWallet to browse and access registered applets.
              <br />
              <span className="text-sm mt-2 block">Don't have WeilWallet? Enable mock mode for demo.</span>
            </p>
            <button
              onClick={handleConnect}
              className="border border-[#00FF41] px-8 py-3 hover:bg-[#00FF41] hover:text-black transition-colors"
            >
              {mounted && isInstalled ? 'INITIALIZE_CONNECTION' : 'GET_WALLET_INSTRUCTIONS'}
            </button>
          </div>
        )}

        {/* Applet Grid */}
        {isConnected && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                [AVAILABLE_APPLETS: {applets.length}]
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-sm opacity-70">
                  Workflows: ∞
                </div>
                <div className="text-sm opacity-70">
                  {loading ? '[LOADING...]' : '[READY]'}
                </div>
              </div>
            </div>

            {/* Workflow Composer Feature Card */}
            <div className="mb-6 border-2 border-[#00D4FF] bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">🔗</span>
                    <div>
                      <h3 className="text-xl font-bold text-[#00D4FF]">
                        WORKFLOW COMPOSER
                      </h3>
                      <div className="text-xs text-neutral-500">PLATFORM FEATURE</div>
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-4">
                    Chain multiple applets into automated multi-step workflows. Build complex logic with conditional branching, 
                    monitor execution history, and deploy workflows on-chain for auditability.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs border border-[#00D4FF] text-[#00D4FF] px-2 py-1">VISUAL_BUILDER</span>
                    <span className="text-xs border border-[#00D4FF] text-[#00D4FF] px-2 py-1">CONDITIONAL_LOGIC</span>
                    <span className="text-xs border border-[#00D4FF] text-[#00D4FF] px-2 py-1">ON_CHAIN_EXECUTION</span>
                    <span className="text-xs border border-[#00D4FF] text-[#00D4FF] px-2 py-1">AUDIT_TRAIL</span>
                  </div>
                </div>
                <a
                  href="/workflows"
                  className="bg-[#00D4FF] text-black px-6 py-3 font-bold text-sm hover:bg-[#00BBEE] transition-colors"
                >
                  [OPEN_COMPOSER →]
                </a>
              </div>
            </div>

            {loading && applets.length === 0 ? (
              <div className="border border-[#00FF41] p-12 text-center">
                <div className="animate-pulse">[QUERYING_REGISTRY...]</div>
              </div>
            ) : applets.length === 0 ? (
              <div className="border border-[#00FF41] p-12 text-center">
                <div className="mb-4">[NO_APPLETS_FOUND]</div>
                <p className="opacity-70">
                  Be the first to register an applet on WeilChain.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {applets.map((applet) => (
                  <AppletCard
                    key={applet.id}
                    applet={applet}
                    onLaunch={handleLaunchApplet}
                    onPurchase={handlePurchaseApplet}
                    isPurchased={purchasedApplets.has(applet.id)}
                  />
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !loading && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className="border border-[#00FF41] px-8 py-3 hover:bg-[#00FF41] hover:text-black transition-colors"
                >
                  [LOAD_MORE]
                </button>
              </div>
            )}
          </>
        )}

        {/* Stats Footer */}
        {isConnected && applets.length > 0 && (
          <footer className="mt-16 pt-8 border-t border-[#00FF41] opacity-60">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">
                  {applets.length}
                </div>
                <div className="text-sm">REGISTERED_APPLETS</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">
                  {applets.reduce((sum, a) => sum + a.total_installs, 0)}
                </div>
                <div className="text-sm">TOTAL_INSTALLS</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">
                  {applets.filter(a => a.access_fee === BigInt(0)).length}
                </div>
                <div className="text-sm">FREE_APPLETS</div>
              </div>
            </div>
          </footer>
        )}
      </main>

      {/* Register Applet Modal */}
      {showRegisterModal && (
        <RegisterAppletModal onClose={() => setShowRegisterModal(false)} />
      )}
    </div>
  )
}

/**
 * AppletCard Component
 * 
 * Displays individual applet information in brutalist card format.
 * Shows access fee, rating, installs, and launch/purchase button.
 * Supports locked state for paid applets.
 */
function AppletCard({ 
  applet, 
  onLaunch,
  onPurchase,
  isPurchased
}: { 
  applet: AppletMetadata
  onLaunch: (id: string) => void
  onPurchase: (id: string) => void
  isPurchased: boolean
}) {
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('1000');
  
  // Get staking data from APPLET_DEFINITIONS if it's a built-in applet
  const appletType = applet.id as any;
  const stakingData = (APPLET_DEFINITIONS as any)[appletType];
  const stakedAmount = stakingData?.stakedAmount || 0;
  const apy = stakingData?.apy || 0;
  
  const isPaid = applet.access_fee > BigInt(0);
  const isLocked = isPaid && !isPurchased;
  
  // Format TVL for display
  const formatTVL = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  };
  
  // Calculate daily rewards
  const calculateDailyRewards = (amount: number, apyPercent: number) => {
    return ((amount * apyPercent / 100) / 365).toFixed(2);
  };
  
  const handleStake = () => {
    setShowStakeModal(false);
    const dailyRewards = calculateDailyRewards(parseFloat(stakeAmount), apy);
    alert(
      `✅ STAKE SUCCESSFUL\\n\\n` +
      `Staked: ${stakeAmount} WEIL\\n` +
      `Applet: ${applet.name}\\n` +
      `Current APY: ${apy}%\\n` +
      `Daily Rewards: ${dailyRewards} WEIL\\n\\n` +
      `Your stake is now earning curator rewards!`
    );
  };
  
  return (
    <>
      <div className="border border-[#00FF41] p-6 hover:bg-[#00FF41] hover:bg-opacity-5 transition-colors group relative">
      {/* Locked Overlay for Paid Applets */}
      {isLocked && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-10 border border-yellow-500">
          <div className="text-center p-6">
            <div className="text-6xl mb-4">🔒</div>
            <div className="text-yellow-500 font-bold text-xl mb-2">[PREMIUM_APPLET]</div>
            <div className="text-[#00FF41] mb-4">Cost: {String(applet.access_fee)} WEIL</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPurchase(applet.id)
              }}
              className="border-2 border-yellow-500 px-6 py-3 hover:bg-yellow-500 hover:text-black transition-colors font-bold"
            >
              [PURCHASE_ACCESS]
            </button>
          </div>
        </div>
      )}

      {/* PROOF-OF-STAKE TVL BADGE */}
      {stakedAmount > 0 && (
        <div className="absolute top-4 right-4 z-20">
          <div 
            className="border-2 px-3 py-1 font-mono text-xs font-bold flex items-center gap-2"
            style={{
              borderColor: '#FFD700',
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)'
            }}
            title={`Total Value Locked: ${stakedAmount.toLocaleString()} WEIL`}
          >
            <span>💎</span>
            <span style={{ color: '#FFD700' }}>{formatTVL(stakedAmount)} WEIL</span>
          </div>
        </div>
      )}

      {/* Icon */}
      {applet.icon_uri && (
        <div className="w-16 h-16 mb-4 border border-[#00FF41] flex items-center justify-center">
          <img 
            src={applet.icon_uri} 
            alt={applet.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
          />
        </div>
      )}

      {/* Name */}
      <h3 className="text-xl font-bold mb-2 tracking-tight">
        [{applet.name.toUpperCase().replace(/\s+/g, '_')}]
      </h3>

      {/* Category */}
      <div className="text-sm mb-3 opacity-70">
        {applet.category}
      </div>

      {/* Description */}
      <p className="text-sm mb-4 opacity-80 line-clamp-3">
        {applet.description}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="border border-[#00FF41] border-opacity-30 p-2">
          <div className="opacity-60">FEE</div>
          <div className="font-bold">
            {applet.access_fee === BigInt(0) ? 'FREE' : `${applet.access_fee} WEI`}
          </div>
        </div>
        <div className="border border-[#00FF41] border-opacity-30 p-2">
          <div className="opacity-60">RATING</div>
          <div className="font-bold">
            {applet.rating > 0 ? `${applet.rating}/5` : 'N/A'}
          </div>
        </div>
        <div className="border border-[#00FF41] border-opacity-30 p-2">
          <div className="opacity-60">INSTALLS</div>
          <div className="font-bold">{applet.total_installs}</div>
        </div>
        <div className="border border-[#00FF41] border-opacity-30 p-2">
          <div className="opacity-60">STATUS</div>
          <div className="font-bold">
            {applet.is_active ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>
      </div>

      {/* CURATOR APY - Staking Rewards */}
      {apy > 0 && (
        <div 
          className="mb-4 border-2 p-3"
          style={{
            borderColor: '#FFD700',
            backgroundColor: 'rgba(255, 215, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs" style={{ color: '#FFD700' }}>
              🏆 CURATOR REWARDS
            </div>
            <div className="font-bold" style={{ color: '#FFD700' }}>
              {apy}% APY
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStakeModal(true);
            }}
            className="w-full border px-3 py-2 text-xs font-bold transition-all hover:opacity-90"
            style={{
              borderColor: '#FFD700',
              color: '#FFD700',
              backgroundColor: 'transparent'
            }}
          >
            [STAKE_TO_CURATE]
          </button>
        </div>
      )}

      {/* Launch Button */}
      <button
        onClick={() => onLaunch(applet.id)}
        disabled={!applet.is_active || isLocked}
        className="w-full border border-[#00FF41] py-3 hover:bg-[#00FF41] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {!applet.is_active ? '[UNAVAILABLE]' : isLocked ? '[LOCKED]' : '[LAUNCH]'}
      </button>

      {/* Author */}
      <div className="mt-3 text-xs opacity-50">
        by: {applet.author_address.slice(0, 8)}...
      </div>
    </div>

    {/* STAKING MODAL */}
    {showStakeModal && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
        onClick={() => setShowStakeModal(false)}
      >
        <div 
          className="border-2 bg-black p-8 max-w-md w-full"
          style={{
            borderColor: '#FFD700',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">💎</span>
            <div>
              <h3 className="text-xl font-bold font-mono" style={{ color: '#FFD700' }}>
                [STAKE_WEIL]
              </h3>
              <div className="text-xs text-neutral-500 font-mono">
                Proof-of-Stake Curation
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 border" style={{ borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' }}>
            <div className="text-sm font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Applet:</span>
                <span className="text-white">{applet.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Current TVL:</span>
                <span style={{ color: '#FFD700' }}>{stakedAmount.toLocaleString()} WEIL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Curator APY:</span>
                <span style={{ color: '#39FF14' }}>{apy}%</span>
              </div>
              <div className="flex justify-between border-t border-neutral-700 pt-2 mt-2">
                <span className="text-neutral-400">Est. Daily Rewards:</span>
                <span style={{ color: '#39FF14' }}>
                  {calculateDailyRewards(parseFloat(stakeAmount), apy)} WEIL
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-mono text-neutral-400 mb-2">
              Stake Amount (WEIL):
            </label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="1000"
              className="w-full bg-black border px-4 py-3 font-mono text-white"
              style={{ borderColor: '#FFD700' }}
            />
          </div>

          <div className="mb-6 p-3 bg-black border border-neutral-700 text-xs font-mono text-neutral-400">
            ℹ️ Staking signals trust in this applet. Higher TVL = Higher discovery rank.
            Earn {apy}% APY on your stake. Unstake anytime.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowStakeModal(false)}
              className="flex-1 border border-neutral-700 px-4 py-3 text-neutral-400 hover:bg-neutral-900 transition-colors font-mono text-sm"
            >
              [CANCEL]
            </button>
            <button
              onClick={handleStake}
              className="flex-1 px-4 py-3 font-mono text-sm font-bold transition-all"
              style={{
                backgroundColor: '#FFD700',
                color: 'black',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
              }}
            >
              [CONFIRM_STAKE]
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

/**
 * AppletViewer Component
 * 
 * Full-screen wrapper for rendering individual applets.
 * Passes applet ID to adapter for deep linking to specific views.
 */
function AppletViewer({ 
  appletId, 
  onClose 
}: { 
  appletId: string
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Navigation Bar */}
      <div className="border-b border-[#00FF41] p-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="border border-[#00FF41] px-4 py-2 hover:bg-[#00FF41] hover:text-black transition-colors"
        >
          {'<'} [BACK_TO_HUB]
        </button>

        <div className="text-sm opacity-70">
          [APPLET_ID: {appletId}]
        </div>
      </div>

      {/* Applet Content */}
      <div className="flex-1 overflow-auto">
        <DjedOPSApplet activeAppletId={appletId} />
      </div>
    </div>
  )
}

/**
 * DjedOPS Applet Wrapper
 * 
 * Renders the correct Djed Protocol Suite applet based on activeAppletId.
 * Receives wallet context from parent marketplace.
 */
function DjedOPSApplet({ activeAppletId }: { activeAppletId: string }) {
  const { wallet, address, isConnected } = useWeilChain()

  return (
    <div className="h-full bg-black">
      <DjedOpsAdapter 
        wallet={wallet} 
        isConnected={isConnected} 
        address={address}
        activeAppletId={activeAppletId}
      />
    </div>
  )
}

/**
 * RegisterAppletModal Component
 * 
 * Developer console for registering new applets on WeilChain.
 * Demonstrates the platform nature of the protocol.
 */
function RegisterAppletModal({ onClose }: { onClose: () => void }) {
  const [appletName, setAppletName] = useState('')
  const [wasmCID, setWasmCID] = useState('')
  const [price, setPrice] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate contract deployment
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Show success message
    alert(
      `🚀 APPLET DEPLOYED TO WEILCHAIN!\n\n` +
      `Name: ${appletName}\n` +
      `WASM CID: ${wasmCID}\n` +
      `Price: ${price} WEIL\n\n` +
      `Your applet is now live in the marketplace!`
    )

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
      <div className="border-2 border-[#00FF41] bg-black max-w-2xl w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#00FF41]">
            [REGISTER_APPLET]
          </h2>
          <button
            onClick={onClose}
            className="text-[#00FF41] hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Applet Name */}
          <div>
            <label className="block text-[#00FF41] mb-2 text-sm font-mono">
              APPLET_NAME:
            </label>
            <input
              type="text"
              value={appletName}
              onChange={(e) => setAppletName(e.target.value)}
              placeholder="My Awesome Applet"
              required
              className="w-full bg-black border border-[#00FF41] px-4 py-3 text-[#00FF41] font-mono focus:outline-none focus:border-white"
            />
          </div>

          {/* WASM CID */}
          <div>
            <label className="block text-[#00FF41] mb-2 text-sm font-mono">
              WASM_CONTRACT_CID:
            </label>
            <input
              type="text"
              value={wasmCID}
              onChange={(e) => setWasmCID(e.target.value)}
              placeholder="Qm... (IPFS/Arweave CID)"
              required
              className="w-full bg-black border border-[#00FF41] px-4 py-3 text-[#00FF41] font-mono focus:outline-none focus:border-white"
            />
            <p className="text-xs text-[#00FF41] opacity-60 mt-1">
              Must be a deployed WASM contract on WeilChain
            </p>
          </div>

          {/* Price */}
          <div>
            <label className="block text-[#00FF41] mb-2 text-sm font-mono">
              ACCESS_FEE (WEIL):
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              required
              className="w-full bg-black border border-[#00FF41] px-4 py-3 text-[#00FF41] font-mono focus:outline-none focus:border-white"
            />
            <p className="text-xs text-[#00FF41] opacity-60 mt-1">
              Set to 0 for free access
            </p>
          </div>

          {/* Info Box */}
          <div className="border border-yellow-500 bg-yellow-500 bg-opacity-5 p-4">
            <p className="text-sm text-yellow-500 font-mono">
              ⚠️ DEPLOYMENT NOTICE: This will execute a WeilChain transaction.
              Gas fees apply. Contract must be audited before mainnet deployment.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 border-2 border-[#00FF41] px-6 py-3 hover:bg-[#00FF41] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {isSubmitting ? '[DEPLOYING...]' : '[DEPLOY_TO_WEILCHAIN]'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-[#00FF41] px-6 py-3 hover:bg-red-500 hover:border-red-500 transition-colors"
            >
              [CANCEL]
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-6 pt-6 border-t border-[#00FF41] opacity-60">
          <p className="text-xs font-mono text-[#00FF41]">
            💡 TIP: Test your applet on testnet first. Visit docs.weilchain.io for deployment guide.
          </p>
        </div>
      </div>
    </div>
  )
}
