'use client';

import { useState, useEffect } from 'react';
import { ExecutionLogEntry, APPLET_DEFINITIONS } from '@/lib/workflow-types';
import { getExecutionHistory, clearExecutionHistory } from '@/lib/workflow-engine';

export function WorkflowExecutionLog() {
  const [executions, setExecutions] = useState<ExecutionLogEntry[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionLogEntry | null>(null);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = () => {
    const history = getExecutionHistory();
    setExecutions(history);
  };

  const handleClear = () => {
    if (confirm('Clear all execution history?')) {
      clearExecutionHistory();
      setExecutions([]);
      setSelectedExecution(null);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-250px)]">
      {/* Execution List */}
      <div className="w-96 border border-[#39FF14]/30 overflow-y-auto">
        <div className="sticky top-0 bg-black border-b border-[#39FF14]/30 p-4 flex items-center justify-between">
          <h3 className="text-[#39FF14] font-bold font-mono text-sm">
            [EXECUTION_LOG]
          </h3>
          {executions.length > 0 && (
            <button
              onClick={handleClear}
              className="text-red-500 hover:text-red-400 text-xs font-mono"
            >
              [CLEAR]
            </button>
          )}
        </div>

        {executions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-neutral-500 font-mono text-sm">
              No execution history yet
            </div>
            <div className="text-neutral-600 font-mono text-xs mt-2">
              Execute workflows to see logs here
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {executions.map((exec) => (
              <button
                key={exec.id}
                onClick={() => setSelectedExecution(exec)}
                className={`w-full p-4 text-left hover:bg-neutral-900 transition-colors ${
                  selectedExecution?.id === exec.id ? 'bg-neutral-900 border-l-2 border-[#39FF14]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-sm text-white">
                    {exec.workflowName}
                  </div>
                  <div
                    className={`text-xs font-mono px-2 py-1 ${
                      exec.status === 'completed'
                        ? 'text-[#39FF14] border border-[#39FF14]'
                        : 'text-red-500 border border-red-500'
                    }`}
                  >
                    {exec.status.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
                  <span>{formatTimestamp(exec.timestamp)}</span>
                  <span>•</span>
                  <span>{exec.nodeExecutions.length} nodes</span>
                  <span>•</span>
                  <span>{formatDuration(exec.totalDuration)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Execution Details */}
      <div className="flex-1 border border-[#39FF14]/30 overflow-y-auto">
        {selectedExecution ? (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#39FF14] font-mono">
                  {selectedExecution.workflowName}
                </h2>
                <div
                  className={`text-sm font-mono px-3 py-1 border ${
                    selectedExecution.status === 'completed'
                      ? 'text-[#39FF14] border-[#39FF14]'
                      : 'text-red-500 border-red-500'
                  }`}
                >
                  {selectedExecution.status.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-400 font-mono">
                <span>ID: {selectedExecution.id}</span>
                <span>•</span>
                <span>Executed: {new Date(selectedExecution.timestamp).toLocaleString()}</span>
                <span>•</span>
                <span>Duration: {formatDuration(selectedExecution.totalDuration)}</span>
              </div>
            </div>

            {/* Execution Timeline */}
            <div className="space-y-4">
              <h3 className="text-[#39FF14] font-bold font-mono text-sm mb-4">
                [EXECUTION_TIMELINE]
              </h3>

              {selectedExecution.nodeExecutions.map((node, idx) => {
                const appletType = Object.entries(APPLET_DEFINITIONS).find(
                  ([_, def]) => def.name === node.nodeName
                )?.[0];
                const definition = appletType ? APPLET_DEFINITIONS[appletType as keyof typeof APPLET_DEFINITIONS] : null;

                return (
                  <div key={idx} className="relative pl-8">
                    {/* Timeline line */}
                    {idx < selectedExecution.nodeExecutions.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-neutral-800"></div>
                    )}

                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 border-black ${
                        node.status === 'success'
                          ? 'bg-[#39FF14]'
                          : node.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-neutral-600'
                      }`}
                    ></div>

                    {/* Node card */}
                    <div className="border border-neutral-800 p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {definition && <span className="text-xl">{definition.icon}</span>}
                          <div
                            className="font-mono text-sm font-bold"
                            style={{ color: definition?.color || '#39FF14' }}
                          >
                            {node.nodeName}
                          </div>
                        </div>
                        <div
                          className={`text-xs font-mono px-2 py-1 ${
                            node.status === 'success'
                              ? 'text-[#39FF14] border border-[#39FF14]'
                              : node.status === 'failed'
                              ? 'text-red-500 border border-red-500'
                              : 'text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {node.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 font-mono mb-3">
                        Duration: {formatDuration(node.endTime - node.startTime)}
                      </div>

                      {/* Output */}
                      {node.output && (
                        <div className="bg-neutral-900 border border-neutral-800 p-3">
                          <div className="text-xs text-[#39FF14] font-mono mb-2">
                            [OUTPUT_DATA]
                          </div>
                          <pre className="text-xs text-neutral-400 font-mono overflow-x-auto">
                            {JSON.stringify(node.output, null, 2)}
                          </pre>
                        </div>
                      )}

                      {node.error && (
                        <div className="bg-red-950 border border-red-500 p-3">
                          <div className="text-xs text-red-500 font-mono mb-1">
                            [ERROR]
                          </div>
                          <div className="text-xs text-red-300 font-mono">
                            {node.error}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-8 border-t border-neutral-800 pt-6">
              <h3 className="text-[#39FF14] font-bold font-mono text-sm mb-4">
                [EXECUTION_SUMMARY]
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-neutral-800 p-4">
                  <div className="text-2xl font-bold text-[#39FF14] mb-1">
                    {selectedExecution.nodeExecutions.length}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    Total Nodes
                  </div>
                </div>
                <div className="border border-neutral-800 p-4">
                  <div className="text-2xl font-bold text-[#39FF14] mb-1">
                    {selectedExecution.nodeExecutions.filter(n => n.status === 'success').length}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    Successful
                  </div>
                </div>
                <div className="border border-neutral-800 p-4">
                  <div className="text-2xl font-bold text-neutral-400 mb-1">
                    {formatDuration(selectedExecution.totalDuration)}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    Total Time
                  </div>
                </div>
              </div>
            </div>

            {/* On-Chain Record Notice */}
            <div className="mt-6 border border-[#39FF14] p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⛓️</div>
                <div>
                  <div className="text-[#39FF14] font-mono text-sm font-bold mb-1">
                    [ON_CHAIN_RECORD]
                  </div>
                  <div className="text-neutral-400 font-mono text-xs mb-2">
                    This execution is recorded on WeilChain for auditability
                  </div>
                  <div className="text-neutral-500 font-mono text-xs">
                    TX: 0x{selectedExecution.id.slice(5)}...{selectedExecution.id.slice(-6)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <div className="text-neutral-500 font-mono text-sm">
                Select an execution to view details
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
