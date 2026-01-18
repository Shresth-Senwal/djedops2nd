/**
 * Workflow Templates
 * Pre-built workflow configurations for common use cases
 */

import { Workflow, WorkflowNode, WorkflowConnection } from './workflow-types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'monitoring' | 'trading' | 'security' | 'analytics';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCost: number; // In WEIL
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'lastExecuted' | 'executionCount'>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'monitor-alert',
    name: 'Monitor & Alert',
    description: 'Continuously monitor Djed protocol health and trigger alerts when reserve ratio drops below safe threshold',
    category: 'monitoring',
    difficulty: 'beginner',
    estimatedCost: 120,
    workflow: {
      name: 'Monitor & Alert',
      description: 'Basic health monitoring workflow',
      nodes: [
        {
          id: 'node_monitor',
          type: 'djed_monitor',
          name: 'Djed Eye',
          position: { x: 100, y: 150 },
          outputs: ['node_sentinel'],
          condition: { type: 'always' },
        },
        {
          id: 'node_sentinel',
          type: 'djed_sentinel',
          name: 'Sentinel One',
          position: { x: 450, y: 150 },
          outputs: [],
          condition: { type: 'dsi_below', value: 400 },
        },
      ],
      connections: [
        { from: 'node_monitor', to: 'node_sentinel' },
      ],
    },
  },
  {
    id: 'arbitrage-hunter',
    name: 'Arbitrage Opportunity Scanner',
    description: 'Detect arbitrage opportunities, verify with transaction history, and calculate optimal trade size',
    category: 'trading',
    difficulty: 'advanced',
    estimatedCost: 450,
    workflow: {
      name: 'Arbitrage Hunter Pro',
      description: 'Advanced arbitrage detection workflow',
      nodes: [
        {
          id: 'node_arb',
          type: 'djed_arbitrage',
          name: 'Arb-Hunter',
          position: { x: 100, y: 100 },
          outputs: ['node_ledger'],
          condition: { type: 'price_below', value: 0.98 },
        },
        {
          id: 'node_ledger',
          type: 'djed_ledger',
          name: 'Djed Ledger',
          position: { x: 450, y: 100 },
          outputs: ['node_monitor'],
          condition: { type: 'always' },
        },
        {
          id: 'node_monitor',
          type: 'djed_monitor',
          name: 'Djed Eye',
          position: { x: 800, y: 100 },
          outputs: [],
          condition: { type: 'always' },
        },
      ],
      connections: [
        { from: 'node_arb', to: 'node_ledger' },
        { from: 'node_ledger', to: 'node_monitor' },
      ],
    },
  },
  {
    id: 'risk-analysis',
    name: 'Comprehensive Risk Analysis',
    description: 'Run stress tests, simulate scenarios, and monitor protocol stability in a complete risk assessment pipeline',
    category: 'security',
    difficulty: 'advanced',
    estimatedCost: 380,
    workflow: {
      name: 'Risk Analysis Pipeline',
      description: 'Full risk assessment workflow',
      nodes: [
        {
          id: 'node_sentinel',
          type: 'djed_sentinel',
          name: 'Sentinel One',
          position: { x: 100, y: 150 },
          outputs: ['node_sim'],
          condition: { type: 'always' },
        },
        {
          id: 'node_sim',
          type: 'djed_sim',
          name: 'Chrono-Sim',
          position: { x: 450, y: 150 },
          outputs: ['node_monitor'],
          condition: { type: 'always' },
        },
        {
          id: 'node_monitor',
          type: 'djed_monitor',
          name: 'Djed Eye',
          position: { x: 800, y: 150 },
          outputs: [],
          condition: { type: 'dsi_below', value: 450 },
        },
      ],
      connections: [
        { from: 'node_sentinel', to: 'node_sim' },
        { from: 'node_sim', to: 'node_monitor' },
      ],
    },
  },
  {
    id: 'transaction-tracker',
    name: 'Live Transaction Tracker',
    description: 'Monitor on-chain transactions, detect large whale movements, and analyze transaction patterns',
    category: 'analytics',
    difficulty: 'beginner',
    estimatedCost: 150,
    workflow: {
      name: 'Transaction Tracker',
      description: 'Real-time transaction monitoring',
      nodes: [
        {
          id: 'node_ledger',
          type: 'djed_ledger',
          name: 'Djed Ledger',
          position: { x: 100, y: 150 },
          outputs: ['node_monitor'],
          condition: { type: 'always' },
        },
        {
          id: 'node_monitor',
          type: 'djed_monitor',
          name: 'Djed Eye',
          position: { x: 450, y: 150 },
          outputs: [],
          condition: { type: 'always' },
        },
      ],
      connections: [
        { from: 'node_ledger', to: 'node_monitor' },
      ],
    },
  },
  {
    id: 'full-stack',
    name: 'Full Stack Monitor',
    description: 'Complete monitoring solution using all 5 applets in a coordinated pipeline',
    category: 'monitoring',
    difficulty: 'advanced',
    estimatedCost: 850,
    workflow: {
      name: 'Full Stack Monitor',
      description: 'Complete ecosystem monitoring',
      nodes: [
        {
          id: 'node_monitor',
          type: 'djed_monitor',
          name: 'Djed Eye',
          position: { x: 100, y: 200 },
          outputs: ['node_sentinel', 'node_ledger'],
          condition: { type: 'always' },
        },
        {
          id: 'node_sentinel',
          type: 'djed_sentinel',
          name: 'Sentinel One',
          position: { x: 450, y: 100 },
          outputs: ['node_sim'],
          condition: { type: 'dsi_below', value: 450 },
        },
        {
          id: 'node_ledger',
          type: 'djed_ledger',
          name: 'Djed Ledger',
          position: { x: 450, y: 300 },
          outputs: ['node_arb'],
          condition: { type: 'always' },
        },
        {
          id: 'node_sim',
          type: 'djed_sim',
          name: 'Chrono-Sim',
          position: { x: 800, y: 100 },
          outputs: [],
          condition: { type: 'always' },
        },
        {
          id: 'node_arb',
          type: 'djed_arbitrage',
          name: 'Arb-Hunter',
          position: { x: 800, y: 300 },
          outputs: [],
          condition: { type: 'price_below', value: 0.99 },
        },
      ],
      connections: [
        { from: 'node_monitor', to: 'node_sentinel' },
        { from: 'node_monitor', to: 'node_ledger' },
        { from: 'node_sentinel', to: 'node_sim' },
        { from: 'node_ledger', to: 'node_arb' },
      ],
    },
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: WorkflowTemplate['difficulty']): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.difficulty === difficulty);
}
