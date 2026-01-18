/**
 * Semantic Intent Engine
 * 
 * Purpose:
 * Parses natural language commands and converts them into workflow nodes and edges.
 * Uses Gemini AI for sophisticated intent understanding or falls back to regex parsing.
 * 
 * Features:
 * - Natural language to workflow translation
 * - Gemini AI integration for complex queries
 * - Fallback regex patterns for common workflows
 * - Node position calculation for canvas placement
 * - Edge generation for node connections
 * 
 * Integration:
 * - Used by SemanticCommandBar component
 * - Outputs WorkflowNode[] and connections for WorkflowBuilder
 * - Supports streaming responses for better UX
 * 
 * API Configuration:
 * - Requires NEXT_PUBLIC_GEMINI_API_KEY environment variable
 * - Falls back to pattern matching if API key not available
 */

import { WorkflowNode, AppletNodeType } from './workflow-types';

/**
 * Edge/Connection between workflow nodes
 */
export interface WorkflowEdge {
  from: string;
  to: string;
}

/**
 * Result of intent parsing
 */
export interface ParsedIntent {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  description: string;
}

/**
 * Regex pattern matching for common workflow patterns
 * Used as fallback when AI API is unavailable
 */
const INTENT_PATTERNS = [
  {
    pattern: /swap\s+(\d+)\s+(\w+)\s+to\s+(\w+)(?:\s+if\s+price\s+(<|>)\s+(\d+))?/i,
    handler: (matches: RegExpMatchArray): ParsedIntent => {
      const [, amount, fromToken, toToken, operator, threshold] = matches;
      
      const nodes: WorkflowNode[] = [];
      const edges: WorkflowEdge[] = [];
      
      // Add price monitor if condition exists
      if (operator && threshold) {
        const monitorNode: WorkflowNode = {
          id: `monitor_${Date.now()}`,
          type: 'djed_monitor',
          name: `Monitor ${toToken} Price`,
          position: { x: 100, y: 200 },
          outputs: [],
          condition: {
            type: operator === '<' ? 'price_below' : 'price_above',
            value: parseFloat(threshold),
          },
        };
        nodes.push(monitorNode);
      }
      
      // Add arbitrage/swap node
      const swapNode: WorkflowNode = {
        id: `swap_${Date.now()}`,
        type: 'djed_arbitrage',
        name: `Swap ${amount} ${fromToken} → ${toToken}`,
        position: { x: 400, y: 200 },
        outputs: [],
      };
      nodes.push(swapNode);
      
      // Connect nodes if monitor exists
      if (nodes.length > 1) {
        edges.push({ from: nodes[0].id, to: nodes[1].id });
      }
      
      return {
        nodes,
        edges,
        description: `Swap ${amount} ${fromToken} to ${toToken}${operator ? ` when price ${operator} ${threshold}` : ''}`,
      };
    },
  },
  {
    pattern: /monitor\s+(\w+)(?:\s+and\s+alert\s+if\s+(\w+)\s+(<|>)\s+(\d+))?/i,
    handler: (matches: RegExpMatchArray): ParsedIntent => {
      const [, protocol, metric, operator, threshold] = matches;
      
      const monitorNode: WorkflowNode = {
        id: `monitor_${Date.now()}`,
        type: 'djed_monitor',
        name: `Monitor ${protocol}`,
        position: { x: 100, y: 200 },
        outputs: [],
        condition: metric && operator && threshold ? {
          type: operator === '<' ? 'dsi_below' : 'dsi_above',
          value: parseFloat(threshold),
        } : undefined,
      };
      
      const sentinelNode: WorkflowNode = {
        id: `sentinel_${Date.now()}`,
        type: 'djed_sentinel',
        name: 'Alert System',
        position: { x: 400, y: 200 },
        outputs: [],
      };
      
      return {
        nodes: [monitorNode, sentinelNode],
        edges: [{ from: monitorNode.id, to: sentinelNode.id }],
        description: `Monitor ${protocol} and alert on conditions`,
      };
    },
  },
  {
    pattern: /arbitrage\s+between\s+(\w+)\s+and\s+(\w+)/i,
    handler: (matches: RegExpMatchArray): ParsedIntent => {
      const [, protocol1, protocol2] = matches;
      
      const monitorNode: WorkflowNode = {
        id: `monitor_${Date.now()}`,
        type: 'djed_monitor',
        name: `Monitor ${protocol1} & ${protocol2}`,
        position: { x: 100, y: 200 },
        outputs: [],
      };
      
      const arbNode: WorkflowNode = {
        id: `arb_${Date.now()}`,
        type: 'djed_arbitrage',
        name: `Arbitrage ${protocol1} ↔ ${protocol2}`,
        position: { x: 400, y: 200 },
        outputs: [],
      };
      
      const ledgerNode: WorkflowNode = {
        id: `ledger_${Date.now()}`,
        type: 'djed_ledger',
        name: 'Record Transactions',
        position: { x: 700, y: 200 },
        outputs: [],
      };
      
      return {
        nodes: [monitorNode, arbNode, ledgerNode],
        edges: [
          { from: monitorNode.id, to: arbNode.id },
          { from: arbNode.id, to: ledgerNode.id },
        ],
        description: `Arbitrage between ${protocol1} and ${protocol2}`,
      };
    },
  },
];

/**
 * Parse intent using Gemini AI
 * Converts natural language to structured workflow configuration
 * 
 * @param input - Natural language workflow description
 * @returns Promise resolving to nodes, edges, and description
 */
async function parseIntentWithGemini(input: string): Promise<ParsedIntent> {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Use Google Generative AI SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are a DeFi workflow compiler. Convert the following natural language command into a JSON workflow configuration.

User command: "${input}"

Available node types:
- djed_monitor: Monitor price/DSI conditions
- djed_sim: Simulate protocol scenarios
- djed_sentinel: Alert system for critical conditions
- djed_ledger: Record transactions
- djed_arbitrage: Execute arbitrage trades

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "node_type",
      "name": "Display Name",
      "position": { "x": 100, "y": 200 },
      "outputs": [],
      "condition": {
        "type": "price_below|price_above|dsi_below|dsi_above",
        "value": number
      }
    }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id" }
  ],
  "description": "Human readable workflow description"
}

Space nodes 300px apart horizontally. First node starts at x:100, y:200.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Validate and ensure IDs are unique
    parsed.nodes = parsed.nodes.map((node: any, idx: number) => ({
      ...node,
      id: `${node.type}_${Date.now()}_${idx}`,
    }));
    
    return parsed;
  } catch (error) {
    console.error('Gemini AI parsing failed:', error);
    throw error;
  }
}

/**
 * Parse intent using regex patterns (fallback)
 * 
 * @param input - Natural language workflow description
 * @returns Parsed workflow or null if no pattern matches
 */
function parseIntentWithPatterns(input: string): ParsedIntent | null {
  for (const { pattern, handler } of INTENT_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      return handler(matches);
    }
  }
  return null;
}

/**
 * Parse natural language intent into workflow nodes and edges
 * Primary export function for the intent engine
 * 
 * @param input - Natural language workflow description
 * @param useAI - Whether to use AI parsing (default: true if API key available)
 * @returns Promise resolving to workflow configuration
 */
export async function parseIntent(
  input: string,
  useAI: boolean = true
): Promise<ParsedIntent> {
  // Artificial delay for perceived performance (makes it feel more sophisticated)
  const minDelay = 800;
  const startTime = Date.now();
  
  try {
    // Try AI parsing first if enabled and API key available
    if (useAI && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      try {
        const result = await parseIntentWithGemini(input);
        
        // Ensure minimum delay for UX
        const elapsed = Date.now() - startTime;
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        return result;
      } catch (aiError) {
        console.warn('AI parsing failed, falling back to patterns:', aiError);
      }
    }
    
    // Fallback to pattern matching
    const result = parseIntentWithPatterns(input);
    
    if (!result) {
      // Create a generic monitoring workflow as ultimate fallback
      return {
        nodes: [
          {
            id: `monitor_${Date.now()}`,
            type: 'djed_monitor',
            name: 'Custom Monitor',
            position: { x: 100, y: 200 },
            outputs: [],
          },
        ],
        edges: [],
        description: `Monitor: ${input}`,
      };
    }
    
    // Ensure minimum delay for UX
    const elapsed = Date.now() - startTime;
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }
    
    return result;
  } catch (error) {
    console.error('Intent parsing failed:', error);
    throw new Error('Failed to parse workflow intent. Please try rephrasing your command.');
  }
}

/**
 * Get example commands for user guidance
 */
export function getExampleCommands(): string[] {
  return [
    'Swap 100 USDC to ETH if price < 2000',
    'Monitor Aave and alert if DSI > 0.8',
    'Arbitrage between Uniswap and Curve',
    'Monitor DJED protocol for liquidation risks',
    'Swap 50 WEIL to USDC when price > 1.5',
  ];
}
