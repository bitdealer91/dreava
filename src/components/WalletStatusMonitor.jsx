import React, { useState, useEffect } from 'react';
import { hasExistingWalletProvider, getActiveProviderInfo, checkNetworkAvailability } from '../utils/walletUtils';

const WalletStatusMonitor = ({ enabled = false }) => {
  const [walletStatus, setWalletStatus] = useState({
    hasProvider: false,
    providerType: null,
    networkAvailable: false,
    lastCheck: null
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkWalletStatus = async () => {
      try {
        const hasProvider = hasExistingWalletProvider();
        const providerType = getActiveProviderInfo();
        const networkAvailable = await checkNetworkAvailability();

        setWalletStatus({
          hasProvider,
          providerType,
          networkAvailable,
          lastCheck: new Date().toLocaleTimeString()
        });
      } catch (error) {
        console.error('Wallet status check failed:', error);
        setWalletStatus(prev => ({
          ...prev,
          lastCheck: new Date().toLocaleTimeString()
        }));
      }
    };

    // Проверяем статус каждые 5 секунд
    const interval = setInterval(checkWalletStatus, 5000);
    checkWalletStatus(); // Первая проверка

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Кнопка для показа/скрытия монитора */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
      >
        {isVisible ? 'Hide' : 'Show'} Wallet Status
      </button>

      {/* Панель мониторинга */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white text-sm shadow-xl max-w-xs">
          <h3 className="font-bold mb-2 text-blue-400">Wallet Status Monitor</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className={walletStatus.hasProvider ? 'text-green-400' : 'text-red-400'}>
                {walletStatus.providerType || 'None'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Network:</span>
              <span className={walletStatus.networkAvailable ? 'text-green-400' : 'text-red-400'}>
                {walletStatus.networkAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Last Check:</span>
              <span className="text-gray-400 text-xs">
                {walletStatus.lastCheck || 'Never'}
              </span>
            </div>
          </div>

          {/* Дополнительная диагностика */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div>Window.ethereum: {window.ethereum ? '✓' : '✗'}</div>
              <div>MetaMask: {window.ethereum?.isMetaMask ? '✓' : '✗'}</div>
              <div>Reown: {window.ethereum?.isReown ? '✓' : '✗'}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletStatusMonitor; 