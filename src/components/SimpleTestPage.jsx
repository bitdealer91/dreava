import React, { useState, useEffect } from 'react';

const SimpleTestPage = () => {
  const [walletStatus, setWalletStatus] = useState({
    hasEthereum: false,
    ethereumType: 'None',
    metaMaskAvailable: false,
    pageLoaded: false
  });

  useEffect(() => {
    // Проверяем статус кошельков
    const checkWalletStatus = () => {
      const hasEthereum = !!window.ethereum;
      const ethereumType = window.ethereum ? 
        (window.ethereum.isMetaMask ? 'MetaMask' :
         window.ethereum.isWalletConnect ? 'WalletConnect' :
         window.ethereum.isCoinbaseWallet ? 'CoinbaseWallet' :
         window.ethereum.isNightlyWallet ? 'NightlyWallet' :
         window.ethereum.isBackpack ? 'Backpack' :
         window.ethereum.isEVMAsk ? 'EVM Ask' :
         window.ethereum.isReown ? 'Reown' : 'Unknown') : 'None';
      
      setWalletStatus({
        hasEthereum,
        ethereumType,
        metaMaskAvailable: window.ethereum?.isMetaMask || false,
        pageLoaded: true
      });
    };

    // Проверяем сразу
    checkWalletStatus();
    
    // Проверяем каждые 2 секунды
    const interval = setInterval(checkWalletStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">🧪 Simple Test Page</h1>
        
        {/* Статус загрузки */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Page Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">Page Loaded</div>
              <div className={`text-2xl font-bold ${walletStatus.pageLoaded ? 'text-green-400' : 'text-red-400'}`}>
                {walletStatus.pageLoaded ? '✓ Yes' : '✗ No'}
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">React Working</div>
              <div className="text-2xl font-bold text-green-400">
                ✓ Yes
              </div>
            </div>
          </div>
        </div>
        
        {/* Статус кошельков */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Wallet Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">Ethereum Provider</div>
              <div className={`text-2xl font-bold ${walletStatus.hasEthereum ? 'text-green-400' : 'text-red-400'}`}>
                {walletStatus.hasEthereum ? '✓ Available' : '✗ Not Available'}
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">Provider Type</div>
              <div className="text-2xl font-bold text-blue-400">
                {walletStatus.ethereumType}
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">MetaMask</div>
              <div className={`text-2xl font-bold ${walletStatus.metaMaskAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {walletStatus.metaMaskAvailable ? '✓ Active' : '✗ Inactive'}
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-lg font-medium">Console Errors</div>
              <div className="text-2xl font-bold text-yellow-400">
                Check F12
              </div>
            </div>
          </div>
        </div>

        {/* Информация о системе */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">System Info</h2>
          <div className="space-y-2 text-sm">
            <div>User Agent: {navigator.userAgent}</div>
            <div>Platform: {navigator.platform}</div>
            <div>Language: {navigator.language}</div>
            <div>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</div>
            <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
            <div>Window Ethereum: {window.ethereum ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Тестовые кнопки */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Reload Page
            </button>
            
            <button 
              onClick={() => console.log('Current ethereum:', window.ethereum)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Log Ethereum to Console
            </button>
            
            <button 
              onClick={() => {
                try {
                  if (window.ethereum?.request) {
                    window.ethereum.request({ method: 'eth_chainId' })
                      .then(chainId => console.log('Chain ID:', chainId))
                      .catch(error => console.error('Chain ID error:', error));
                  } else {
                    console.log('No ethereum.request method available');
                  }
                } catch (error) {
                  console.error('Chain ID test failed:', error);
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
            >
              Test Chain ID
            </button>
          </div>
        </div>

        {/* Инструкции */}
        <div className="bg-blue-900 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
          <div className="space-y-2 text-sm">
            <div>1. Откройте консоль браузера (F12)</div>
            <div>2. Проверьте, нет ли ошибок</div>
            <div>3. Убедитесь, что MetaMask работает</div>
            <div>4. Если все работает, можно будет добавить Reown позже</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestPage; 