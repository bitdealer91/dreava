import React, { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../config/wagmiConfig';

// wagmiConfig и адаптер создаются централизованно в config/wagmiConfig

// Создаем queryClient
const queryClient = new QueryClient();

export const ReownProvider = ({ children }) => {
  const [shouldUseReown, setShouldUseReown] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeProvider = async () => {
      try {
        // Ждем полной загрузки страницы
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Проверяем все возможные провайдеры
        const hasMetaMask = window.ethereum?.isMetaMask;
        const hasWalletConnect = window.ethereum?.isWalletConnect;
        const hasCoinbaseWallet = window.ethereum?.isCoinbaseWallet;
        const hasNightlyWallet = window.ethereum?.isNightlyWallet;
        const hasBackpack = window.ethereum?.isBackpack;
        const hasEVMAsk = window.ethereum?.isEVMAsk;
        const hasReown = window.ethereum?.isReown;
        
        console.log('ReownProvider: Wallet detection:', {
          hasMetaMask,
          hasWalletConnect,
          hasCoinbaseWallet,
          hasNightlyWallet,
          hasBackpack,
          hasEVMAsk,
          hasReown
        });
        
        // Всегда инициализируем Reown, но с приоритетом для других кошельков
        if (hasMetaMask || hasWalletConnect || hasCoinbaseWallet || hasNightlyWallet || hasBackpack || hasEVMAsk) {
          console.log('ReownProvider: Other wallet detected, but still initializing Reown as fallback');
          setShouldUseReown(true);
        } else {
          // Если нет других провайдеров, используем Reown как основной
          console.log('ReownProvider: No other wallets detected, initializing Reown as primary');
          setShouldUseReown(true);
        }
      } catch (error) {
        console.error('ReownProvider: Error during initialization:', error);
        setShouldUseReown(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProvider();
  }, []);

  // Показываем loading пока инициализируемся
  if (isInitializing) {
    return <div className="min-h-screen bg-black" />;
  }

  // ВСЕГДА предоставляем WagmiProvider согласно документации
  // Это нужно для того, чтобы useReownWallet мог работать
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default ReownProvider; 