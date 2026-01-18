/**
 * Workflow Routes
 * 
 * API endpoints for workflow deployment, management, and status queries.
 * These endpoints handle the core DjedOPS functionality of deploying and managing
 * automated DeFi workflows on the WeilChain network.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { weilCLI } from '../services/weil-cli';
import { DeployWorkflowRequest, Workflow } from '../types';

const router = Router();

/**
 * Validation schemas using Zod
 */
const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'condition', 'action', 'teleport']),
  data: z.object({
    label: z.string(),
    actionType: z.string().optional(),
    conditionType: z.string().optional(),
    config: z.record(z.any()).optional()
  }),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional()
});

const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string(),
  trigger: z.object({
    type: z.string(),
    config: z.record(z.any())
  }),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const DeployWorkflowSchema = z.object({
  workflow: WorkflowSchema,
  address: z.string().regex(/^[a-f0-9]{40,}$/i, 'Invalid WeilChain address')
});

/**
 * POST /api/workflow/deploy
 * Deploy a workflow to the WeilChain Coordinator contract
 * 
 * Request body: { workflow: Workflow, address: string }
 * Response: { success: boolean, workflowId?: string, txHash?: string, explorerUrl?: string, message?: string }
 */
router.post('/deploy', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = DeployWorkflowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow data',
        details: validation.error.errors
      });
    }

    const { workflow, address } = validation.data as DeployWorkflowRequest;

    // Verify address matches configured account
    const accountAddress = await weilCLI.getAccountAddress();
    if (!accountAddress || accountAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Address mismatch - cannot deploy for this address'
      });
    }

    console.log(`📤 Deploying workflow "${workflow.name}" (ID: ${workflow.id}) for ${address}`);

    // Deploy workflow via CLI
    const result = await weilCLI.deployWorkflow(workflow, address);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Workflow deployment failed',
        details: result.error
      });
    }

    // Generate block explorer URL
    const explorerUrl = result.txHash 
      ? `https://www.unweil.me/tx/${result.txHash}`
      : undefined;

    console.log(`✅ Workflow deployed successfully - TX: ${result.txHash}`);

    res.json({
      success: true,
      workflowId: result.workflowId || workflow.id,
      txHash: result.txHash,
      explorerUrl,
      message: 'Workflow deployed successfully'
    });
  } catch (error: any) {
    console.error('Workflow deployment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy workflow',
      details: error.message
    });
  }
});

/**
 * GET /api/workflow/status/:workflowId
 * Query the status of a deployed workflow
 * 
 * Path params: { workflowId: string }
 * Response: { success: boolean, status?: any, message?: string }
 */
router.get('/status/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        message: 'Workflow ID is required'
      });
    }

    console.log(`🔍 Querying workflow status: ${workflowId}`);

    // Query workflow status via CLI
    const result = await weilCLI.getWorkflowStatus(workflowId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to query workflow status',
        details: result.error
      });
    }

    // Parse JSON output if possible
    let statusData;
    try {
      statusData = JSON.parse(result.output);
    } catch {
      statusData = result.output;
    }

    res.json({
      success: true,
      status: statusData,
      message: 'Workflow status retrieved successfully'
    });
  } catch (error: any) {
    console.error('Workflow status query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query workflow status',
      details: error.message
    });
  }
});

/**
 * POST /api/workflow/validate
 * Validate workflow structure without deploying
 * 
 * Request body: { workflow: Workflow }
 * Response: { success: boolean, valid: boolean, errors?: string[], message?: string }
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { workflow } = req.body;

    // Validate workflow structure
    const validation = WorkflowSchema.safeParse(workflow);

    if (!validation.success) {
      return res.json({
        success: true,
        valid: false,
        errors: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        message: 'Workflow validation failed'
      });
    }

    // Additional validation rules
    const errors: string[] = [];

    // Check if workflow has at least one node
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check if all edge connections reference valid nodes
    const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
    workflow.edges.forEach((edge: any) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references invalid source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references invalid target node: ${edge.target}`);
      }
    });

    res.json({
      success: true,
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0 ? 'Workflow is valid' : 'Workflow has validation errors'
    });
  } catch (error: any) {
    console.error('Workflow validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate workflow',
      details: error.message
    });
  }
});

/**
 * GET /api/workflow/templates
 * Get a list of pre-built workflow templates
 * 
 * Response: { success: boolean, templates: Workflow[], message?: string }
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    // TODO: Load templates from database or configuration
    // For now, return empty array
    res.json({
      success: true,
      templates: [],
      message: 'Workflow templates retrieved successfully'
    });
  } catch (error: any) {
    console.error('Template retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      details: error.message
    });
  }
});

export default router;
