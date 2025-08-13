/**
 * Утилиты для безопасной работы с кошельками
 * Предотвращает конфликты между различными Ethereum провайдерами
 */

// Проверяем, есть ли уже активный Ethereum провайдер
export const hasExistingWalletProvider = () => {
  return window.ethereum && (
    window.ethereum.isMetaMask ||
    window.ethereum.isWalletConnect ||
    window.ethereum.isCoinbaseWallet ||
    window.ethereum.isReown
  );
};

// Получаем информацию об активном провайдере
export const getActiveProviderInfo = () => {
  if (!window.ethereum) return null;
  
  if (window.ethereum.isMetaMask) return 'MetaMask';
  if (window.ethereum.isWalletConnect) return 'WalletConnect';
  if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
  if (window.ethereum.isReown) return 'Reown';
  
  return 'Unknown Provider';
};

// Безопасно инициализируем провайдер
export const safeInitializeProvider = (providerName, initFunction) => {
  try {
    // Проверяем, не конфликтует ли с существующим провайдером
    if (hasExistingWalletProvider()) {
      const activeProvider = getActiveProviderInfo();
      console.warn(`Wallet conflict detected: ${providerName} trying to initialize while ${activeProvider} is active`);
      
      // Если это не тот же провайдер, не инициализируем
      if (activeProvider !== providerName) {
        console.log(`Skipping ${providerName} initialization to avoid conflicts`);
        return false;
      }
    }
    
    // Инициализируем провайдер
    const result = initFunction();
    console.log(`${providerName} initialized successfully`);
    return result;
  } catch (error) {
    console.error(`Failed to initialize ${providerName}:`, error);
    return false;
  }
};

// Очищаем глобальные переменные кошельков при необходимости
export const cleanupWalletProviders = () => {
  try {
    // Очищаем только если это безопасно
    if (window.ethereum && !hasExistingWalletProvider()) {
      delete window.ethereum;
      console.log('Cleaned up orphaned ethereum provider');
    }
  } catch (error) {
    console.warn('Failed to cleanup wallet providers:', error);
  }
};

// Проверяем доступность сети
export const checkNetworkAvailability = async () => {
  try {
    if (!window.ethereum) return false;
    
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId !== undefined;
  } catch (error) {
    console.warn('Network availability check failed:', error);
    return false;
  }
};

// Получаем безопасный провайдер для использования в приложении
export const getSafeProvider = () => {
  if (hasExistingWalletProvider()) {
    return window.ethereum;
  }
  return null;
}; 