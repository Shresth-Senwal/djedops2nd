/**
 * Marketplace Hub Page
 * 
 * Entry point for the WeilChain Applet Protocol marketplace.
 * This page replaces the original DjedOPS landing page and serves
 * as the "App Store" hub for discovering and launching applets.
 * 
 * Route: /
 */

import AppletMarketplace from '@/components/AppletMarketplace'

export default function MarketplacePage() {
  return <AppletMarketplace />
}
