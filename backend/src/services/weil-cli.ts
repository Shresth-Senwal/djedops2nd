/**
 * WeilChain CLI Service
 * 
 * This service handles all interactions with the widl CLI tool for WeilChain operations.
 * It executes CLI commands for account management, transaction signing, and contract deployment.
 * 
 * IMPORTANT: This service assumes widl CLI is installed and accessible in the system PATH.
 * For production deployment on Render, ensure widl binary is included in the deployment package.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Workflow, CLIResult } from '../types';

const execAsync = promisify(exec);

/**
 * WeilChain CLI service class
 * Provides methods for interacting with the WeilChain network via widl CLI
 */
export class WeilCLIService {
  private rpcEndpoint: string;
  private coordinatorAddress: string;
  private privateKey: string;
  private tempDir: string;

  constructor() {
    this.rpcEndpoint = process.env.WEIL_RPC_ENDPOINT || 'https://sentinel.unweil.me';
    this.coordinatorAddress = process.env.WEIL_COORDINATOR_ADDRESS || 'weil1coordinator00000000000000000000000';
    this.privateKey = process.env.WEIL_PRIVATE_KEY || '';
    this.tempDir = join(process.cwd(), 'temp');

    // Ensure temp directory exists
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    // Initialize CLI configuration
    this.initializeCLI();
  }

  /**
   * Initialize widl CLI with RPC endpoint configuration
   * This runs once when the service starts
   */
  private async initializeCLI(): Promise<void> {
    try {
      // Configure RPC endpoint
      await this.executeCommand(`widl config set rpc-url ${this.rpcEndpoint}`);
      
      // Import account if private key is provided
      if (this.privateKey) {
        await this.executeCommand(`widl account import ${this.privateKey}`);
        console.log('✅ WeilChain CLI initialized successfully');
      } else {
        console.warn('⚠️  No private key configured - transaction signing will fail');
      }
    } catch (error) {
      console.error('❌ Failed to initialize WeilChain CLI:', error);
      throw new Error('WeilChain CLI initialization failed');
    }
  }

  /**
   * Execute a widl CLI command
   * @param command - The CLI command to execute
   * @returns Command output and success status
   */
  private async executeCommand(command: string): Promise<CLIResult> {
    try {
      console.log(`🔧 Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('warning')) {
        console.error('CLI stderr:', stderr);
      }

      return {
        success: true,
        output: stdout.trim()
      };
    } catch (error: any) {
      console.error('CLI execution error:', error);
      return {
        success: false,
        output: '',
        error: error.message || 'Unknown CLI error'
      };
    }
  }

  /**
   * Get the connected account address
   * @returns Account address or null if not connected
   */
  async getAccountAddress(): Promise<string | null> {
    try {
      const result = await this.executeCommand('widl account list');
      if (result.success && result.output) {
        // Parse account address from CLI output
        const match = result.output.match(/([a-f0-9]{40,})/i);
        return match ? match[1] : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get account address:', error);
      return null;
    }
  }

  /**
   * Deploy a workflow to the WeilChain Coordinator contract
   * @param workflow - The workflow object to deploy
   * @param ownerAddress - The owner address for the workflow
   * @returns Deployment result with transaction hash
   */
  async deployWorkflow(workflow: Workflow, ownerAddress: string): Promise<CLIResult & { txHash?: string; workflowId?: string }> {
    try {
      // Create temporary JSON file for workflow
      const workflowPath = join(this.tempDir, `workflow_${Date.now()}.json`);
      writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

      // Execute deployment command
      const deployCommand = `widl contract call ${this.coordinatorAddress} deploy_workflow --args ${workflowPath} --from ${ownerAddress}`;
      const result = await this.executeCommand(deployCommand);

      // Clean up temp file
      try {
        unlinkSync(workflowPath);
      } catch (err) {
        console.warn('Failed to delete temp workflow file:', err);
      }

      if (result.success) {
        // Parse transaction hash from output
        const txHashMatch = result.output.match(/transaction hash:\s*([a-f0-9]{64})/i);
        const workflowIdMatch = result.output.match(/workflow id:\s*([a-z0-9_-]+)/i);

        return {
          ...result,
          txHash: txHashMatch ? txHashMatch[1] : undefined,
          workflowId: workflowIdMatch ? workflowIdMatch[1] : workflow.id
        };
      }

      return result;
    } catch (error: any) {
      console.error('Workflow deployment failed:', error);
      return {
        success: false,
        output: '',
        error: error.message || 'Deployment failed'
      };
    }
  }

  /**
   * Sign a transaction using the configured private key
   * @param txData - The transaction data to sign
   * @returns Signed transaction or error
   */
  async signTransaction(txData: string): Promise<CLIResult & { signedTx?: string }> {
    try {
      // Create temp file for transaction data
      const txPath = join(this.tempDir, `tx_${Date.now()}.json`);
      writeFileSync(txPath, txData);

      // Sign transaction
      const signCommand = `widl transaction sign ${txPath}`;
      const result = await this.executeCommand(signCommand);

      // Clean up temp file
      try {
        unlinkSync(txPath);
      } catch (err) {
        console.warn('Failed to delete temp tx file:', err);
      }

      if (result.success) {
        // Parse signed transaction from output
        const signedTxMatch = result.output.match(/signed transaction:\s*(.+)/i);
        return {
          ...result,
          signedTx: signedTxMatch ? signedTxMatch[1] : result.output
        };
      }

      return result;
    } catch (error: any) {
      console.error('Transaction signing failed:', error);
      return {
        success: false,
        output: '',
        error: error.message || 'Signing failed'
      };
    }
  }

  /**
   * Query workflow status from the blockchain
   * @param workflowId - The workflow ID to query
   * @returns Workflow status information
   */
  async getWorkflowStatus(workflowId: string): Promise<CLIResult> {
    try {
      const queryCommand = `widl contract query ${this.coordinatorAddress} get_workflow --args ${workflowId}`;
      return await this.executeCommand(queryCommand);
    } catch (error: any) {
      console.error('Workflow query failed:', error);
      return {
        success: false,
        output: '',
        error: error.message || 'Query failed'
      };
    }
  }

  /**
   * Get account balance
   * @param address - The account address
   * @returns Balance information
   */
  async getBalance(address: string): Promise<CLIResult> {
    try {
      const balanceCommand = `widl account balance ${address}`;
      return await this.executeCommand(balanceCommand);
    } catch (error: any) {
      console.error('Balance query failed:', error);
      return {
        success: false,
        output: '',
        error: error.message || 'Balance query failed'
      };
    }
  }
}

// Export singleton instance
export const weilCLI = new WeilCLIService();
