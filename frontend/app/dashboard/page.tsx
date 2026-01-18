/**
 * Master Dashboard Page
 * 
 * Unified command center for Djed Ops portfolio management and optimization.
 * Aggregates data from all platform modules to provide a comprehensive overview
 * of portfolio health, risks, opportunities, and recent activity.
 * 
 * Features:
 * - Real-time KPI monitoring (Portfolio Value, Monthly Earnings, Risk Score, Total Savings)
 * - Actionable Alerts with deep-links to relevant modules
 * - Recent Activity Feed from all platform operations
 * - Quick access navigation to specialized modules
 * - Production-grade, function-first design
 * 
 * Data Sources:
 * - Yield Positions: `yield_positions`, `yield_history` (localStorage)
 * - Liquidation Tracking: `liquidation_positions` (localStorage)
 * - Workflow Execution: getExecutionHistory() (workflow-engine)
 * - Deployment Receipts: workflow execution logs with gas/slippage/MEV data
 * - Automation Rules: `yield_rules` (localStorage)
 * - Gas Settings: `workflow_gas_speed` (localStorage)
 * - Route Selection: `workflow_selected_route` (localStorage)
 * - MEV Protection: `workflow_mev_strategy` (localStorage)
 * 
 * KPI Calculations:
 * - Portfolio Value: Sum of all yield position deposits + workflow capital
 * - Monthly Earnings: Sum of (position × APY) / 12 across all yield positions
 * - Risk Score: Weighted score based on at-risk liquidation positions
 * - Total Savings: Aggregated gas + slippage + MEV savings from execution history
 * 
 * Alert Logic:
 * - Liquidation Danger: Any position with health ratio < 120%
 * - Low APY Pool: Any position below minimum APY threshold
 * - Slippage Savings: Recent executions with suboptimal route selection
 * - MEV Not Enabled: Recent deployments without MEV protection
 * 
 * Activity Feed:
 * - Workflow deployments and executions
 * - Yield rebalancing operations
 * - Liquidation position adjustments
 * - Route optimizations
 * - MEV protection activations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeilChain } from '@/lib/context/WeilChainContext';
import { getExecutionHistory } from '@/lib/workflow-engine';

/**
 * Activity event interface for unified activity feed
 */
interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'workflow' | 'yield' | 'liquidation' | 'gas' | 'slippage' | 'mev';
  title: string;
  description: string;
  amount?: number;
  txHash?: string;
  link?: string;
}

/**
 * Alert interface for actionable items
 */
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  link: string;
}

/**
 * KPI data interface
 */
interface DashboardKPIs {
  portfolioValue: number;
  monthlyEarnings: number;
  riskScore: number;
  totalSavings: number;
  atRiskCount: number;
}

/**
 * Yield position interface
 */
interface YieldPosition {
  id: string;
  protocol: string;
  asset: string;
  depositUSD: number;
  apy: number;
  timestamp?: number;
}

/**
 * Yield history entry interface
 */
interface YieldHistoryEntry {
  id?: string;
  timestamp: number;
  actions?: Array<unknown>;
  projectedMonthlyGain?: number;
  totalMoved?: number;
  txHash?: string;
}

/**
 * Liquidation position interface
 */
interface LiquidationPosition {
  id: string;
  protocol: string;
  asset: string;
  collateralUSD: number;
  debtUSD: number;
  lastAdjusted?: number;
}

/**
 * Workflow execution interface
 */
interface WorkflowExecution {
  id?: string;
  timestamp: number;
  status?: string;
  nodes?: Array<unknown>;
  gasSaved?: number;
  slippageSaved?: number;
  mevSaved?: number;
  mevProtection?: {
    strategy: string;
  };
  route?: {
    slippage: number;
  };
  txHash?: string;
}

/**
 * Yield automation rules interface
 */
interface YieldRules {
  minAPYThreshold: number;
  autoCompound: boolean;
}

/**
 * Calculate monthly earnings from a position
 */
function calculateMonthlyEarnings(depositUSD: number, apy: number): number {
  return (depositUSD * (apy / 100)) / 12;
}

/**
 * Get risk score color
 */
function getRiskScoreColor(score: number): string {
  if (score >= 80) return '#39FF14'; // Safe
  if (score >= 50) return '#FFD700'; // Caution
  return '#FF4444'; // Danger
}

/**
 * Get severity color
 */
function getSeverityColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'critical':
      return '#FF4444';
    case 'warning':
      return '#FFD700';
    case 'info':
      return '#00D4FF';
  }
}

/**
 * Master Dashboard Component
 */
export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, address } = useWeilChain();
  const [kpis, setKpis] = useState<DashboardKPIs>({
    portfolioValue: 0,
    monthlyEarnings: 0,
    riskScore: 100,
    totalSavings: 0,
    atRiskCount: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load and aggregate all platform data
   */
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Main data loading function
   */
  function loadDashboardData() {
    setIsLoading(true);

    // Load yield positions
    const yieldPositions = loadYieldPositions();
    const yieldHistory = loadYieldHistory();
    
    // Load liquidation positions
    const liquidationPositions = loadLiquidationPositions();
    
    // Load workflow execution history
    const workflowHistory = getExecutionHistory();
    
    // Load automation rules
    const yieldRules = loadYieldRules();
    
    // Calculate KPIs
    const calculatedKPIs = calculateKPIs(
      yieldPositions,
      liquidationPositions,
      workflowHistory
    );
    setKpis(calculatedKPIs);

    // Generate alerts
    const generatedAlerts = generateAlerts(
      yieldPositions,
      liquidationPositions,
      workflowHistory,
      yieldRules
    );
    setAlerts(generatedAlerts);

    // Build activity feed
    const activityFeed = buildActivityFeed(
      yieldHistory,
      liquidationPositions,
      workflowHistory
    );
    setActivities(activityFeed);

    setIsLoading(false);
  }

  /**
   * Load yield positions from localStorage
   */
  function loadYieldPositions() {
    try {
      const stored = localStorage.getItem('yield_positions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load yield history from localStorage
   */
  function loadYieldHistory() {
    try {
      const stored = localStorage.getItem('yield_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load liquidation positions from localStorage
   */
  function loadLiquidationPositions() {
    try {
      const stored = localStorage.getItem('liquidation_positions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load yield automation rules from localStorage
   */
  function loadYieldRules() {
    try {
      const stored = localStorage.getItem('yield_rules');
      return stored ? JSON.parse(stored) : { minAPYThreshold: 6.0, autoCompound: true };
    } catch {
      return { minAPYThreshold: 6.0, autoCompound: true };
    }
  }

  /**
   * Calculate all KPIs from aggregated data
   */
  function calculateKPIs(
    yieldPositions: YieldPosition[],
    liquidationPositions: LiquidationPosition[],
    workflowHistory: WorkflowExecution[]
  ): DashboardKPIs {
    // Portfolio value: sum of yield deposits + liquidation collateral
    const yieldValue = yieldPositions.reduce((sum, pos) => sum + (pos.depositUSD || 0), 0);
    const collateralValue = liquidationPositions.reduce((sum, pos) => sum + (pos.collateralUSD || 0), 0);
    const portfolioValue = yieldValue + collateralValue;

    // Monthly earnings from yield positions
    const monthlyEarnings = yieldPositions.reduce((sum, pos) => 
      sum + calculateMonthlyEarnings(pos.depositUSD || 0, pos.apy || 0), 0
    );

    // Risk score based on liquidation positions
    const dangerPositions = liquidationPositions.filter((pos: LiquidationPosition) => {
      const ratio = pos.collateralUSD / pos.debtUSD;
      return ratio < 1.2; // Below 120% health ratio
    });
    const cautionPositions = liquidationPositions.filter((pos: LiquidationPosition) => {
      const ratio = pos.collateralUSD / pos.debtUSD;
      return ratio >= 1.2 && ratio < 1.5; // 120-150% health ratio
    });
    
    // Risk score: 100 (perfect) - penalties for at-risk positions
    let riskScore = 100;
    riskScore -= dangerPositions.length * 30; // -30 per danger position
    riskScore -= cautionPositions.length * 10; // -10 per caution position
    riskScore = Math.max(0, riskScore); // Floor at 0

    // Total savings from workflow executions (gas + slippage + MEV)
    const totalSavings = workflowHistory.reduce((sum, exec) => {
      const gasSaved = exec.gasSaved || 0;
      const slippageSaved = exec.slippageSaved || 0;
      const mevSaved = exec.mevSaved || 0;
      return sum + gasSaved + slippageSaved + mevSaved;
    }, 0);

    return {
      portfolioValue,
      monthlyEarnings,
      riskScore,
      totalSavings,
      atRiskCount: dangerPositions.length + cautionPositions.length,
    };
  }

  /**
   * Generate actionable alerts based on platform data
   */
  function generateAlerts(
    yieldPositions: YieldPosition[],
    liquidationPositions: LiquidationPosition[],
    workflowHistory: WorkflowExecution[],
    yieldRules: YieldRules
  ): Alert[] {
    const alerts: Alert[] = [];

    // Check for liquidation danger
    const dangerPositions = liquidationPositions.filter((pos: LiquidationPosition) => {
      const ratio = pos.collateralUSD / pos.debtUSD;
      return ratio < 1.2;
    });
    if (dangerPositions.length > 0) {
      alerts.push({
        id: 'alert_liquidation_danger',
        severity: 'critical',
        title: 'Liquidation Risk Detected',
        description: `${dangerPositions.length} position${dangerPositions.length !== 1 ? 's' : ''} below 120% health ratio - immediate action required`,
        action: 'Manage Positions',
        link: '/analytics?tab=risk',
      });
    }

    // Check for low APY pools
    const lowAPYPositions = yieldPositions.filter(
      (pos: YieldPosition) => pos.apy < yieldRules.minAPYThreshold
    );
    if (lowAPYPositions.length > 0) {
      const potentialGain = lowAPYPositions.reduce((sum, pos) => {
        const currentMonthly = calculateMonthlyEarnings(pos.depositUSD, pos.apy);
        const targetMonthly = calculateMonthlyEarnings(pos.depositUSD, yieldRules.minAPYThreshold);
        return sum + (targetMonthly - currentMonthly);
      }, 0);

      alerts.push({
        id: 'alert_low_apy',
        severity: 'warning',
        title: 'Yield Optimization Opportunity',
        description: `${lowAPYPositions.length} position${lowAPYPositions.length !== 1 ? 's' : ''} below ${yieldRules.minAPYThreshold}% APY threshold - potential +$${potentialGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`,
        action: 'Rebalance Now',
        link: '/analytics?tab=yield',
      });
    }

    // Check recent executions for suboptimal slippage
    const recentExecutions = workflowHistory.slice(0, 5);
    const suboptimalSlippage = recentExecutions.filter((exec: WorkflowExecution) => 
      !exec.route || exec.route.slippage > 2.0
    );
    if (suboptimalSlippage.length > 0) {
      alerts.push({
        id: 'alert_slippage',
        severity: 'info',
        title: 'Slippage Optimization Available',
        description: `Recent executions could save ~$${(suboptimalSlippage.length * 150).toLocaleString()} with optimized routing`,
        action: 'Optimize Routes',
        link: '/workflows',
      });
    }

    // Check for MEV protection not enabled
    const recentWithoutMEV = recentExecutions.filter((exec: WorkflowExecution) => 
      !exec.mevProtection || exec.mevProtection.strategy === 'None'
    );
    if (recentWithoutMEV.length > 0 && recentWithoutMEV.length >= 3) {
      alerts.push({
        id: 'alert_mev',
        severity: 'warning',
        title: 'MEV Protection Disabled',
        description: `${recentWithoutMEV.length} recent deployment${recentWithoutMEV.length !== 1 ? 's' : ''} without MEV protection - potential front-running risk`,
        action: 'Enable Protection',
        link: '/workflows',
      });
    }

    // Sort by severity
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Build unified activity feed from all data sources
   */
  function buildActivityFeed(
    yieldHistory: YieldHistoryEntry[],
    liquidationPositions: LiquidationPosition[],
    workflowHistory: WorkflowExecution[]
  ): ActivityEvent[] {
    const events: ActivityEvent[] = [];

    // Add yield rebalancing events
    yieldHistory.forEach((entry: YieldHistoryEntry) => {
      events.push({
        id: entry.id || `yield_${entry.timestamp}`,
        timestamp: entry.timestamp,
        type: 'yield',
        title: 'Yield Rebalancing Executed',
        description: `Rebalanced ${entry.actions?.length || 0} position${entry.actions?.length !== 1 ? 's' : ''} • +$${(entry.projectedMonthlyGain || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`,
        amount: entry.totalMoved,
        txHash: entry.txHash,
        link: '/analytics?tab=yield',
      });
    });

    // Add workflow executions
    workflowHistory.forEach((exec: WorkflowExecution) => {
      const savings = (exec.gasSaved || 0) + (exec.slippageSaved || 0) + (exec.mevSaved || 0);
      events.push({
        id: exec.id || `workflow_${exec.timestamp}`,
        timestamp: exec.timestamp,
        type: 'workflow',
        title: exec.status === 'success' ? 'Workflow Deployed' : 'Workflow Execution',
        description: `${exec.nodes?.length || 0} node${exec.nodes?.length !== 1 ? 's' : ''} • ${savings > 0 ? `$${savings.toLocaleString(undefined, { maximumFractionDigits: 0 })} saved` : 'Executed'}`,
        txHash: exec.txHash,
        link: '/workflows',
      });
    });

    // Add liquidation adjustments (mock from position history)
    liquidationPositions.forEach((pos: LiquidationPosition) => {
      if (pos.lastAdjusted) {
        events.push({
          id: `liquidation_${pos.id}_${pos.lastAdjusted}`,
          timestamp: pos.lastAdjusted,
          type: 'liquidation',
          title: 'Position Adjusted',
          description: `${pos.protocol} ${pos.asset} • Health ratio: ${((pos.collateralUSD / pos.debtUSD) * 100).toFixed(1)}%`,
          link: '/analytics?tab=risk',
        });
      }
    });

    // Sort by timestamp descending and take last 10
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }

  /**
   * Navigate to alert link
   */
  function handleAlertAction(alert: Alert) {
    router.push(alert.link);
  }

  /**
   * Get activity type icon
   */
  function getActivityIcon(type: ActivityEvent['type']): string {
    switch (type) {
      case 'workflow':
        return '⚙️';
      case 'yield':
        return '💰';
      case 'liquidation':
        return '🛡️';
      case 'gas':
        return '⛽';
      case 'slippage':
        return '📊';
      case 'mev':
        return '🔒';
    }
  }

  /**
   * Format timestamp as relative time
   */
  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#39FF14]/30">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#39FF14] font-mono mb-2">
                [MASTER_DASHBOARD]
              </h1>
              <p className="text-neutral-400 font-mono text-sm">
                Unified portfolio command center • Real-time risk monitoring & optimization
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="border border-[#39FF14] text-[#39FF14] px-4 py-2 font-mono text-sm hover:bg-[#39FF14]/10 transition-colors"
            >
              [REFRESH]
            </button>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="border-b border-yellow-500/30 bg-yellow-900/20">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="text-yellow-300 font-mono text-sm">
                Connect wallet to view personalized portfolio data
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Portfolio Value */}
          <div className="border-2 border-[#39FF14] bg-[#39FF14]/5 p-6">
            <div className="text-sm text-neutral-400 font-mono mb-2 flex items-center gap-2">
              <span>💼</span>
              <span>PORTFOLIO VALUE</span>
            </div>
            <div className="text-3xl font-bold text-white font-mono mb-1">
              ${kpis.portfolioValue.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              Across {loadYieldPositions().length + loadLiquidationPositions().length} positions
            </div>
          </div>

          {/* Monthly Earnings */}
          <div className="border-2 border-[#FFD700] bg-[#FFD700]/5 p-6">
            <div className="text-sm text-neutral-400 font-mono mb-2 flex items-center gap-2">
              <span>💰</span>
              <span>MONTHLY EARNINGS</span>
            </div>
            <div className="text-3xl font-bold text-[#FFD700] font-mono mb-1">
              ${kpis.monthlyEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              ${(kpis.monthlyEarnings * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/year projected
            </div>
          </div>

          {/* Risk Score */}
          <div 
            className="border-2 p-6"
            style={{ 
              borderColor: getRiskScoreColor(kpis.riskScore),
              backgroundColor: `${getRiskScoreColor(kpis.riskScore)}10`
            }}
          >
            <div className="text-sm text-neutral-400 font-mono mb-2 flex items-center gap-2">
              <span>🛡️</span>
              <span>RISK SCORE</span>
            </div>
            <div 
              className="text-3xl font-bold font-mono mb-1"
              style={{ color: getRiskScoreColor(kpis.riskScore) }}
            >
              {kpis.riskScore}/100
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              {kpis.atRiskCount > 0 
                ? `${kpis.atRiskCount} position${kpis.atRiskCount !== 1 ? 's' : ''} at risk`
                : 'All positions healthy'
              }
            </div>
          </div>

          {/* Total Savings */}
          <div className="border-2 border-[#00D4FF] bg-[#00D4FF]/5 p-6">
            <div className="text-sm text-neutral-400 font-mono mb-2 flex items-center gap-2">
              <span>💵</span>
              <span>TOTAL SAVINGS</span>
            </div>
            <div className="text-3xl font-bold text-[#00D4FF] font-mono mb-1">
              ${kpis.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              Gas + Slippage + MEV optimizations
            </div>
          </div>
        </div>

        {/* Actionable Alerts */}
        {alerts.length > 0 && (
          <div className="border-2 border-[#FF9500] bg-[#FF9500]/5 p-6 mb-8">
            <h2 className="text-xl font-bold text-[#FF9500] font-mono mb-4 flex items-center gap-2">
              <span>🚨</span>
              <span>ACTIONABLE ALERTS</span>
              <span className="text-sm bg-[#FF9500] text-black px-2 py-1">
                {alerts.length}
              </span>
            </h2>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border bg-black p-4 flex items-center justify-between"
                  style={{ borderColor: getSeverityColor(alert.severity) }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getSeverityColor(alert.severity) }}
                      />
                      <div
                        className="font-mono font-bold text-sm"
                        style={{ color: getSeverityColor(alert.severity) }}
                      >
                        {alert.title}
                      </div>
                      <div className="text-xs text-neutral-600 font-mono uppercase">
                        {alert.severity}
                      </div>
                    </div>
                    <div className="text-neutral-400 font-mono text-sm">
                      {alert.description}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAlertAction(alert)}
                    className="ml-4 px-6 py-2 font-mono text-sm font-bold transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: getSeverityColor(alert.severity),
                      color: alert.severity === 'info' ? 'black' : 'white',
                    }}
                  >
                    [{alert.action.toUpperCase()}]
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions & Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="border border-neutral-700 bg-black">
            <div className="border-b border-neutral-700 bg-neutral-900 p-4">
              <h3 className="font-mono text-sm text-neutral-400 font-bold">
                QUICK ACTIONS
              </h3>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => router.push('/workflows')}
                className="w-full border border-neutral-700 px-4 py-3 text-left font-mono text-sm hover:border-[#39FF14] hover:bg-[#39FF14]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚙️</span>
                  <div className="flex-1">
                    <div className="text-white group-hover:text-[#39FF14] font-bold">
                      Deploy Workflow
                    </div>
                    <div className="text-xs text-neutral-500">
                      Build & optimize execution
                    </div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-[#39FF14]">→</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/analytics?tab=yield')}
                className="w-full border border-neutral-700 px-4 py-3 text-left font-mono text-sm hover:border-[#FFD700] hover:bg-[#FFD700]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💰</span>
                  <div className="flex-1">
                    <div className="text-white group-hover:text-[#FFD700] font-bold">
                      Optimize Yield
                    </div>
                    <div className="text-xs text-neutral-500">
                      Auto-rebalance positions
                    </div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-[#FFD700]">→</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/analytics?tab=risk')}
                className="w-full border border-neutral-700 px-4 py-3 text-left font-mono text-sm hover:border-[#FF4444] hover:bg-[#FF4444]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛡️</span>
                  <div className="flex-1">
                    <div className="text-white group-hover:text-[#FF4444] font-bold">
                      Manage Risk
                    </div>
                    <div className="text-xs text-neutral-500">
                      Monitor liquidations
                    </div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-[#FF4444]">→</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/analytics')}
                className="w-full border border-neutral-700 px-4 py-3 text-left font-mono text-sm hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div className="flex-1">
                    <div className="text-white group-hover:text-[#00D4FF] font-bold">
                      View Analytics
                    </div>
                    <div className="text-xs text-neutral-500">
                      Platform metrics
                    </div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-[#00D4FF]">→</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/marketplace')}
                className="w-full border border-neutral-700 px-4 py-3 text-left font-mono text-sm hover:border-[#39FF14] hover:bg-[#39FF14]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏪</span>
                  <div className="flex-1">
                    <div className="text-white group-hover:text-[#39FF14] font-bold">
                      Browse Marketplace
                    </div>
                    <div className="text-xs text-neutral-500">
                      Discover applets
                    </div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-[#39FF14]">→</span>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 border border-neutral-700 bg-black">
            <div className="border-b border-neutral-700 bg-neutral-900 p-4">
              <h3 className="font-mono text-sm text-neutral-400 font-bold">
                RECENT ACTIVITY
              </h3>
            </div>

            <div className="p-4">
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <div className="text-neutral-500 font-mono text-sm">
                    No recent activity
                  </div>
                  <div className="text-neutral-600 font-mono text-xs mt-1">
                    Deploy a workflow or rebalance yield to get started
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, idx) => (
                    <div
                      key={activity.id}
                      className={`border border-neutral-800 p-4 hover:border-neutral-600 transition-colors cursor-pointer ${
                        activity.link ? '' : 'cursor-default'
                      }`}
                      onClick={() => activity.link && router.push(activity.link)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-white font-mono text-sm font-bold">
                              {activity.title}
                            </div>
                            <div className="text-xs text-neutral-600 font-mono">
                              {formatRelativeTime(activity.timestamp)}
                            </div>
                          </div>

                          <div className="text-neutral-400 font-mono text-xs mb-2">
                            {activity.description}
                          </div>

                          {activity.txHash && (
                            <div className="text-[#00D4FF] font-mono text-xs break-all">
                              TX: {activity.txHash}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
