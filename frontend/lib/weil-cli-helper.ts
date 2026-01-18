/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE: lib/weil-cli-helper.ts
 * PURPOSE: Generate Weil CLI commands for deploying workflows
 * 
 * WAuth browser wallet does not support sending transactions from web apps.
 * This helper generates CLI commands that users can run in their terminal
 * to deploy workflows using the Weil CLI tool.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { WorkflowDeploymentInput } from './weil-sdk-wrapper';
import { WeilChainConfig } from './weil-config';

export interface CLIDeploymentCommand {
  command: string;
  description: string;
  setupSteps: string[];
  jsonFile: string;
  jsonContent: string;
}

/**
 * Generate Weil CLI deployment command
 * 
 * Creates a complete CLI command with setup instructions for deploying
 * a workflow using the Weil CLI tool instead of browser transactions.
 */
export function generateCLIDeploymentCommand(
  input: WorkflowDeploymentInput,
  config: WeilChainConfig
): CLIDeploymentCommand {
  // Create JSON file content for workflow data
  const workflowData = {
    workflow_id: input.workflow_id,
    name: input.name,
    owner: input.owner,
    workflow: input.workflow,
    atomic_mode: input.atomic_mode,
    gas_speed: input.gas_speed,
    mev_strategy: input.mev_strategy,
    selected_route: input.selected_route,
    deployed_at: input.deployed_at,
  };

  const jsonContent = JSON.stringify(workflowData, null, 2);
  const jsonFileName = `workflow-${input.workflow_id.slice(0, 8)}.json`;

  // Generate CLI command for widl-cli (installed in WSL)
  const command = `wsl /usr/local/bin/widl-cli deploy \\
  --contract ${config.coordinatorContractAddress} \\
  --method ${config.deployMethod} \\
  --args-file /mnt/c/Users/$USER/Downloads/${jsonFileName}`;

  const setupSteps = [
    '1. Install Weil CLI in WSL (if not installed):',
    '   # In PowerShell:',
    '   wsl --install',
    '   # Restart your computer, then in WSL:',
    '   sudo install -m 0755 /path/to/widl /usr/local/bin/widl',
    '   sudo install -m 0755 /path/to/cli /usr/local/bin/widl-cli',
    '',
    '2. Set up wallet environment variables in WSL:',
    '   export WC_PRIVATE_KEY=$HOME/.weilliptic',
    '   export WC_PATH=$HOME/.weilliptic',
    '   echo "export WC_PRIVATE_KEY=$HOME/.weilliptic" >> ~/.bashrc',
    '   echo "export WC_PATH=$HOME/.weilliptic" >> ~/.bashrc',
    '',
    '3. Configure your wallet (if not already done):',
    `   widl-cli wallet setup --generate_mnemonic`,
    '   # Save the mnemonic shown - you need it to recover your wallet',
    '',
    `4. Download ${jsonFileName} to your Downloads folder`,
    '   # Click the Download JSON button below',
    '',
    '5. Deploy the workflow from WSL:',
    '   # Copy and paste the command below into WSL terminal',
  ];

  return {
    command,
    description: `Deploy workflow "${input.name}" to WeilChain Coordinator`,
    setupSteps,
    jsonFile: jsonFileName,
    jsonContent,
  };
}

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  } catch (err) {
    document.body.removeChild(textarea);
    return Promise.reject(err);
  }
}

/**
 * Download text as file
 */
export function downloadAsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
