// Утилита для настройки кошельков и решения конфликтов
export const configureWallets = () => {
  // Решаем конфликт между MetaMask и другими кошельками
  if (typeof window !== 'undefined') {
    try {
      // Проверяем, можно ли переопределить ethereum
      const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
      
      if (descriptor && !descriptor.configurable) {
        // Ethereum property is not configurable, skipping wallet configuration
        return;
      }
      
      // Если ethereum уже определен и не конфигурируем, просто выходим
      if (window.ethereum && descriptor && !descriptor.configurable) {
        // Ethereum provider already configured, skipping
        return;
      }
      
      // Сохраняем оригинальный ethereum объект
      const originalEthereum = window.ethereum;
      
      // Do not redefine window.ethereum at all to avoid wallet conflicts
      // Only observe and use the injected provider if present.
      if (!originalEthereum) {
        // Nothing to do; wait for wallet to inject.
      }
    } catch (error) {
      // Failed to configure wallets
    }
  }
};

// Функция для проверки доступности кошельков
export const checkWalletAvailability = () => {
  const wallets = {
    metamask: false,
    rabby: false,
    backpack: false,
    phantom: false
  };

  if (typeof window !== 'undefined') {
    // Проверяем MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.metamask = true;
    }
    
    // Проверяем Rabby
    if (window.ethereum?.isRabby) {
      wallets.rabby = true;
    }
    
    // Проверяем Backpack
    if (window.ethereum?.isBackpack) {
      wallets.backpack = true;
    }
    
    // Проверяем Phantom
    if (window.ethereum?.isPhantom) {
      wallets.phantom = true;
    }
  }

  return wallets;
};

// Функция для получения приоритетного кошелька
export const getPreferredWallet = () => {
  const wallets = checkWalletAvailability();
  
  // Приоритет: MetaMask > Rabby > Backpack > Phantom
  if (wallets.metamask) return 'metamask';
  if (wallets.rabby) return 'rabby';
  if (wallets.backpack) return 'backpack';
  if (wallets.phantom) return 'phantom';
  
  return null;
}; 