/**
 * Applet Tester Component
 * 
 * Test interaction with a specific WeilChain applet
 * Allows calling methods and viewing results
 */

'use client';

import { useState } from 'react';
import { useWAuth } from '@/lib/hooks/useWAuth';

export default function AppletTester() {
  const { isConnected, address, connect, executeContract } = useWAuth();
  const [appletAddress, setAppletAddress] = useState('aaaaaamwlph5uevlsqep6tkfzprykkotnxqff7flghxc6qy3zvvfnzh43y');
  const [balance, setBalance] = useState<string | null>(null);
  const [appletInfo, setAppletInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customMethod, setCustomMethod] = useState('');
  const [customParams, setCustomParams] = useState('{}');
  const [customResult, setCustomResult] = useState<any>(null);

  /**
   * Get balance from applet
   */
  const handleGetBalance = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[AppletTester] Getting balance from ${appletAddress}`);
      
      // Try common balance methods
      const methods = ['get_balance', 'balance', 'getBalance', 'balanceOf'];
      
      for (const method of methods) {
        try {
          const result = await executeContract(
            appletAddress,
            method,
            { address: address }
          );
          
          console.log(`[AppletTester] ${method} result:`, result);
          
          // Handle Result<T, Error> format
          let data = result;
          if (result && typeof result === 'object' && 'txn_result' in result) {
            data = JSON.parse(result.txn_result);
          }
          
          if (data && typeof data === 'object' && 'Ok' in data) {
            setBalance(JSON.stringify(data.Ok, null, 2));
            break;
          } else if (data && typeof data === 'object' && 'Err' in data) {
            console.log(`[AppletTester] ${method} returned error:`, data.Err);
            continue;
          } else {
            setBalance(JSON.stringify(data, null, 2));
            break;
          }
        } catch (err) {
          console.log(`[AppletTester] ${method} not found, trying next...`);
          continue;
        }
      }
      
      if (!balance) {
        setError('No balance method found. Try custom method call.');
      }
    } catch (err: any) {
      console.error('[AppletTester] Error:', err);
      setError(err.message || 'Failed to get balance');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get applet info
   */
  const handleGetInfo = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[AppletTester] Getting info from ${appletAddress}`);
      
      // Try common info methods
      const methods = ['get_info', 'info', 'getInfo', 'metadata', 'get_metadata'];
      
      for (const method of methods) {
        try {
          const result = await executeContract(
            appletAddress,
            method,
            {}
          );
          
          console.log(`[AppletTester] ${method} result:`, result);
          
          // Handle Result<T, Error> format
          let data = result;
          if (result && typeof result === 'object' && 'txn_result' in result) {
            data = JSON.parse(result.txn_result);
          }
          
          if (data && typeof data === 'object' && 'Ok' in data) {
            setAppletInfo(data.Ok);
            break;
          } else if (data && typeof data === 'object' && 'Err' in data) {
            console.log(`[AppletTester] ${method} returned error:`, data.Err);
            continue;
          } else {
            setAppletInfo(data);
            break;
          }
        } catch (err) {
          console.log(`[AppletTester] ${method} not found, trying next...`);
          continue;
        }
      }
      
      if (!appletInfo) {
        setError('No info method found. Try custom method call.');
      }
    } catch (err: any) {
      console.error('[AppletTester] Error:', err);
      setError(err.message || 'Failed to get applet info');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute custom method
   */
  const handleCustomMethod = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!customMethod) {
      alert('Enter a method name');
      return;
    }

    setLoading(true);
    setError(null);
    setCustomResult(null);

    try {
      console.log(`[AppletTester] Calling ${customMethod} on ${appletAddress}`);
      
      // Parse params
      let params = {};
      try {
        params = JSON.parse(customParams);
      } catch (e) {
        alert('Invalid JSON in parameters');
        setLoading(false);
        return;
      }
      
      const result = await executeContract(
        appletAddress,
        customMethod,
        params
      );
      
      console.log(`[AppletTester] ${customMethod} result:`, result);
      
      // Handle Result<T, Error> format
      let data = result;
      if (result && typeof result === 'object' && 'txn_result' in result) {
        data = JSON.parse(result.txn_result);
      }
      
      if (data && typeof data === 'object' && 'Ok' in data) {
        setCustomResult({ success: true, data: data.Ok });
      } else if (data && typeof data === 'object' && 'Err' in data) {
        setCustomResult({ success: false, error: data.Err });
      } else {
        setCustomResult({ success: true, data });
      }
    } catch (err: any) {
      console.error('[AppletTester] Error:', err);
      setCustomResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#00FF41] p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b border-[#00FF41] pb-4">
          [APPLET_TESTER]
        </h1>

        {/* Connection Status */}
        <div className="mb-8 border border-[#00FF41] p-4">
          <div className="mb-2">
            <span className="text-gray-400">STATUS:</span> {isConnected ? '✓ CONNECTED' : '✗ NOT CONNECTED'}
          </div>
          {isConnected && address && (
            <div>
              <span className="text-gray-400">ADDRESS:</span> {address.slice(0, 10)}...{address.slice(-8)}
            </div>
          )}
          {!isConnected && (
            <button
              onClick={connect}
              className="mt-2 border border-[#00FF41] px-4 py-2 hover:bg-[#00FF41] hover:text-black transition-colors"
            >
              [CONNECT_WALLET]
            </button>
          )}
        </div>

        {/* Applet Address */}
        <div className="mb-8 border border-[#00FF41] p-4">
          <div className="mb-2 text-gray-400">APPLET ADDRESS:</div>
          <input
            type="text"
            value={appletAddress}
            onChange={(e) => setAppletAddress(e.target.value)}
            className="w-full bg-black border border-gray-600 px-2 py-1 text-[#00FF41] font-mono"
            placeholder="Enter applet address"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 border border-red-500 bg-red-950 bg-opacity-20 p-4 text-red-500">
            [ERROR] {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 border border-[#00FF41] p-4">
          <div className="mb-4 text-xl font-bold">[QUICK_ACTIONS]</div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGetBalance}
              disabled={loading || !isConnected}
              className="border border-[#00FF41] px-4 py-3 hover:bg-[#00FF41] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '[LOADING...]' : '[GET_BALANCE]'}
            </button>
            <button
              onClick={handleGetInfo}
              disabled={loading || !isConnected}
              className="border border-[#00FF41] px-4 py-3 hover:bg-[#00FF41] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '[LOADING...]' : '[GET_INFO]'}
            </button>
          </div>
        </div>

        {/* Balance Display */}
        {balance && (
          <div className="mb-8 border border-[#00FF41] p-4">
            <div className="mb-2 text-xl font-bold">[BALANCE]</div>
            <pre className="bg-gray-900 p-4 overflow-x-auto text-sm">{balance}</pre>
          </div>
        )}

        {/* Applet Info Display */}
        {appletInfo && (
          <div className="mb-8 border border-[#00FF41] p-4">
            <div className="mb-2 text-xl font-bold">[APPLET_INFO]</div>
            <pre className="bg-gray-900 p-4 overflow-x-auto text-sm">{JSON.stringify(appletInfo, null, 2)}</pre>
          </div>
        )}

        {/* Custom Method Call */}
        <div className="border border-yellow-500 p-4">
          <div className="mb-4 text-xl font-bold text-yellow-500">[CUSTOM_METHOD]</div>
          
          <div className="mb-4">
            <div className="mb-2 text-gray-400">METHOD NAME:</div>
            <input
              type="text"
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              className="w-full bg-black border border-gray-600 px-2 py-1 text-[#00FF41] font-mono"
              placeholder="e.g., get_balance, transfer, etc."
            />
          </div>

          <div className="mb-4">
            <div className="mb-2 text-gray-400">PARAMETERS (JSON):</div>
            <textarea
              value={customParams}
              onChange={(e) => setCustomParams(e.target.value)}
              className="w-full bg-black border border-gray-600 px-2 py-1 text-[#00FF41] font-mono h-24"
              placeholder='{"param1": "value1", "param2": 123}'
            />
          </div>

          <button
            onClick={handleCustomMethod}
            disabled={loading || !isConnected}
            className="w-full border border-yellow-500 px-4 py-3 hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-yellow-500"
          >
            {loading ? '[EXECUTING...]' : '[EXECUTE_METHOD]'}
          </button>

          {/* Custom Result Display */}
          {customResult && (
            <div className="mt-4 border border-yellow-500 p-4">
              <div className="mb-2 font-bold">
                {customResult.success ? '[SUCCESS]' : '[ERROR]'}
              </div>
              <pre className="bg-gray-900 p-4 overflow-x-auto text-sm">
                {JSON.stringify(customResult.success ? customResult.data : customResult.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
