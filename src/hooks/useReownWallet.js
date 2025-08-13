import { useAccount, useChainId, useBalance, useDisconnect, useConnect, useSwitchChain } from 'wagmi';
import { somniaNetwork } from '../config/reown';
import { useState, useEffect } from 'react';

// Кастомный хук для замены Wagmi функциональности
export const useReownWallet = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Получение баланса
  const fetchBalance = async (address, chainId) => {
    if (!address || !chainId) return;
    
    try {
      setIsLoadingBalance(true);
      // Используем RPC для получения баланса
      const response = await fetch('https://dream-rpc.somnia.network/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data.result) {
        // Конвертируем из wei в STT
        const balanceInWei = BigInt(data.result);
        const balanceInSTT = Number(balanceInWei) / Math.pow(10, 18);
        setBalance(balanceInSTT.toFixed(4));
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('0.00');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Автоматическое обновление баланса при изменении аккаунта или сети
  useEffect(() => {
    if (address && chainId) {
      fetchBalance(address, chainId);
    } else {
      // Сбрасываем баланс при отключении
      setBalance(null);
    }
  }, [address, chainId]);

  // Функция для переключения сети
  const switchNetwork = async (targetChainId) => {
    try {
      console.log('[Wallet] switchNetwork requested:', targetChainId, 'current:', chainId);
      if (chainId === targetChainId) {
        console.log('[Wallet] already on target chain');
        return { success: true };
      }

      // 1) Пытаемся переключить через wagmi (работает с WalletConnect и большинством коннекторов)
      if (typeof switchChainAsync === 'function') {
        try {
          console.log('[Wallet] trying wagmi switchChainAsync');
          await switchChainAsync({ chainId: targetChainId, chain: somniaNetwork });
          console.log('[Wallet] wagmi switchChainAsync success');
          return { success: true };
        } catch (err) {
          console.warn('[Wallet] wagmi switchChainAsync error:', err?.message || err);
          // Продолжаем к низкоуровневому способу
        }
      }

      // 2) Низкоуровневый способ через ethereum провайдер (MetaMask/Rabby/WalletConnect mobile)
      if (typeof window.ethereum !== 'undefined') {
        // On WalletConnect mobile, requestAccounts sometimes required to initialize session
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch {}
        try {
          console.log('[Wallet] trying window.ethereum wallet_switchEthereumChain');
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
          console.log('[Wallet] window.ethereum switch success');
          return { success: true };
        } catch (switchError) {
          console.warn('[Wallet] window.ethereum switch error:', switchError?.code, switchError?.message || switchError);
          if (switchError.code === 4902) {
            // Сеть не добавлена, добавляем её
            try {
              console.log('[Wallet] trying wallet_addEthereumChain');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${targetChainId.toString(16)}`,
                  chainName: 'Somnia Testnet',
                  nativeCurrency: {
                    name: 'Somnia Test Token',
                    symbol: 'STT',
                    decimals: 18,
                  },
                  rpcUrls: ['https://dream-rpc.somnia.network/'],
                  blockExplorerUrls: ['https://shannon-explorer.somnia.network/'],
                }],
              });
              // Some providers need a short delay before switching again
              await new Promise(r => setTimeout(r, 300));
              console.log('[Wallet] addEthereumChain success, retrying wagmi switch');
              // После добавления пробуем переключить ещё раз через wagmi, если доступно
              if (typeof switchChainAsync === 'function') {
                await switchChainAsync({ chainId: targetChainId, chain: somniaNetwork });
                return { success: true };
              }
              return { success: true };
            } catch (addError) {
              console.error('Failed to add network:', addError);
              return { success: false, error: addError };
            }
          }
          return { success: false, error: switchError };
        }
      }
      
      return { success: false, error: 'No ethereum provider available' };
    } catch (error) {
      console.error('[Wallet] switchNetwork fatal error:', error);
      return { success: false, error };
    }
  };

  // Функция для получения ENS имени (заглушка, так как ENS не поддерживается на Somnia)
  const getEnsName = async (address) => {
    return null; // ENS не поддерживается на Somnia
  };

  // Функции подключения/отключения
  const connectWallet = async (opts) => {
    try {
      console.log('[Wallet] connect requested', opts);
      const preferred = opts?.connectorId
        ? connectors.find(c => c.id === opts.connectorId)
        : (opts?.connectorName
            ? connectors.find(c => (c.name || '').toLowerCase().includes(String(opts.connectorName).toLowerCase()))
            : null);

      if (preferred) {
        const res = await connect({ connector: preferred, chainId: somniaNetwork.id });
        console.log('[Wallet] connect via preferred result:', res);
        return { success: true, result: res };
      }

      // Фоллбэк: первый доступный коннектор
      if (connectors.length > 0) {
        const res = await connect({ connector: connectors[0], chainId: somniaNetwork.id });
        console.log('[Wallet] connect via fallback result:', res);
        return { success: true, result: res };
      }
      return { success: false, error: new Error('No connectors available') };
    } catch (error) {
      console.error('Failed to connect:', error);
      return { success: false, error };
    }
  };

  const disconnectWallet = async () => {
    try {
      // Сбрасываем локальное состояние перед отключением
      setBalance(null);
      setIsLoadingBalance(false);
      
      // Отключаемся через wagmi
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  return {
    // Основные состояния
    address,
    isConnected,
    chainId,
    isLoading: false, // Wagmi не предоставляет loading state для всего приложения
    
    // Функции
    connect: connectWallet,
    connectors,
    disconnect: disconnectWallet,
    switchNetwork,
    
    // Дополнительные данные
    balance: balance || (balanceData ? Number(balanceData.value) / Math.pow(10, balanceData.decimals) : null),
    isLoadingBalance,
    getEnsName,
    
    // Прямой доступ к Reown для расширенной функциональности
    reown: {
      appKitState: { initialized: true },
      appKitNetwork: { chainId },
      appKitAccount: { address },
      appKitBalance: { balance: balanceData },
      appKit: null, // Не используется с WagmiAdapter
      disconnectHook: { disconnect: disconnectWallet }
    },
  };
};

export default useReownWallet; 