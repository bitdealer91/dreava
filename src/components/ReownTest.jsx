import React from 'react';
import { useReownWallet } from '../hooks/useReownWallet';

const ReownTest = () => {
  const wallet = useReownWallet();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧪 Reown Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Статус кошелька */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">💰 Wallet Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Connected:</span>
                <span className={wallet.isConnected ? 'text-green-400' : 'text-red-400'}>
                  {wallet.isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Loading:</span>
                <span className={wallet.isLoading ? 'text-yellow-400' : 'text-green-400'}>
                  {wallet.isLoading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Address:</span>
                <span className="text-blue-400 font-mono text-sm">
                  {wallet.address || 'Not connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chain ID:</span>
                <span className="text-purple-400">
                  {wallet.chainId || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className="text-green-400">
                  {wallet.balance ? `${wallet.balance} STT` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          {/* Действия */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">🔧 Actions</h2>
            <div className="space-y-3">
              <button
                onClick={wallet.connect}
                disabled={wallet.isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                {wallet.isLoading ? 'Initializing...' : 'Connect Wallet'}
              </button>
              
              <button
                onClick={wallet.disconnect}
                disabled={!wallet.isConnected}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Disconnect
              </button>
              
              <button
                onClick={() => wallet.switchNetwork(50312)}
                disabled={!wallet.isConnected || wallet.chainId === 50312}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Switch to Somnia Testnet
              </button>
            </div>
          </div>

          {/* Reown AppKit Info */}
          <div className="bg-gray-900 p-6 rounded-lg md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">🔍 Reown AppKit Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>AppKit Initialized:</span>
                <span className={wallet.reown.appKitState.initialized ? 'text-green-400' : 'text-red-400'}>
                  {wallet.reown.appKitState.initialized ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AppKit Instance:</span>
                <span className="text-blue-400">
                  {wallet.reown.appKit ? 'Available' : 'Not available'}
                </span>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-gray-900 p-6 rounded-lg md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">🐛 Debug Info</h2>
            <div className="bg-gray-800 p-4 rounded-lg">
              <pre className="text-sm text-gray-300 overflow-x-auto">
                {JSON.stringify({
                  wallet: {
                    isConnected: wallet.isConnected,
                    isLoading: wallet.isLoading,
                    address: wallet.address,
                    chainId: wallet.chainId,
                    balance: wallet.balance
                  },
                  reown: {
                    appKitState: wallet.reown.appKitState,
                    appKitNetwork: wallet.reown.appKitNetwork,
                    appKitAccount: wallet.reown.appKitAccount,
                    appKitBalance: wallet.reown.appKitBalance
                  }
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReownTest; 