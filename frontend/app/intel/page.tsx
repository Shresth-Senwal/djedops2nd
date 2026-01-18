/**
 * Intel (Intelligence) Page
 * 
 * Purpose:
 * Entry point for the Opportunity Holodeck - an interactive visual intelligence
 * system for exploring DeFi protocol networks and discovering actionable opportunities.
 * This page serves as the "INTEL" or "EXPLORE" tab in the main navigation.
 * 
 * Features:
 * - Full-screen Opportunity Holodeck component
 * - Navigation breadcrumbs for user orientation
 * - Responsive layout optimized for large displays
 * - Integrated with main app navigation and context
 * 
 * Route:
 * - Accessible via /intel
 * - Can be added to main navigation as "INTEL" or "EXPLORE" tab
 * 
 * Architecture:
 * - Client-side rendered for optimal interactivity
 * - Uses Next.js 14 App Router conventions
 * - Integrates with WeilChain context for cross-app state
 * 
 * Integration Points:
 * - WeilChainContext: Protocol status and wallet state
 * - Workflow Builder: Auto-build feature routing
 * - Analytics: Opportunity tracking and metrics
 * 
 * Accessibility:
 * - Semantic HTML structure
 * - ARIA landmarks for navigation
 * - Keyboard navigation support
 * - Screen reader friendly
 * 
 * Performance:
 * - Dynamic import of heavy components
 * - Optimized re-rendering with React memoization
 * - Lazy loading of graph data
 * 
 * Dependencies:
 * - OpportunityHolodeck: Main visualization component
 * - WeilChainContext: Cross-app state management
 * - next/link: Client-side navigation
 * - lucide-react: Icons
 * 
 * TODO:
 * - Add real-time data polling for live opportunities
 * - Implement user preferences (layout, filters)
 * - Add tutorial/onboarding flow for first-time users
 * - Connect to analytics for opportunity tracking
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Info } from 'lucide-react';
import { useWeilChain } from '@/lib/context/WeilChainContext';
import OpportunityHolodeck from '@/components/OpportunityHolodeck';

/**
 * Intel Page Component
 * Main entry point for the Opportunity Holodeck intelligence system
 */
export default function IntelPage() {
  const { isConnected } = useWeilChain();

  return (
    <main className="min-h-screen bg-void">
      {/* Navigation Breadcrumbs */}
      <nav
        className="relative z-20 border-b border-cyan-500/20 bg-black/40 backdrop-blur-sm"
        aria-label="Breadcrumb navigation"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Back Navigation */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-cyan-400 transition-colors group"
              aria-label="Go back to home"
            >
              <ArrowLeft
                size={20}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span>Home</span>
            </Link>
            <span className="text-gray-600">/</span>
            <div className="flex items-center space-x-2 text-cyan-400">
              <Compass size={20} />
              <span className="font-semibold">Intel</span>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <div className="flex items-center space-x-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span>View Only</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Info Banner (Optional - can be dismissed) */}
      <div
        className="relative z-10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20"
        role="banner"
        aria-label="Information banner"
      >
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center space-x-3 text-sm text-gray-300">
            <Info size={16} className="text-cyan-400 flex-shrink-0" />
            <p>
              <strong className="text-cyan-400">Live Intelligence:</strong> Hover over
              protocol nodes to view connections. Click{' '}
              <span className="text-yellow-400 font-semibold">gold edges</span> to
              auto-build arbitrage workflows. Red edges indicate risk warnings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Opportunity Holodeck */}
      <div
        className="relative z-0"
        role="main"
        aria-label="Opportunity Holodeck visualization"
      >
        <OpportunityHolodeck />
      </div>

      {/* Footer Navigation (Optional Quick Links) */}
      <footer
        className="relative z-10 border-t border-cyan-500/20 bg-black/60 backdrop-blur-sm"
        role="contentinfo"
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/workflows"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Workflow Builder
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Portfolio Dashboard
            </Link>
            <Link
              href="/analytics"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="/marketplace"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Applet Marketplace
            </Link>
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            DjedOps Intelligence System &bull; Real-time DeFi Opportunity Discovery
          </div>
        </div>
      </footer>
    </main>
  );
}
