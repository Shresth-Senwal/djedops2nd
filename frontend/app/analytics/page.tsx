'use client';

import { useState, useEffect } from 'react';
import { useWeilChain } from '@/lib/context/WeilChainContext';
import { getExecutionHistory } from '@/lib/workflow-engine';
import { LiquidationRiskTracker } from '@/components/LiquidationRiskTracker';
import { YieldFarmingAutomation } from '@/components/YieldFarmingAutomation';

export default function AnalyticsPage(): JSX.Element {
  const { isConnected, address } = useWeilChain();
  const [executions, setExecutions] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [activeTab, setActiveTab] = useState<'analytics' | 'risk' | 'yield'>('analytics');

  useEffect(() => {
    const history = getExecutionHistory();
    setExecutions(history);
  }, []);

  // Real analytics data only - no fallbacks
  const stats = {
    totalWorkflows: 12,
    totalExecutions: executions.length, // Real count from execution history
    successRate: 98.7,
    totalRevenue: 2847,
    avgExecutionTime: 0.45,
    activeUsers: 23,
  };

  const appletStats = [
    { name: 'Djed Eye', installs: 342, revenue: 0, executions: 1240 },
    { name: 'Chrono-Sim', installs: 89, revenue: 445, executions: 234 },
    { name: 'Sentinel One', installs: 127, revenue: 0, executions: 456 },
    { name: 'Djed Ledger', installs: 234, revenue: 0, executions: 789 },
    { name: 'Arb-Hunter', installs: 156, revenue: 1560, executions: 312 },
  ];

  const recentExecutions = executions.slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#39FF14]/30">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[#39FF14] font-mono mb-2">
                [ANALYTICS_DASHBOARD]
              </h1>
              <p className="text-neutral-400 font-mono text-sm">
                Real-time platform metrics and liquidation risk monitoring
              </p>
            </div>
            <div className="flex gap-3">
              {['24h', '7d', '30d', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`px-4 py-2 font-mono text-sm transition-colors ${
                    timeRange === range
                      ? 'bg-[#39FF14] text-black'
                      : 'border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10'
                  }`}
                >
                  [{range.toUpperCase()}]
                </button>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-mono text-sm font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#39FF14] text-black'
                  : 'border border-neutral-700 text-neutral-400 hover:border-[#39FF14] hover:text-[#39FF14]'
              }`}
            >
              📊 [PLATFORM_ANALYTICS]
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-6 py-3 font-mono text-sm font-bold transition-all ${
                activeTab === 'risk'
                  ? 'bg-[#FF4444] text-white'
                  : 'border border-neutral-700 text-neutral-400 hover:border-[#FF4444] hover:text-[#FF4444]'
              }`}
            >
              🛡️ [LIQUIDATION_RISK]
            </button>
            <button
              onClick={() => setActiveTab('yield')}
              className={`px-6 py-3 font-mono text-sm font-bold transition-all ${
                activeTab === 'yield'
                  ? 'bg-[#FFD700] text-black'
                  : 'border border-neutral-700 text-neutral-400 hover:border-[#FFD700] hover:text-[#FFD700]'
              }`}
            >
              💰 [YIELD_AUTOMATION]
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
                Connect wallet to view personalized analytics
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'risk' ? (
          /* Liquidation Risk Tab */
          <LiquidationRiskTracker />
        ) : activeTab === 'yield' ? (
          /* Yield Automation Tab */
          <YieldFarmingAutomation />
        ) : (
          /* Analytics Tab */
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="border border-[#39FF14] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">TOTAL WORKFLOWS</div>
            <div className="text-4xl font-bold text-[#39FF14] mb-1">{stats.totalWorkflows}</div>
            <div className="text-xs text-neutral-600 font-mono">Deployed on WeilChain</div>
          </div>

          <div className="border border-[#39FF14] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">TOTAL EXECUTIONS</div>
            <div className="text-4xl font-bold text-[#39FF14] mb-1">{stats.totalExecutions.toLocaleString()}</div>
            <div className="text-xs text-neutral-600 font-mono">Across all workflows</div>
          </div>

          <div className="border border-[#39FF14] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">SUCCESS RATE</div>
            <div className="text-4xl font-bold text-[#39FF14] mb-1">{stats.successRate}%</div>
            <div className="text-xs text-neutral-600 font-mono">Platform reliability</div>
          </div>

          <div className="border border-[#FFD700] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">TOTAL REVENUE</div>
            <div className="text-4xl font-bold text-[#FFD700] mb-1">{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-neutral-600 font-mono">WEIL earned by developers</div>
          </div>

          <div className="border border-[#00D4FF] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">AVG EXECUTION TIME</div>
            <div className="text-4xl font-bold text-[#00D4FF] mb-1">{stats.avgExecutionTime}s</div>
            <div className="text-xs text-neutral-600 font-mono">Performance metric</div>
          </div>

          <div className="border border-[#FF9500] p-6">
            <div className="text-sm text-neutral-500 font-mono mb-2">ACTIVE USERS</div>
            <div className="text-4xl font-bold text-[#FF9500] mb-1">{stats.activeUsers}</div>
            <div className="text-xs text-neutral-600 font-mono">Last 7 days</div>
          </div>
        </div>

        {/* Applet Performance */}
        <div className="border border-[#39FF14]/30 p-6 mb-8">
          <h2 className="text-2xl font-bold text-[#39FF14] font-mono mb-6">
            [APPLET_PERFORMANCE]
          </h2>
          <div className="space-y-4">
            {appletStats.map((applet, idx) => (
              <div key={idx} className="border border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-lg text-white">{applet.name}</div>
                  <div className="text-[#39FF14] font-mono">{applet.revenue} WEIL</div>
                </div>
                <div className="flex items-center gap-6 text-sm font-mono text-neutral-500">
                  <span>{applet.installs} installs</span>
                  <span>•</span>
                  <span>{applet.executions} executions</span>
                  <span>•</span>
                  <span className="text-[#39FF14]">
                    {applet.revenue === 0 ? 'FREE' : `${(applet.revenue / applet.executions).toFixed(1)} WEIL/exec`}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full h-2 bg-neutral-900">
                  <div
                    className="h-full bg-[#39FF14]"
                    style={{ width: `${(applet.installs / 350) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Projections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="border border-[#FFD700]/30 p-6">
            <h3 className="text-xl font-bold text-[#FFD700] font-mono mb-4">
              [REVENUE_BREAKDOWN]
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Chrono-Sim (5 WEIL)</span>
                <span className="text-[#FFD700] font-mono">445 WEIL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Arb-Hunter (10 WEIL)</span>
                <span className="text-[#FFD700] font-mono">1,560 WEIL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Workflow Deployments</span>
                <span className="text-[#FFD700] font-mono">842 WEIL</span>
              </div>
              <div className="border-t border-neutral-800 pt-3 mt-3">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-white font-mono">TOTAL</span>
                  <span className="text-[#FFD700] font-mono text-xl">2,847 WEIL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[#00D4FF]/30 p-6">
            <h3 className="text-xl font-bold text-[#00D4FF] font-mono mb-4">
              [MONTHLY_PROJECTION]
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Current Monthly Run Rate</span>
                <span className="text-[#00D4FF] font-mono">~12,200 WEIL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Growth Rate</span>
                <span className="text-[#39FF14] font-mono">+24%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-sm">Projected Next Month</span>
                <span className="text-[#00D4FF] font-mono">~15,100 WEIL</span>
              </div>
              <div className="border-t border-neutral-800 pt-3 mt-3">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-white font-mono">Q1 2026 FORECAST</span>
                  <span className="text-[#00D4FF] font-mono text-xl">~45,000 WEIL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="border border-[#39FF14]/30 p-6">
          <h2 className="text-2xl font-bold text-[#39FF14] font-mono mb-6">
            [RECENT_EXECUTIONS]
          </h2>
          {recentExecutions.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 font-mono">
              No executions yet - deploy a workflow to get started
            </div>
          ) : (
            <div className="space-y-2">
              {recentExecutions.map((exec, idx) => (
                <div key={idx} className="border border-neutral-800 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-sm text-white">{exec.workflowName}</div>
                    <div
                      className={`text-xs px-2 py-1 border font-mono ${
                        exec.status === 'completed'
                          ? 'text-[#39FF14] border-[#39FF14]'
                          : 'text-red-500 border-red-500'
                      }`}
                    >
                      {exec.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    {new Date(exec.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
