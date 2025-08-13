/**
 * Агрессивное предотвращение конфликтов кошельков
 * Блокирует попытки установки глобального ethereum провайдера
 */

// Флаг для отслеживания, был ли уже установлен провайдер
let ethereumProviderSet = false;
let originalEthereum = null;

// Функция отключена: не переопределяем window.ethereum во избежание конфликтов
export const blockEthereumProviderConflicts = () => {
  try {
    if (window.ethereum && !ethereumProviderSet) {
      originalEthereum = window.ethereum;
      ethereumProviderSet = true;
    }
  } catch (_) {}
};

// Функция для восстановления оригинального провайдера
export const restoreOriginalProvider = () => {
  try {
    if (originalEthereum) {
      Object.defineProperty(window, 'ethereum', {
        value: originalEthereum,
        writable: true,
        configurable: true,
        enumerable: true
      });
      console.log('WalletConflictPrevention: Original provider restored');
    }
  } catch (error) {
    console.error('WalletConflictPrevention: Failed to restore provider:', error);
  }
};

// Функция для проверки текущего состояния
export const getProviderStatus = () => {
  return {
    hasProvider: !!window.ethereum,
    providerType: window.ethereum ? 
      (window.ethereum.isMetaMask ? 'MetaMask' :
       window.ethereum.isWalletConnect ? 'WalletConnect' :
       window.ethereum.isCoinbaseWallet ? 'CoinbaseWallet' :
       window.ethereum.isNightlyWallet ? 'NightlyWallet' :
       window.ethereum.isReown ? 'Reown' : 'Unknown') : 'None',
    isBlocked: ethereumProviderSet,
    originalProvider: !!originalEthereum
  };
};

// Автоматически блокируем конфликты при загрузке
if (typeof window !== 'undefined') {
  blockEthereumProviderConflicts();
}