import React, { useState, useEffect } from 'react';

const DebugLoader = ({ enabled = false }) => {
  const [debugInfo, setDebugInfo] = useState({
    pageLoadTime: null,
    errors: [],
    warnings: [],
    walletStatus: null,
    networkRequests: [],
    domReady: false
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    // Слушаем ошибки
    const errorHandler = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, {
          message: event.message || event.error?.message || 'Unknown error',
          source: event.filename || event.target?.src || 'Unknown',
          line: event.lineno || 'Unknown',
          time: new Date().toLocaleTimeString()
        }]
      }));
    };

    // Слушаем предупреждения
    const warningHandler = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        warnings: [...prev.warnings, {
          message: event.message || 'Unknown warning',
          time: new Date().toLocaleTimeString()
        }]
      }));
    };

    // Слушаем загрузку ресурсов
    const resourceLoadHandler = (event) => {
      if (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') {
        setDebugInfo(prev => ({
          ...prev,
          networkRequests: [...prev.networkRequests, {
            url: event.target.src || event.target.href,
            type: event.target.tagName,
            success: !event.target.onerror,
            time: new Date().toLocaleTimeString()
          }]
        }));
      }
    };

    // Слушаем ошибки загрузки ресурсов
    const resourceErrorHandler = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, {
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          source: event.target.src || event.target.href || 'Unknown',
          time: new Date().toLocaleTimeString()
        }]
      }));
    };

    // Проверяем готовность DOM
    const checkDOMReady = () => {
      setDebugInfo(prev => ({
        ...prev,
        domReady: document.readyState === 'complete',
        pageLoadTime: ((performance.now() - startTime) / 1000).toFixed(2)
      }));
    };

    // Добавляем слушатели
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', (event) => {
      errorHandler({ message: event.reason?.message || 'Unhandled promise rejection' });
    });
    window.addEventListener('load', checkDOMReady);
    document.addEventListener('DOMContentLoaded', checkDOMReady);

    // Слушаем загрузку ресурсов
    document.addEventListener('load', resourceLoadHandler, true);
    document.addEventListener('error', resourceErrorHandler, true);

    // Проверяем статус кошельков
    const checkWalletStatus = () => {
      const walletInfo = {
        hasEthereum: !!window.ethereum,
        ethereumType: window.ethereum ? 
          (window.ethereum.isMetaMask ? 'MetaMask' :
           window.ethereum.isWalletConnect ? 'WalletConnect' :
           window.ethereum.isCoinbaseWallet ? 'CoinbaseWallet' :
           window.ethereum.isNightlyWallet ? 'NightlyWallet' :
           window.ethereum.isReown ? 'Reown' : 'Unknown') : 'None',
        time: new Date().toLocaleTimeString()
      };
      
      setDebugInfo(prev => ({
        ...prev,
        walletStatus: walletInfo
      }));
    };

    // Проверяем статус каждые 2 секунды
    const walletInterval = setInterval(checkWalletStatus, 2000);
    checkWalletStatus();

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', errorHandler);
      window.removeEventListener('load', checkDOMReady);
      document.removeEventListener('DOMContentLoaded', checkDOMReady);
      document.removeEventListener('load', resourceLoadHandler, true);
      document.removeEventListener('error', resourceErrorHandler, true);
      clearInterval(walletInterval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Кнопка для показа/скрытия отладчика */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
      >
        {isVisible ? 'Hide' : 'Show'} Debug
      </button>

      {/* Панель отладки */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white text-sm shadow-xl max-w-md max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2 text-red-400">Debug Loader</h3>
          
          {/* Основная информация */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between">
              <span>DOM Ready:</span>
              <span className={debugInfo.domReady ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.domReady ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Load Time:</span>
              <span className="text-blue-400">
                {debugInfo.pageLoadTime ? `${debugInfo.pageLoadTime}s` : 'Loading...'}
              </span>
            </div>
          </div>

          {/* Статус кошелька */}
          {debugInfo.walletStatus && (
            <div className="mb-3 p-2 bg-gray-800 rounded">
              <div className="text-xs text-gray-400 mb-1">Wallet Status:</div>
              <div className="text-xs">
                <div>Ethereum: {debugInfo.walletStatus.hasEthereum ? '✓' : '✗'}</div>
                <div>Type: {debugInfo.walletStatus.ethereumType}</div>
                <div>Time: {debugInfo.walletStatus.time}</div>
              </div>
            </div>
          )}

          {/* Ошибки */}
          {debugInfo.errors.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-red-400 mb-1">Errors ({debugInfo.errors.length}):</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {debugInfo.errors.slice(-5).map((error, index) => (
                  <div key={index} className="text-xs text-red-300 bg-red-900 p-1 rounded">
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Предупреждения */}
          {debugInfo.warnings.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-yellow-400 mb-1">Warnings ({debugInfo.warnings.length}):</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {debugInfo.warnings.slice(-5).map((warning, index) => (
                  <div key={index} className="text-xs text-yellow-300 bg-yellow-900 p-1 rounded">
                    {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Сетевые запросы */}
          {debugInfo.networkRequests.length > 0 && (
            <div>
              <div className="text-xs text-blue-400 mb-1">Network ({debugInfo.networkRequests.length}):</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {debugInfo.networkRequests.slice(-5).map((request, index) => (
                  <div key={index} className={`text-xs p-1 rounded ${request.success ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900'}`}>
                    {request.type}: {request.success ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DebugLoader; 