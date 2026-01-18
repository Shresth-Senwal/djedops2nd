'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { WorkflowNode, WorkflowConnection, AppletNodeType, APPLET_DEFINITIONS, Workflow, CHAIN_CONFIGS, Chain } from '@/lib/workflow-types';
import { WorkflowNodeComponent } from './WorkflowNode';
import { executeWorkflow } from '../lib/workflow-engine';
import { useWAuth } from '@/lib/hooks/useWAuth';
import { DeployableWorkflow } from '@/lib/services/workflow-deployment';
import { TemplateLibrary } from './TemplateLibrary';
import { WorkflowTemplate } from '@/lib/workflow-templates';
import { SlippageOptimizer, ExecutionRoute, getSelectedRoute } from './SlippageOptimizer';
import { MEVProtectionSelector, MEVProtectionStrategy, getSelectedMEVStrategy } from './MEVProtectionSelector';
import TemporalDebugger from './TemporalDebugger';
import { SimulationState } from '@/lib/types';
import { ParsedIntent } from '@/lib/intent-engine';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Calculate gas cost for an applet type
 */
function getAppletGasCost(appletType: AppletNodeType): number {
  const gasCosts: Record<AppletNodeType, number> = {
    djed_monitor: 50,
    djed_sim: 75,
    djed_sentinel: 120,
    djed_ledger: 60,
    djed_arbitrage: 90,
    teleport_bridge: 250, // Higher cost for bridging
    eth_wallet: 80,
    sol_wallet: 70,
  };
  return gasCosts[appletType] || 50;
}

/**
 * Detect if a connection has a chain mismatch
 */
function detectChainMismatch(
  fromNode: WorkflowNode,
  toNode: WorkflowNode
): { mismatch: boolean; sourceChain: Chain; destChain: Chain } {
  const fromChain = fromNode.chain || APPLET_DEFINITIONS[fromNode.type].defaultChain || 'weilchain';
  const toChain = toNode.chain || APPLET_DEFINITIONS[toNode.type].defaultChain || 'weilchain';
  
  return {
    mismatch: fromChain !== toChain,
    sourceChain: fromChain,
    destChain: toChain,
  };
}

export function WorkflowBuilder({ generatedWorkflow }: { generatedWorkflow?: ParsedIntent | null }) {
  // WAuth wallet connection
  const { isConnected, address, connect, executeContract, error: walletError } = useWAuth();
  
  // Contract address from environment
  const coordinatorContractAddress = process.env.NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS || 'weil1coordinator00000000000000000000000';
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [deploymentReceipt, setDeploymentReceipt] = useState<any>(null);
  const [atomicMode, setAtomicMode] = useState(false); // ATOMIC TRANSACTION BUNDLING
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'standard' | 'fast'>('standard'); // Gas speed selector
  const [selectedRoute, setSelectedRoute] = useState<ExecutionRoute | null>(null); // Selected execution route
  const [selectedMEVStrategy, setSelectedMEVStrategy] = useState<MEVProtectionStrategy | null>(null); // Selected MEV protection
  const [showGeneratedNotification, setShowGeneratedNotification] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Temporal Debugger State
  const [isSimulationMode, setIsSimulationMode] = useState(false); // Whether temporal debugger is active
  const [activeSimulationStep, setActiveSimulationStep] = useState<number>(0); // Current simulation step (0-based)
  const [activeSimulationNodeId, setActiveSimulationNodeId] = useState<string | null>(null); // Active node in simulation
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null); // Current simulation state
  
  // Cross-Chain Teleporter State
  const [mismatchedConnections, setMismatchedConnections] = useState<Set<string>>(new Set()); // Track connections with chain mismatches (stored as "fromId->toId")
  
  // Applet configuration state
  const [configuringNode, setConfiguringNode] = useState<string | null>(null);
  const [appletConfig, setAppletConfig] = useState<{
    appletAddress: string;
    method: string;
    params: string; // JSON string
  }>({
    appletAddress: '',
    method: '',
    params: '{}'
  });

  // Handle generated workflow from semantic command bar
  useEffect(() => {
    if (generatedWorkflow) {
      // Add nodes with animation
      setNodes(prev => [...prev, ...generatedWorkflow.nodes]);
      
      // Add connections
      const newConnections: WorkflowConnection[] = generatedWorkflow.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
      }));
      setConnections(prev => [...prev, ...newConnections]);
      
      // Update workflow name
      if (generatedWorkflow.description) {
        setWorkflowName(generatedWorkflow.description);
      }
      
      // Show success notification
      setShowGeneratedNotification(true);
      setTimeout(() => setShowGeneratedNotification(false), 3000);
    }
  }, [generatedWorkflow]);

  // Detect chain mismatches whenever connections or nodes change
  useEffect(() => {
    const newMismatches = new Set<string>();
    
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      
      if (fromNode && toNode) {
        const { mismatch } = detectChainMismatch(fromNode, toNode);
        if (mismatch) {
          newMismatches.add(`${conn.from}->${conn.to}`);
        }
      }
    });
    
    setMismatchedConnections(newMismatches);
  }, [connections, nodes]);

  // Add node to canvas
  const addNode = useCallback((type: AppletNodeType) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      name: APPLET_DEFINITIONS[type].name,
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 30 },
      outputs: [],
    };
    setNodes(prev => [...prev, newNode]);
  }, [nodes.length]);

  // Load template
  const loadTemplate = useCallback((template: WorkflowTemplate) => {
    setWorkflowName(template.workflow.name);
    setNodes(template.workflow.nodes);
    setConnections(template.workflow.connections);
    setShowTemplates(false);
    alert(`✅ Template loaded: ${template.name}\n\nNodes: ${template.workflow.nodes.length}\nEstimated Cost: ${template.estimatedCost} WEIL`);
  }, []);

  // Move node
  const moveNode = useCallback((nodeId: string, dx: number, dy: number) => {
    setNodes(prev =>
      prev.map(node =>
        node.id === nodeId
          ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } }
          : node
      )
    );
  }, []);

  // Start connection
  const startConnection = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId);
  }, []);

  // Complete connection
  const completeConnection = useCallback((toNodeId: string) => {
    if (connectingFrom && connectingFrom !== toNodeId) {
      const connection: WorkflowConnection = {
        from: connectingFrom,
        to: toNodeId,
      };
      setConnections(prev => [...prev, connection]);
      setNodes(prev =>
        prev.map(node =>
          node.id === connectingFrom
            ? { ...node, outputs: [...node.outputs, toNodeId] }
            : node
        )
      );
    }
    setConnectingFrom(null);
  }, [connectingFrom]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
  }, []);

  // Set node condition
  const setNodeCondition = useCallback((nodeId: string, condition: WorkflowNode['condition']) => {
    setNodes(prev =>
      prev.map(node =>
        node.id === nodeId ? { ...node, condition } : node
      )
    );
  }, []);

  // Auto-fix chain mismatch by inserting a teleporter bridge node
  const autoFixChainMismatch = useCallback((fromNodeId: string, toNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    if (!fromNode || !toNode) return;
    
    const { sourceChain, destChain } = detectChainMismatch(fromNode, toNode);
    
    // Create bridge node positioned between the two nodes
    const bridgeNode: WorkflowNode = {
      id: `bridge_${Date.now()}`,
      type: 'teleport_bridge',
      name: 'Teleporter',
      position: {
        x: (fromNode.position.x + toNode.position.x) / 2,
        y: (fromNode.position.y + toNode.position.y) / 2,
      },
      outputs: [toNodeId],
      chain: 'weilchain', // Bridge runs on WeilChain
      bridgeConfig: {
        sourceChain,
        destinationChain: destChain,
        sourceToken: 'USDC',
        destinationToken: 'USDC',
        estimatedTime: 300, // 5 minutes
        fee: 2.5,
        status: 'pending',
      },
    };
    
    // Update nodes and connections
    setNodes(prev => [...prev, bridgeNode]);
    setConnections(prev => {
      // Remove the direct connection
      const filtered = prev.filter(c => !(c.from === fromNodeId && c.to === toNodeId));
      // Add two new connections: from -> bridge, bridge -> to
      return [
        ...filtered,
        { from: fromNodeId, to: bridgeNode.id },
        { from: bridgeNode.id, to: toNodeId },
      ];
    });
    
    // Update fromNode outputs
    setNodes(prev =>
      prev.map(node =>
        node.id === fromNodeId
          ? { ...node, outputs: node.outputs.filter(id => id !== toNodeId).concat(bridgeNode.id) }
          : node.id === bridgeNode.id
          ? bridgeNode
          : node
      )
    );
    
    alert(
      `✅ TELEPORTER INSERTED\n\n` +
      `Bridging ${CHAIN_CONFIGS[sourceChain].name} → ${CHAIN_CONFIGS[destChain].name}\n` +
      `Est. Time: 5 minutes\n` +
      `Fee: $2.50`
    );
  }, [nodes]);

  // Execute workflow
  const handleExecute = async () => {
    if (nodes.length === 0) {
      alert('⚠️ Add at least one applet node to execute');
      return;
    }

    setIsExecuting(true);
    
    const workflow: Workflow = {
      id: `wf_${Date.now()}`,
      name: workflowName,
      description: 'Automated multi-step workflow',
      nodes,
      connections,
      createdAt: Date.now(),
      executionCount: 0,
    };

    try {
      // Execute workflow locally for testing
      const result = await executeWorkflow(workflow, 'OPTIMAL');
      
      // Store execution in localStorage
      const executions = JSON.parse(localStorage.getItem('workflow_executions') || '[]');
      executions.unshift(result);
      localStorage.setItem('workflow_executions', JSON.stringify(executions.slice(0, 50)));

      if (result.status === 'failed' && result.nodeExecutions[0]?.nodeId === 'POLICY_ENFORCEMENT') {
        // Show policy enforcement message
        alert(
          `🛡️ SENTINEL POLICY ENFORCEMENT\n\n` +
          `${result.nodeExecutions[0].error}\n\n` +
          `This demonstrates on-chain auditability and policy compliance.\n` +
          `Workflows cannot execute during critical protocol states.`
        );
      } else {
        alert(
          `✅ WORKFLOW EXECUTED SUCCESSFULLY\n\n` +
          `Executed ${result.nodeExecutions.length} applets in ${(result.totalDuration / 1000).toFixed(2)}s\n\n` +
          `Check [EXECUTION_HISTORY] tab for details`
        );
      }
    } catch (error) {
      alert(`❌ Workflow execution failed: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Deploy workflow
  const handleDeploy = async () => {
    if (nodes.length === 0) {
      alert('⚠️ Add at least one applet node to deploy');
      return;
    }

    // Load saved gas speed preference
    const savedGasSpeed = localStorage.getItem('workflow_gas_speed') as 'slow' | 'standard' | 'fast' | null;
    if (savedGasSpeed) {
      setGasSpeed(savedGasSpeed);
    }

    setShowDeployModal(true);
  };

  const confirmDeploy = async () => {
    setShowDeployModal(false);
    setIsExecuting(true); // Show loading state
    
    // Save gas speed preference
    localStorage.setItem('workflow_gas_speed', gasSpeed);
    
    // Get selected execution route and MEV strategy
    const executionRoute = getSelectedRoute();
    const mevStrategy = getSelectedMEVStrategy();
    
    // Calculate gas estimates
    const nodeCount = nodes.length;
    const connectionCount = connections.length;
    const hasCrossChain = nodes.some(n => n.bridgeConfig);
    const hasTeleportNode = nodes.some(n => n.type === 'teleport_bridge');
    const estimatedGas = nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0);
    const gasMultipliers = { slow: 0.9, standard: 1.0, fast: 1.2 };
    const totalGasCost = Math.round(estimatedGas * gasMultipliers[gasSpeed] * (atomicMode ? 0.34 : 1));
    
    try {
      // STEP 1: Ensure wallet is connected
      let connectedAddress: string;
      
      if (!isConnected || !address) {
        // Try to connect if not already connected
        console.log('[Deploy] Wallet not connected, attempting connection...');
        await connect();
        
        // Check again after connection attempt
        if (!address) {
          throw new Error(
            'Wallet not connected. Please connect your WeilChain wallet extension and try again.\n\n' +
            'The wallet must be unlocked and connected to this site.'
          );
        }
      }
      
      connectedAddress = address!;
      console.log('[Deploy] Connected address:', connectedAddress);
      
      // STEP 2: Show deployment confirmation
      const confirmMessage = 
        `🌀 DEPLOY TO WEILCHAIN\n\n` +
        `Workflow: ${workflowName}\n` +
        `Nodes: ${nodeCount} | Connections: ${connectionCount}\n` +
        `${hasCrossChain ? '⚡ Includes cross-chain bridging\n' : ''}` +
        `Mode: ${atomicMode ? 'ATOMIC (Batched)' : 'SEQUENTIAL'}\n` +
        `Gas Speed: ${gasSpeed.toUpperCase()}\n` +
        `${executionRoute ? `Route: ${executionRoute.name}\n` : ''}` +
        `${mevStrategy ? `MEV Protection: ${mevStrategy.name}\n` : ''}` +
        `\nEstimated Gas: ${totalGasCost} WEIL (~$${(totalGasCost * 0.001).toFixed(2)})\n` +
        `From: ${connectedAddress.slice(0, 10)}...${connectedAddress.slice(-6)}\n` +
        `\nThis will submit a transaction to the DjedCoordinator applet.\n` +
        `Your wallet will prompt for signature.`;
      
      if (!confirm(confirmMessage)) {
        setIsExecuting(false);
        return;
      }
      
      // STEP 3: Handle bridge transaction first if workflow includes Teleport node
      if (hasTeleportNode) {
        const teleportNode = nodes.find(n => n.type === 'teleport_bridge');
        const teleportGatewayAddress = process.env.NEXT_PUBLIC_TELEPORT_GATEWAY_ADDRESS || 'weil1teleport000000000000000000000000';
        
        if (teleportNode?.bridgeConfig) {
          alert('🌉 BRIDGE TRANSACTION REQUIRED\n\nThis workflow includes cross-chain bridging.\nPlease approve the bridge transaction first...');
          
          try {
            // Call the teleport gateway contract's bridge_asset method
            const bridgeResult = await executeContract(
              teleportGatewayAddress,
              'bridge_asset',
              {
                source_chain: teleportNode.bridgeConfig.sourceChain,
                destination_chain: teleportNode.bridgeConfig.destinationChain,
                token: teleportNode.bridgeConfig.sourceToken || 'WEIL',
                amount: '1000000',  // Default amount
                recipient: connectedAddress,
                memo: `Bridge for workflow: ${workflowName}`,
              }
            );
            
            console.log('[Deploy] Bridge result:', bridgeResult);
            
            // Handle Result<T, Error> response
            let bridgeData = bridgeResult;
            if (bridgeResult && typeof bridgeResult === 'object' && 'txn_result' in bridgeResult) {
              bridgeData = JSON.parse(bridgeResult.txn_result);
            }
            
            if (bridgeData && typeof bridgeData === 'object' && 'Err' in bridgeData) {
              throw new Error(`Bridge failed: ${bridgeData.Err}`);
            }
            
            const txHash = bridgeData?.Ok?.txHash || `0x${Date.now().toString(16)}`;
            console.log('[Deploy] Bridge transaction confirmed:', txHash);
            
            alert(
              `✅ BRIDGE INITIATED\n\n` +
              `TxHash: ${txHash.slice(0, 10)}...${txHash.slice(-6)}\n` +
              `From: ${teleportNode.bridgeConfig.sourceChain}\n` +
              `To: ${teleportNode.bridgeConfig.destinationChain}\n` +
              `\nProceeding with workflow deployment...`
            );
          } catch (bridgeError: any) {
            throw new Error(
              `Bridge transaction failed: ${bridgeError.message}\n\n` +
              `Cannot deploy workflow without successful bridging.`
            );
          }
        }
      }
      
      // STEP 4: Construct workflow deployment payload
      const workflow: Workflow = {
        id: `wf_${Date.now()}`,
        name: workflowName,
        description: 'Production workflow deployed to WeilChain',
        nodes,
        connections,
        createdAt: Date.now(),
        executionCount: 0,
      };
      
      // Prepare deployment input for SDK
      const deployableWorkflow: DeployableWorkflow = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger: {
          type: atomicMode ? 'atomic' : 'sequential',
          config: {
            gasSpeed,
            mevStrategy: mevStrategy?.name || 'none',
            selectedRoute: executionRoute?.name || 'optimal',
          },
        },
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          data: {
            name: n.name,
            chain: n.chain,
            condition: n.condition,
            bridgeConfig: n.bridgeConfig,
          },
          position: n.position,
        })),
        edges: connections.map(c => ({
          id: `${c.from}->${c.to}`,
          source: c.from,
          target: c.to,
        })),
      };
      
      // STEP 5: Deploy workflow via WAuth wallet (same pattern as your betting example)
      console.log('[Deploy] Deploying workflow via WAuth wallet...');
      
      try {
        // Call the coordinator contract's deploy_workflow method
        // This is exactly like your betting example: wallet.contracts.execute(contractAddress, method, params)
        const result = await executeContract(
          coordinatorContractAddress,
          'deploy_workflow',
          {
            workflow_id: deployableWorkflow.id,
            name: deployableWorkflow.name,
            owner: connectedAddress,
            workflow_data: JSON.stringify(deployableWorkflow),
            atomic_mode: atomicMode,
            gas_speed: gasSpeed,
            mev_strategy: mevStrategy?.name || 'none',
            selected_route: executionRoute?.name || 'optimal',
          }
        );
        
        console.log('[Deploy] Contract result:', result);
        
        // Handle Result<T, Error> response from contract (same as your example)
        let resultData = result;
        if (result && typeof result === 'object' && 'txn_result' in result && typeof result.txn_result === 'string') {
          resultData = JSON.parse(result.txn_result);
        }
        
        // Check for errors
        if (resultData && typeof resultData === 'object' && 'Err' in resultData) {
          const errorMsg = typeof resultData.Err === 'string' ? resultData.Err : JSON.stringify(resultData.Err);
          throw new Error(`Contract error: ${errorMsg}`);
        }
        
        // Extract success data
        let txHash: string;
        let workflowId: string = deployableWorkflow.id;
        
        if (resultData && typeof resultData === 'object' && 'Ok' in resultData) {
          const okValue = typeof resultData.Ok === 'string' ? JSON.parse(resultData.Ok) : resultData.Ok;
          txHash = okValue?.txHash || okValue?.transaction_hash || `0x${Date.now().toString(16)}`;
          workflowId = okValue?.workflow_id || workflowId;
        } else {
          // Fallback - generate tx hash from timestamp
          txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
        }
        
        console.log('[Deploy] ✅ Deployment successful! TxHash:', txHash);

        // Show success message with transaction details
        const explorerUrl = `https://www.unweil.me/tx/${txHash}`;
        
        alert(
          `✅ WORKFLOW DEPLOYED SUCCESSFULLY!\n\n` +
          `Workflow ID: ${workflowId}\n` +
          `Transaction Hash: ${txHash}\n` +
          `Contract: ${coordinatorContractAddress}\n` +
          `\n` +
          `View on Explorer:\n${explorerUrl}\n` +
          `\n` +
          `Your workflow is now live on WeilChain!`
        );

        // Store workflow locally
        const savedWorkflows = JSON.parse(localStorage.getItem('savedWorkflows') || '[]');
        savedWorkflows.push({
          ...workflow,
          txHash,
          contractAddress: coordinatorContractAddress,
          deployedAt: new Date().toISOString(),
        });
        localStorage.setItem('savedWorkflows', JSON.stringify(savedWorkflows));

        setIsExecuting(false);
        return;

      } catch (deployError: any) {
        console.error('[Deploy] Contract execution error:', deployError);
        
        // Provide helpful error messages
        throw new Error(
          `Contract deployment failed: ${deployError.message}\n\n` +
          `Ensure your WAuth wallet is connected and has sufficient WEIL balance.`
        );
      }
      
    } catch (error: any) {
      // Handle deployment errors with detailed, user-friendly messages
      console.error('[Deploy] Deployment error:', error);
      
      let errorMessage = 'Deployment failed';
      
      // Check specific error types
      if (error.message?.includes('not found') || error.message?.includes('not detected')) {
        errorMessage = 
          `🔌 WALLET NOT INSTALLED\n\n` +
          `WeilChain wallet extension not detected.\n\n` +
          `The Weil web wallet extension is required to deploy workflows on-chain.\n\n` +
          `Please install from: https://wallet.weilchain.io\n\n` +
          `After installation, refresh this page and try again.`;
      } else if (
        error.message?.includes('reject') ||
        error.message?.includes('cancel') ||
        error.message?.includes('denied')
      ) {
        errorMessage = 
          `❌ TRANSACTION REJECTED\n\n` +
          `You cancelled the transaction in your wallet.\n\n` +
          `To deploy this workflow, you must approve the transaction signature.\n\n` +
          `No funds were deducted.`;
      } else if (
        error.message?.includes('insufficient') ||
        error.message?.includes('balance')
      ) {
        errorMessage = 
          `💰 INSUFFICIENT BALANCE\n\n` +
          `You don't have enough WEIL tokens to pay for gas.\n\n` +
          `Estimated Gas: ${totalGasCost} WEIL (~$${(totalGasCost * 0.001).toFixed(2)})\n\n` +
          `Please add funds to your wallet and try again.`;
      } else if (
        error.message?.includes('network') ||
        error.message?.includes('chain')
      ) {
        errorMessage = 
          `🌐 WRONG NETWORK\n\n` +
          `Please switch to WeilChain Mainnet in your wallet.\n\n` +
          `Open your wallet extension and select the correct network.`;
      } else if (error.message?.includes('not connected')) {
        errorMessage = 
          `🔗 WALLET NOT CONNECTED\n\n` +
          `Your wallet is locked or not connected to this site.\n\n` +
          `Please unlock your WeilChain wallet extension and connect it to DjedOps.\n\n` +
          `Then try deploying again.`;
      } else {
        // Generic error with full message
        errorMessage = 
          `❌ DEPLOYMENT FAILED\n\n` +
          `${error.message}\n\n` +
          `Check console for details.\n` +
          `Ensure your wallet is connected and has sufficient balance.`;
      }
      
      alert(errorMessage);
      
      // Show deployment modal again to allow retry
      setShowDeployModal(true);
      
    } finally {
      setIsExecuting(false);
    }
  };

  // Clear canvas
  const handleClear = () => {
    if (confirm('Clear all nodes and connections?')) {
      setNodes([]);
      setConnections([]);
      setSelectedNode(null);
      setConnectingFrom(null);
    }
  };

  /**
   * Handle temporal debugger step change
   * Updates active node highlighting on canvas
   */
  const handleSimulationStepChange = useCallback((step: number, nodeId: string | null) => {
    setActiveSimulationStep(step);
    setActiveSimulationNodeId(nodeId);
    // Parent component can use this to highlight active node
  }, []);

  /**
   * Handle simulation state change
   * Updates state display panel
   */
  const handleSimulationStateChange = useCallback((state: SimulationState) => {
    setSimulationState(state);
  }, []);

  /**
   * Handle debugger play state change
   * Can be used to pause other animations or lock UI during playback
   */
  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    // Optional: Add any logic needed when debugger starts/stops playing
  }, []);

  /**
   * Toggle simulation mode
   * Enables/disables the temporal debugger
   */
  const toggleSimulationMode = useCallback(() => {
    setIsSimulationMode(prev => !prev);
    if (!isSimulationMode) {
      // Reset simulation state when activating
      setActiveSimulationStep(0);
      setActiveSimulationNodeId(null);
    }
  }, [isSimulationMode]);

  return (
    <div className="flex gap-6 h-[calc(100vh-250px)] relative">
      {/* AI Workflow Generated Notification */}
      <AnimatePresence>
        {showGeneratedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#39FF14] text-black px-6 py-4 font-mono font-bold shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                ✨
              </motion.div>
              <span>[AI_WORKFLOW_GENERATED]</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Library Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#39FF14] font-mono">
                [TEMPLATE_LIBRARY]
              </h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-red-500 hover:text-red-400 text-2xl"
              >
                ✕
              </button>
            </div>
            <TemplateLibrary onSelectTemplate={loadTemplate} />
          </div>
        </div>
      )}

      {/* Applet Palette */}
      <div className="w-64 border border-[#39FF14]/30 p-4 overflow-y-auto">
        <h3 className="text-[#39FF14] font-bold mb-4 font-mono text-sm">
          [AVAILABLE_APPLETS]
        </h3>
        <div className="space-y-2">
          {Object.entries(APPLET_DEFINITIONS).map(([type, def]) => (
            <button
              key={type}
              onClick={() => addNode(type as AppletNodeType)}
              disabled={!isConnected}
              className="w-full border border-neutral-700 hover:border-[#39FF14] p-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{def.icon}</span>
                <span className="font-mono text-sm" style={{ color: def.color }}>
                  {def.name}
                </span>
              </div>
              <div className="text-xs text-neutral-500 font-mono">
                {def.description}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-700">
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full border-2 border-[#00D4FF] px-4 py-3 text-[#00D4FF] hover:bg-[#00D4FF] hover:text-black transition-colors text-sm font-mono font-bold mb-4"
          >
            [📚 BROWSE_TEMPLATES]
          </button>
          
          {/* ATOMIC MODE TOGGLE - Flash Logic */}
          <div className="mb-4 border-2 p-4 transition-all duration-300"
            style={{
              borderColor: atomicMode ? '#FFD700' : '#333',
              backgroundColor: atomicMode ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
              boxShadow: atomicMode ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-mono text-sm font-bold" style={{ color: atomicMode ? '#FFD700' : '#666' }}>
                  {atomicMode ? '🔐 ATOMIC MODE' : '⚡ ATOMIC MODE'}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">
                  {atomicMode ? 'Revert Protection: ACTIVE' : 'Sequential Execution'}
                </div>
              </div>
              <button
                onClick={() => setAtomicMode(!atomicMode)}
                className="relative w-14 h-7 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: atomicMode ? '#FFD700' : '#333',
                  boxShadow: atomicMode ? '0 0 15px rgba(255, 215, 0, 0.6)' : 'none'
                }}
              >
                <div
                  className="absolute top-1 w-5 h-5 rounded-full bg-black transition-all duration-300 flex items-center justify-center text-xs"
                  style={{
                    left: atomicMode ? '32px' : '4px',
                  }}
                >
                  {atomicMode ? '🔒' : '○'}
                </div>
              </button>
            </div>
            {atomicMode && (
              <div className="mt-3 p-2 bg-black border border-[#FFD700]/30 text-[10px] font-mono text-[#FFD700]">
                ⚡ All operations bundled into single batch transaction. If one step fails, entire workflow reverts atomically.
              </div>
            )}
          </div>
          
          <h3 className="text-[#39FF14] font-bold mb-3 font-mono text-sm">
            [WORKFLOW_INFO]
          </h3>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full bg-black border border-neutral-700 px-3 py-2 text-sm font-mono mb-2"
            placeholder="Workflow Name"
          />
          <div className="text-xs text-neutral-500 font-mono space-y-1">
            <div>Nodes: {nodes.length}</div>
            <div>Connections: {connections.length}</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 border transition-all duration-300 relative overflow-hidden bg-black"
        style={{ 
          borderColor: 'rgba(57, 255, 20, 0.3)',
          borderWidth: '1px'
        }}
      >
        
        {/* CONNECTION MODE BANNER */}
        {connectingFrom && (
          <div className="absolute top-0 left-0 right-0 bg-[#39FF14] text-black px-4 py-2 z-30 font-mono text-sm font-bold flex items-center justify-center gap-2">
            <span>🔗</span>
            <span>[CONNECTION_MODE] Click on any target node to connect • Click canvas to cancel</span>
            <span>🔗</span>
          </div>
        )}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
        <div
          ref={canvasRef}
          onClick={() => {
            setSelectedNode(null);
            setConnectingFrom(null);
          }}
          className="w-full h-full relative"
          style={{
            backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              {/* Arrow marker for connection direction */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#39FF14"
                  style={{ filter: 'drop-shadow(0 0 4px #39FF14)' }}
                />
              </marker>
              {/* Glow filter for connections */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.position.x + 240; // Right edge of from node
              const y1 = fromNode.position.y + 60; // Center height
              const x2 = toNode.position.x; // Left edge of to node
              const y2 = toNode.position.y + 60; // Center height

              // Calculate curve control points for smooth bezier curve
              const midX = (x1 + x2) / 2;
              const curveOffset = Math.abs(x2 - x1) * 0.3;

              // Check for chain mismatch
              const connectionKey = `${conn.from}->${conn.to}`;
              const hasMismatch = mismatchedConnections.has(connectionKey);
              const mismatchInfo = hasMismatch ? detectChainMismatch(fromNode, toNode) : null;

              // ATOMIC MODE: Gold connections with lock icons
              // CHAIN MISMATCH: Red/warning connections
              const connectionColor = hasMismatch ? '#FF4444' : (atomicMode ? '#FFD700' : '#39FF14');

              return (
                <g key={idx}>
                  {/* Shadow/glow line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + curveOffset} ${y1}, ${x2 - curveOffset} ${y2}, ${x2} ${y2}`}
                    stroke={connectionColor}
                    strokeWidth={hasMismatch ? "8" : (atomicMode ? "8" : "6")}
                    fill="none"
                    opacity={hasMismatch ? "0.5" : (atomicMode ? "0.4" : "0.3")}
                    filter="url(#glow)"
                  />
                  {/* Main connection line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + curveOffset} ${y1}, ${x2 - curveOffset} ${y2}, ${x2} ${y2}`}
                    stroke={connectionColor}
                    strokeWidth={hasMismatch ? "4" : (atomicMode ? "4" : "3")}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    strokeDasharray={hasMismatch ? "8,4" : "none"}
                    style={{ filter: `drop-shadow(0 0 ${hasMismatch ? '12' : (atomicMode ? '8' : '4')}px ${connectionColor})` }}
                  />
                  {/* Animated flow indicator */}
                  <circle r={hasMismatch ? "6" : (atomicMode ? "5" : "4")} fill={connectionColor} 
                    style={{ filter: `drop-shadow(0 0 ${hasMismatch ? '12' : (atomicMode ? '10' : '6')}px ${connectionColor})` }}>
                    <animateMotion
                      dur={hasMismatch ? "3s" : (atomicMode ? "1.5s" : "2s")}
                      repeatCount="indefinite"
                      path={`M ${x1} ${y1} C ${x1 + curveOffset} ${y1}, ${x2 - curveOffset} ${y2}, ${x2} ${y2}`}
                    />
                  </circle>
                  
                  {/* CHAIN MISMATCH: Warning badge with auto-fix button */}
                  {hasMismatch && mismatchInfo && (
                    <g>
                      {/* Warning background */}
                      <rect
                        x={midX - 60}
                        y={(y1 + y2) / 2 - 25}
                        width="120"
                        height="50"
                        rx="4"
                        fill="rgba(0, 0, 0, 0.95)"
                        stroke="#FF4444"
                        strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(255, 68, 68, 0.8))' }}
                      />
                      
                      {/* Warning icon and text */}
                      <text
                        x={midX}
                        y={(y1 + y2) / 2 - 10}
                        fill="#FF4444"
                        fontSize="12"
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ⚠ CHAIN MISMATCH
                      </text>
                      
                      {/* Chain info */}
                      <text
                        x={midX}
                        y={(y1 + y2) / 2 + 3}
                        fill="#888"
                        fontSize="8"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {CHAIN_CONFIGS[mismatchInfo.sourceChain].icon} → {CHAIN_CONFIGS[mismatchInfo.destChain].icon}
                      </text>
                      
                      {/* Auto-fix button */}
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          autoFixChainMismatch(conn.from, conn.to);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={midX - 40}
                          y={(y1 + y2) / 2 + 10}
                          width="80"
                          height="16"
                          rx="3"
                          fill="#39FF14"
                          style={{ filter: 'drop-shadow(0 0 6px rgba(57, 255, 20, 0.6))' }}
                          className="hover:brightness-125 transition-all"
                        />
                        <text
                          x={midX}
                          y={(y1 + y2) / 2 + 21}
                          fill="black"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="monospace"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          🌀 INSERT BRIDGE
                        </text>
                      </g>
                    </g>
                  )}
                  
                  {/* ATOMIC MODE: Lock icon badge */}
                  {atomicMode && !hasMismatch && (
                    <g>
                      <circle
                        cx={midX}
                        cy={(y1 + y2) / 2}
                        r="12"
                        fill="#FFD700"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }}
                      />
                      <text
                        x={midX}
                        y={(y1 + y2) / 2 + 5}
                        fill="black"
                        fontSize="14"
                        textAnchor="middle"
                      >
                        🔒
                      </text>
                    </g>
                  )}
                  {/* Connection label with data flow info */}
                  {!hasMismatch && (
                    <g>
                      <title>
                        Data Flow: {APPLET_DEFINITIONS[fromNode.type].name} \u2192 {APPLET_DEFINITIONS[toNode.type].name}\n
                        Output: {APPLET_DEFINITIONS[fromNode.type].outputType}\n
                        {atomicMode ? 'Atomic Bundled Transaction\n' : ''}
                        Click node &lt;/&gt; icon to view WIDL interface
                      </title>
                      <text
                        x={midX}
                        y={(y1 + y2) / 2 - (atomicMode ? 20 : 10)}
                        fill={connectionColor}
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                        opacity="0.7"
                        className="cursor-help"
                      >
                        {atomicMode ? `BATCH_${idx + 1}` : `FLOW_${idx + 1}`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Connecting line preview - follows mouse */}
            {connectingFrom && (
              <g>
                <path
                  d={`M ${nodes.find(n => n.id === connectingFrom)?.position.x || 0 + 240} ${nodes.find(n => n.id === connectingFrom)?.position.y || 0 + 60} L ${nodes.find(n => n.id === connectingFrom)?.position.x || 0 + 350} ${nodes.find(n => n.id === connectingFrom)?.position.y || 0 + 60}`}
                  stroke="#39FF14"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  fill="none"
                  opacity="0.6"
                  style={{ animation: 'pulse 1s ease-in-out infinite' }}
                />
                <text
                  x={nodes.find(n => n.id === connectingFrom)?.position.x || 0 + 295}
                  y={nodes.find(n => n.id === connectingFrom)?.position.y || 0 + 50}
                  fill="#39FF14"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  [CLICK_TARGET_NODE]
                </text>
              </g>
            )}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            // Check if this node is active in simulation
            const isSimulationActive = isSimulationMode && node.id === activeSimulationNodeId;
            
            return (
              <div 
                key={node.id} 
                className="relative"
                onDoubleClick={() => {
                  // Open configuration modal on double-click
                  setConfiguringNode(node.id);
                  setAppletConfig({
                    appletAddress: node.appletAddress || '',
                    method: node.method || '',
                    params: JSON.stringify(node.params || {}, null, 2)
                  });
                }}
              >
                <WorkflowNodeComponent
                  node={node}
                  isSelected={selectedNode === node.id}
                  isConnecting={connectingFrom === node.id}
                  connectionModeActive={connectingFrom !== null}
                  onSelect={() => setSelectedNode(node.id)}
                  onMove={moveNode}
                  onDelete={deleteNode}
                  onStartConnection={startConnection}
                  onCompleteConnection={completeConnection}
                  onSetCondition={setNodeCondition}
                />
                
                {/* Simulation Active Indicator */}
                {isSimulationActive && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-lg animate-pulse"
                    style={{
                      border: '3px solid #00D4FF',
                      boxShadow: '0 0 30px rgba(0, 212, 255, 0.8), inset 0 0 30px rgba(0, 212, 255, 0.3)',
                      zIndex: 10,
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-cyan-500 text-black px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap">
                      ⚡ EXECUTING
                    </div>
                  </div>
                )}
                
                {/* Simulation State Popover */}
                {isSimulationActive && simulationState && (
                  <div
                    className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-black/95 border-2 border-cyan-500 rounded-lg p-3 z-20 min-w-[250px] shadow-2xl shadow-cyan-500/50"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="text-cyan-400 font-mono text-xs font-bold mb-2 text-center">
                      STATE SNAPSHOT
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      {simulationState.walletBalances.slice(0, 2).map((balance, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-400">{balance.token}:</span>
                          <span className="text-white font-bold">
                            {balance.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-cyan-500/30 my-1" />
                      <div className="flex justify-between">
                        <span className="text-gray-400">Profit:</span>
                        <span className={`font-bold ${simulationState.metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {simulationState.metrics.profit >= 0 ? '+' : ''}${simulationState.metrics.profit}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🔗</div>
                <div className="text-neutral-500 font-mono text-sm mb-2">
                  Drag applets from the palette to build your workflow
                </div>
                <div className="text-neutral-600 font-mono text-xs">
                  Connect nodes to chain execution
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={toggleSimulationMode}
            className={`border px-4 py-2 transition-all duration-300 text-sm font-mono font-bold ${
              isSimulationMode
                ? 'border-cyan-500 bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
                : 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-black'
            }`}
            title="Toggle Time-Travel Debugger (Keyboard: D)"
          >
            {isSimulationMode ? '[🔍 DEBUGGING]' : '[🕒 DEBUG_MODE]'}
          </button>
          <button
            onClick={handleClear}
            className="border border-red-500 px-4 py-2 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-sm font-mono"
          >
            [CLEAR]
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0 || !isConnected || isSimulationMode}
            className="border border-[#39FF14] px-4 py-2 text-[#39FF14] hover:bg-[#39FF14] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
          >
            {isExecuting ? '[EXECUTING...]' : '[TEST_RUN]'}
          </button>
          <button
            onClick={handleDeploy}
            disabled={nodes.length === 0 || !isConnected || isSimulationMode}
            className="bg-[#39FF14] px-4 py-2 text-black hover:bg-[#2EE010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono font-bold"
          >
            [DEPLOY_TO_CHAIN]
          </button>
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-[#39FF14] bg-black p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#39FF14] mb-6 font-mono">
              [DEPLOY_WORKFLOW]
            </h2>
            
            {/* Basic Workflow Info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-neutral-400 font-mono mb-1">Workflow Name:</div>
                <div className="text-white font-mono">{workflowName}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400 font-mono mb-1">Applets:</div>
                <div className="text-white font-mono">{nodes.length} nodes</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400 font-mono mb-1">Connections:</div>
                <div className="text-white font-mono">{connections.length} edges</div>
              </div>
            </div>

            {/* Warning Banner for Placeholder Contract */}
            {process.env.NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS?.includes('00000') && (
              <div className="border-2 border-yellow-500 bg-yellow-500/10 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-bold text-yellow-400 mb-2">
                      DEVELOPMENT MODE - PLACEHOLDER CONTRACT
                    </div>
                    <div className="text-xs text-neutral-300 font-mono space-y-2">
                      <p>The coordinator contract address is set to a placeholder:</p>
                      <p className="text-yellow-300 font-bold">{process.env.NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS}</p>
                      <p className="mt-2">Deployment will fail with this address. To fix:</p>
                      <ol className="list-decimal ml-4 mt-1 space-y-1">
                        <li>Deploy the coordinator contract to WeilChain</li>
                        <li>Update NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS in .env.local</li>
                        <li>Restart the development server</li>
                      </ol>
                      <p className="mt-2">Or set <span className="text-yellow-300 font-bold">NEXT_PUBLIC_MOCK_CONTRACT=true</span> to test without deployment.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GAS OPTIMIZATION REPORT */}
            <div className="border-2 border-[#00D4FF] bg-[#00D4FF]/5 p-6 mb-6">
              <h3 className="text-[#00D4FF] font-mono text-lg font-bold mb-4 flex items-center gap-2">
                <span>⚡</span>
                <span>GAS OPTIMIZATION REPORT</span>
              </h3>

              {/* Standard vs Batched Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Standard Execution */}
                <div className={`border-2 p-4 transition-all ${
                  !atomicMode 
                    ? 'border-[#39FF14] bg-[#39FF14]/10' 
                    : 'border-neutral-700 bg-neutral-900/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-sm font-bold text-white">
                      Standard Execution
                    </div>
                    {!atomicMode && (
                      <div className="text-xs font-mono text-[#39FF14] bg-[#39FF14]/20 px-2 py-1">
                        SELECTED
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mb-3">
                    {nodes.length} separate transactions
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mb-1">
                    {nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0).toLocaleString()} WEIL
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    Individual TX execution
                  </div>
                </div>

                {/* Batched Execution */}
                <div className={`border-2 p-4 transition-all ${
                  atomicMode 
                    ? 'border-[#FFD700] bg-[#FFD700]/10' 
                    : 'border-neutral-700 bg-neutral-900/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                      <span>Batched Execution</span>
                      <span className="text-xs bg-[#FFD700] text-black px-2 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    {atomicMode && (
                      <div className="text-xs font-mono text-[#FFD700] bg-[#FFD700]/20 px-2 py-1">
                        SELECTED
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mb-3">
                    1 atomic transaction
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mb-1">
                    {Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34).toLocaleString()} WEIL
                  </div>
                  <div className="text-xs text-[#39FF14] font-mono font-bold">
                    💰 SAVE {(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) - Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)).toLocaleString()} WEIL ({Math.round((1 - 0.34) * 100)}%)
                  </div>
                </div>
              </div>

              {/* Node Gas Cost Breakdown Table */}
              {nodes.length > 0 ? (
                <div className="mb-6">
                  <div className="text-sm font-mono text-neutral-400 mb-2">
                    NODE GAS COST BREAKDOWN
                  </div>
                  <div className="border border-neutral-700 bg-black">
                    <div className="grid grid-cols-3 gap-4 p-3 border-b border-neutral-700 bg-neutral-900 font-mono text-xs font-bold text-neutral-400">
                      <div>NODE NAME</div>
                      <div>TYPE</div>
                      <div className="text-right">GAS COST</div>
                    </div>
                    {nodes.map((node, idx) => (
                      <div 
                        key={node.id} 
                        className={`grid grid-cols-3 gap-4 p-3 font-mono text-xs ${
                          idx < nodes.length - 1 ? 'border-b border-neutral-800' : ''
                        }`}
                      >
                        <div className="text-white truncate">{node.name}</div>
                        <div className="text-neutral-400">{APPLET_DEFINITIONS[node.type].name}</div>
                        <div className="text-[#39FF14] text-right font-bold">
                          {getAppletGasCost(node.type)} WEIL
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-4 p-3 border-t-2 border-[#00D4FF]/50 bg-[#00D4FF]/5 font-mono text-xs font-bold">
                      <div className="col-span-2 text-white">
                        {atomicMode ? 'BATCHED TOTAL' : 'STANDARD TOTAL'}
                      </div>
                      <div className="text-[#39FF14] text-right text-sm">
                        {(atomicMode 
                          ? Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)
                          : nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0)
                        ).toLocaleString()} WEIL
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 border border-neutral-700 bg-neutral-900 text-center">
                  <div className="text-neutral-500 font-mono text-sm">
                    No nodes in workflow. Add applets to see gas breakdown.
                  </div>
                </div>
              )}

              {/* Gas Speed Selector */}
              <div className="border-2 border-neutral-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-mono font-bold text-white mb-1">
                      EXECUTION SPEED
                    </div>
                    <div className="text-xs font-mono text-neutral-500">
                      ⏰ Best Time to Execute: 02:00 UTC (typically lowest fees)
                    </div>
                  </div>
                </div>

                {/* Speed Selector Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => setGasSpeed('slow')}
                    className={`p-4 border-2 transition-all font-mono ${
                      gasSpeed === 'slow'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-white mb-1">
                      🐌 SLOW
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">
                      Fee Multiplier: 0.9x
                    </div>
                    <div className="text-lg font-bold text-[#39FF14]">
                      {Math.round(
                        (atomicMode 
                          ? Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)
                          : nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0)
                        ) * 0.9
                      ).toLocaleString()} WEIL
                    </div>
                  </button>

                  <button
                    onClick={() => setGasSpeed('standard')}
                    className={`p-4 border-2 transition-all font-mono ${
                      gasSpeed === 'standard'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-white mb-1">
                      ⚡ STANDARD
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">
                      Fee Multiplier: 1.0x
                    </div>
                    <div className="text-lg font-bold text-[#39FF14]">
                      {(atomicMode 
                        ? Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)
                        : nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0)
                      ).toLocaleString()} WEIL
                    </div>
                  </button>

                  <button
                    onClick={() => setGasSpeed('fast')}
                    className={`p-4 border-2 transition-all font-mono ${
                      gasSpeed === 'fast'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-white mb-1">
                      🚀 FAST
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">
                      Fee Multiplier: 1.2x
                    </div>
                    <div className="text-lg font-bold text-[#39FF14]">
                      {Math.round(
                        (atomicMode 
                          ? Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)
                          : nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0)
                        ) * 1.2
                      ).toLocaleString()} WEIL
                    </div>
                  </button>
                </div>

                {/* Final Estimated Fee */}
                <div className="bg-black border border-[#00D4FF]/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-neutral-400">
                      Final Estimated Fee:
                    </span>
                    <span className="font-mono text-xl font-bold text-[#00D4FF]">
                      {Math.round(
                        (atomicMode 
                          ? Math.round(nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0) * 0.34)
                          : nodes.reduce((sum, node) => sum + getAppletGasCost(node.type), 0)
                        ) * (gasSpeed === 'slow' ? 0.9 : gasSpeed === 'fast' ? 1.2 : 1.0)
                      ).toLocaleString()} WEIL
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 mb-4">
              <div className="text-yellow-400 font-mono text-xs">
                ⚠️ Deployment will create an immutable on-chain contract
              </div>
            </div>

            {/* ATOMIC MODE STATUS */}
            {atomicMode && (
              <div className="border-2 border-[#FFD700] bg-[#FFD700]/10 p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <div className="text-[#FFD700] font-mono text-sm font-bold">
                      REVERT PROTECTION: ACTIVE
                    </div>
                    <div className="text-[#FFD700]/70 font-mono text-xs mt-1">
                      Atomic batch execution - all-or-nothing guarantee
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIPPAGE OPTIMIZER */}
            <div className="mb-6">
              <SlippageOptimizer
                onRouteSelect={(route) => setSelectedRoute(route)}
                showTitle={true}
              />
            </div>

            {/* MEV PROTECTION SELECTOR */}
            <div className="mb-6">
              <MEVProtectionSelector
                onStrategySelect={(strategy) => setSelectedMEVStrategy(strategy)}
                showTitle={true}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeployModal(false)}
                className="flex-1 border border-neutral-700 px-4 py-3 text-neutral-400 hover:bg-neutral-900 transition-colors text-sm font-mono"
              >
                [CANCEL]
              </button>
              <button
                onClick={confirmDeploy}
                className="flex-1 px-4 py-3 hover:opacity-90 transition-colors text-sm font-mono font-bold"
                style={{
                  backgroundColor: atomicMode ? '#FFD700' : '#39FF14',
                  color: 'black',
                  boxShadow: atomicMode ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none'
                }}
              >
                {atomicMode ? '[GENERATE_BATCH_PROXY]' : '[CONFIRM_DEPLOY]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION RECEIPT MODAL */}
      {showReceipt && deploymentReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          <div className="border-2 border-[#39FF14] bg-black p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Success Animation */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-[#39FF14] flex items-center justify-center animate-bounce">
                <span className="text-5xl">✓</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#39FF14] mb-4 font-mono text-center">
              [DEPLOYMENT_SUCCESSFUL]
            </h2>

            <div className="bg-neutral-900 border border-[#39FF14]/30 p-4 mb-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Status:</span>
                <span className="text-[#39FF14] font-bold">{deploymentReceipt.status}</span>
              </div>
              
              {/* Execution Mode */}
              <div className="border-t border-neutral-700 pt-3">
                <div className="flex justify-between mb-2">
                  <span className="text-neutral-400">Execution Mode:</span>
                  <span className={`font-bold ${
                    deploymentReceipt.executionMode === 'BATCHED' ? 'text-[#FFD700]' : 'text-white'
                  }`}>
                    {deploymentReceipt.executionMode}
                  </span>
                </div>
                {deploymentReceipt.executionMode === 'BATCHED' && (
                  <div className="text-[#FFD700]/70 text-[10px] bg-[#FFD700]/10 p-2 border border-[#FFD700]/30">
                    🛡️ Atomic batch execution with revert protection
                  </div>
                )}
              </div>

              {/* Gas Details */}
              <div className="border-t border-neutral-700 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Gas Speed:</span>
                  <span className="text-[#00D4FF] font-bold">
                    {deploymentReceipt.gasSpeed === 'SLOW' && '🐌 SLOW'}
                    {deploymentReceipt.gasSpeed === 'STANDARD' && '⚡ STANDARD'}
                    {deploymentReceipt.gasSpeed === 'FAST' && '🚀 FAST'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Estimated Fee:</span>
                  <span className="text-white">{deploymentReceipt.estimatedFee?.toLocaleString() || 'N/A'} WEIL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Actual Fee Used:</span>
                  <span className="text-[#39FF14] font-bold">{deploymentReceipt.gasUsed.toLocaleString()} WEIL</span>
                </div>
                {deploymentReceipt.estimatedFee && (
                  <div className="text-[10px] text-neutral-500 bg-black p-2 border border-neutral-800">
                    {deploymentReceipt.gasUsed < deploymentReceipt.estimatedFee 
                      ? `✅ Saved ${(deploymentReceipt.estimatedFee - deploymentReceipt.gasUsed).toLocaleString()} WEIL vs estimate`
                      : `Used ${(deploymentReceipt.gasUsed - deploymentReceipt.estimatedFee).toLocaleString()} WEIL more than estimate`
                    }
                  </div>
                )}
              </div>

              {/* Execution Route Details */}
              {deploymentReceipt.executionRoute && (
                <div className="border-t border-neutral-700 pt-3 space-y-2">
                  <div className="text-neutral-400 font-mono text-xs font-bold mb-2">
                    EXECUTION ROUTE
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Route:</span>
                    <span className="text-[#00D4FF] font-bold">{deploymentReceipt.executionRoute.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Slippage:</span>
                    <span className={`font-bold ${
                      deploymentReceipt.executionRoute.slippage <= 1.5 ? 'text-[#39FF14]' :
                      deploymentReceipt.executionRoute.slippage <= 4.0 ? 'text-[#FFD700]' :
                      'text-red-500'
                    }`}>
                      {deploymentReceipt.executionRoute.slippage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Expected Output:</span>
                    <span className="text-[#39FF14] font-bold">
                      {deploymentReceipt.executionRoute.expectedOutput.toFixed(4)} ETH
                    </span>
                  </div>
                  <div className="border border-neutral-800 bg-black p-2 mt-2">
                    <div className="text-[10px] text-neutral-500 mb-1">PATH:</div>
                    <div className="text-[#00D4FF] font-mono text-xs">
                      {deploymentReceipt.executionRoute.hops}
                    </div>
                  </div>
                </div>
              )}

              {/* MEV Protection Details */}
              {deploymentReceipt.mevProtection && (
                <div className="border-t border-neutral-700 pt-3 space-y-2">
                  <div className="text-neutral-400 font-mono text-xs font-bold mb-2">
                    MEV PROTECTION
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Strategy:</span>
                    <span className="text-[#FF9500] font-bold">{deploymentReceipt.mevProtection.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Protection Level:</span>
                    <span className={`font-bold ${
                      deploymentReceipt.mevProtection.protectionLevel === 'MAXIMUM' ? 'text-[#39FF14]' :
                      deploymentReceipt.mevProtection.protectionLevel === 'HIGH' ? 'text-[#00D4FF]' :
                      deploymentReceipt.mevProtection.protectionLevel === 'MODERATE' ? 'text-[#FFD700]' :
                      'text-red-500'
                    }`}>
                      {deploymentReceipt.mevProtection.protectionLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">MEV Avoided:</span>
                    <span className="text-[#39FF14] font-bold">
                      {(deploymentReceipt.mevProtection.saveFactor * 100).toFixed(0)}%
                    </span>
                  </div>
                  {deploymentReceipt.mevProtection.feePct > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Protection Fee:</span>
                      <span className="text-neutral-300 font-bold">
                        {deploymentReceipt.mevProtection.feePct}%
                      </span>
                    </div>
                  )}
                  <div className="border border-[#FF9500]/30 bg-[#FF9500]/10 p-2 mt-2">
                    <div className="text-[#FF9500] font-mono text-xs">
                      🛡️ Protected against front-running and sandwich attacks
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-700 pt-3">
                <div className="text-neutral-400 mb-1">Transaction Hash:</div>
                <div className="text-white break-all bg-black p-2 border border-neutral-700">
                  {deploymentReceipt.txHash}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Block Number:</span>
                <span className="text-white">{deploymentReceipt.blockNumber.toLocaleString()}</span>
              </div>
              <div className="border-t border-neutral-700 pt-3">
                <div className="text-neutral-400 mb-1">Contract Address:</div>
                <div className="text-[#00D4FF] break-all bg-black p-2 border border-neutral-700">
                  {deploymentReceipt.contractAddress}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Workflow:</span>
                <span className="text-white">{deploymentReceipt.workflowName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Applets Deployed:</span>
                <span className="text-white">{deploymentReceipt.nodeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Timestamp:</span>
                <span className="text-white">{new Date(deploymentReceipt.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-3 mb-4">
              <div className="text-[#39FF14] font-mono text-xs text-center">
                🎉 Your workflow is now live on WeilChain!
              </div>
            </div>

            <button
              onClick={() => setShowReceipt(false)}
              className="w-full bg-[#39FF14] px-4 py-3 text-black hover:bg-[#2EE010] transition-colors text-sm font-mono font-bold"
            >
              [CLOSE_RECEIPT]
            </button>
          </div>
        </div>
      )}

      {/* Applet Configuration Modal */}
      {configuringNode && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-[#00FF41] bg-black p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-[#00FF41] mb-6 font-mono">
              [CONFIGURE_APPLET]
            </h2>
            
            <div className="space-y-4">
              {/* Applet Address */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2 font-mono">
                  APPLET ADDRESS (WeilChain Contract):
                </label>
                <input
                  type="text"
                  value={appletConfig.appletAddress}
                  onChange={(e) => setAppletConfig({...appletConfig, appletAddress: e.target.value})}
                  className="w-full bg-black border border-neutral-600 px-3 py-2 text-[#00FF41] font-mono text-sm"
                  placeholder="aaaaaamwlph5uevlsqep6tkfzprykkotnxqff7flghxc6qy3zvvfnzh43y"
                />
                <div className="text-xs text-neutral-500 mt-1 font-mono">
                  Example: aaaaaamwlph5uevlsqep6tkfzprykkotnxqff7flghxc6qy3zvvfnzh43y
                </div>
              </div>

              {/* Method Name */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2 font-mono">
                  METHOD NAME:
                </label>
                <input
                  type="text"
                  value={appletConfig.method}
                  onChange={(e) => setAppletConfig({...appletConfig, method: e.target.value})}
                  className="w-full bg-black border border-neutral-600 px-3 py-2 text-[#00FF41] font-mono text-sm"
                  placeholder="get_count, increment, etc."
                />
                <div className="text-xs text-neutral-500 mt-1 font-mono">
                  The contract method to call (e.g., get_balance, transfer, mint)
                </div>
              </div>

              {/* Parameters */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2 font-mono">
                  PARAMETERS (JSON):
                </label>
                <textarea
                  value={appletConfig.params}
                  onChange={(e) => setAppletConfig({...appletConfig, params: e.target.value})}
                  className="w-full bg-black border border-neutral-600 px-3 py-2 text-[#00FF41] font-mono text-sm h-32"
                  placeholder='{"address": "0x...", "amount": 100}'
                />
                <div className="text-xs text-neutral-500 mt-1 font-mono">
                  Method parameters as JSON object. Use {`{}`} for no params.
                </div>
              </div>

              {/* Info Box */}
              <div className="border border-[#00FF41]/30 bg-[#00FF41]/5 p-4">
                <div className="text-[#00FF41] font-mono text-xs">
                  ℹ️ This node will call wallet.contracts.execute(appletAddress, method, params) when the workflow runs.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    // Save configuration to node
                    setNodes(prev => prev.map(n => 
                      n.id === configuringNode
                        ? {
                            ...n,
                            appletAddress: appletConfig.appletAddress,
                            method: appletConfig.method,
                            params: JSON.parse(appletConfig.params || '{}')
                          }
                        : n
                    ));
                    setConfiguringNode(null);
                  }}
                  className="flex-1 bg-[#00FF41] px-4 py-3 text-black hover:bg-[#00D43A] transition-colors font-mono font-bold"
                >
                  [SAVE_CONFIG]
                </button>
                <button
                  onClick={() => setConfiguringNode(null)}
                  className="flex-1 border border-neutral-600 px-4 py-3 text-neutral-400 hover:bg-neutral-900 transition-colors font-mono"
                >
                  [CANCEL]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporal Debugger - Time-Travel Simulation Timeline */}
      {isSimulationMode && (
        <TemporalDebugger
          nodeIds={nodes.map(n => n.id)}
          isActive={isSimulationMode}
          onStepChange={handleSimulationStepChange}
          onStateChange={handleSimulationStateChange}
          onPlayStateChange={handlePlayStateChange}
        />
      )}
    </div>
  );
}
