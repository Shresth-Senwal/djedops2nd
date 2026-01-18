'use client';

/**
 * Wallet Debug Page
 * 
 * This page helps diagnose wallet connection issues by:
 * 1. Detecting all possible wallet injection points
 * 2. Testing different method names
 * 3. Logging response formats
 */

import { useState } from 'react';

export default function WalletDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<any>(null);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const detectWallet = () => {
    setLogs([]);
    addLog('=== Wallet Detection Started ===');
    
    if (typeof window === 'undefined') {
      addLog('ERROR: Window object not available');
      return;
    }

    const win = window as any;
    
    // Check all possible injection points
    const checkPoints = [
      'WeilWallet',
      'weilWallet', 
      'weil',
      'weilliptic',
      'wauth',
      'WAuth',
      'ethereum', // For testing with MetaMask
    ];

    addLog('\n--- Checking Injection Points ---');
    checkPoints.forEach(point => {
      if (win[point]) {
        addLog(`✅ Found: window.${point}`);
        addLog(`   Type: ${typeof win[point]}`);
        addLog(`   Constructor: ${win[point].constructor?.name || 'unknown'}`);
        
        // List available methods
        const methods = Object.keys(win[point]).filter(k => typeof win[point][k] === 'function');
        if (methods.length > 0) {
          addLog(`   Methods: ${methods.join(', ')}`);
        }
        
        // Check specific properties
        const props = ['isConnected', 'isSetUp', 'isUnlocked', 'request', 'accounts'];
        props.forEach(prop => {
          if (prop in win[point]) {
            addLog(`   Has ${prop}: ${typeof win[point][prop]}`);
          }
        });
      } else {
        addLog(`❌ Not found: window.${point}`);
      }
    });

    // Check for any weil-related properties
    addLog('\n--- All Weil-related Properties ---');
    const allKeys = Object.keys(win);
    const weilKeys = allKeys.filter(k => 
      k.toLowerCase().includes('weil') || 
      k.toLowerCase().includes('wauth')
    );
    
    if (weilKeys.length > 0) {
      addLog(`Found: ${weilKeys.join(', ')}`);
    } else {
      addLog('No weil-related properties found');
    }
  };

  const testConnection = async () => {
    addLog('\n=== Testing Connection ===');
    
    const win = window as any;
    const wallet = win.WeilWallet || win.weilWallet || win.weil || win.weilliptic;
    
    if (!wallet) {
      addLog('ERROR: No wallet found');
      return;
    }

    try {
      // Test isSetUp
      if (wallet.isSetUp) {
        const isSetUp = await wallet.isSetUp();
        addLog(`isSetUp(): ${isSetUp}`);
      }

      // Test isUnlocked
      if (wallet.isUnlocked) {
        const isUnlocked = await wallet.isUnlocked();
        addLog(`isUnlocked(): ${isUnlocked}`);
      }

      // Test isConnected
      if (wallet.isConnected) {
        const isConnected = typeof wallet.isConnected === 'function' 
          ? await wallet.isConnected() 
          : wallet.isConnected;
        addLog(`isConnected: ${isConnected}`);
      }

      // Try different account request methods
      const methods = [
        'weil_requestAccounts',
        'weil_accounts',
        'eth_requestAccounts', // For MetaMask
        'eth_accounts',
        'requestAccounts',
        'getAccounts',
      ];

      for (const method of methods) {
        try {
          addLog(`\nTrying method: ${method}`);
          const result = await wallet.request({ method });
          addLog(`✅ ${method} SUCCESS`);
          addLog(`   Response: ${JSON.stringify(result, null, 2)}`);
          setAccounts(result);
          break;
        } catch (err: any) {
          addLog(`❌ ${method} failed: ${err.message}`);
        }
      }

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 WeilWallet Debug Panel</h1>
        
        <div className="flex gap-4 mb-8">
          <button
            onClick={detectWallet}
            className="px-6 py-3 bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30"
          >
            1. Detect Wallet
          </button>
          
          <button
            onClick={testConnection}
            className="px-6 py-3 bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30"
          >
            2. Test Connection
          </button>
          
          <button
            onClick={() => setLogs([])}
            className="px-6 py-3 bg-red-500/20 border-2 border-red-400 text-red-400 hover:bg-red-500/30"
          >
            Clear Logs
          </button>
        </div>

        {accounts && (
          <div className="mb-8 p-4 bg-green-900/20 border-2 border-green-400">
            <h2 className="text-xl font-bold mb-2">✅ Accounts Retrieved</h2>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(accounts, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-900 border-2 border-green-400 p-4">
          <h2 className="text-xl font-bold mb-4">Console Output</h2>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Click "Detect Wallet" to start...</p>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i}
                  className={`text-sm ${
                    log.includes('ERROR') ? 'text-red-400' :
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('SUCCESS') ? 'text-green-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-900/20 border-2 border-yellow-400 text-yellow-400">
          <h3 className="font-bold mb-2">📋 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Make sure your WeilWallet browser extension is installed and unlocked</li>
            <li>Click "Detect Wallet" to see all available wallet objects</li>
            <li>Click "Test Connection" to try different account request methods</li>
            <li>Check the console output for detailed information</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
