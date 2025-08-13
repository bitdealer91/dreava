import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useReownWallet } from '../hooks/useReownWallet';

const ConnectWalletModal = ({ isOpen, onClose }) => {
  const { connect, disconnect, isConnected, address, connectors } = useReownWallet();
  const [walletList, setWalletList] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  // Принудительно устанавливаем стили для центрирования и блокируем прокрутку
  useEffect(() => {
    if (isOpen) {
      // Блокируем прокрутку body
      document.body.classList.add('modal-open');
      
      // Принудительно устанавливаем стили для центрирования
      const modalElement = document.querySelector('.wallet-modal-overlay');
      if (modalElement) {
        modalElement.style.position = 'fixed';
        modalElement.style.top = '0';
        modalElement.style.left = '0';
        modalElement.style.right = '0';
        modalElement.style.bottom = '0';
        modalElement.style.display = 'flex';
        modalElement.style.alignItems = 'center';
        modalElement.style.justifyContent = 'center';
        modalElement.style.zIndex = '999999';
        modalElement.style.width = '100vw';
        modalElement.style.height = '100vh';
      }
    } else {
      // Разблокируем прокрутку body
      document.body.classList.remove('modal-open');
    }

    // Очистка при размонтировании
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Обновляем список кошельков при монтировании
  useEffect(() => {
    // Log available connectors for debugging
    try {
      // eslint-disable-next-line no-console
      console.log('[ConnectModal] available connectors:', connectors?.map(c => ({ id: c.id, name: c.name })));
    } catch {}
    const updatedWallets = wallets.map(wallet => ({
      ...wallet,
      installed: wallet.id === 'metamask' ? (window.ethereum && window.ethereum.isMetaMask) :
                 wallet.id === 'rabby' ? (window.ethereum && window.ethereum.isRabby) :
                 wallet.id === 'keplr' ? !!window.keplr :
                 wallet.id === 'subwallet' ? !!(window.injectedWeb3 && window.injectedWeb3['polkadot-js']) :
                 wallet.id === 'pontem' ? (window.ethereum && window.ethereum.isPontem) :
                 wallet.id === 'nightly' ? (window.ethereum && window.ethereum.isNightly) :
                 wallet.id === 'okx' ? (window.ethereum && window.ethereum.isOkxWallet) :
                 true
    }));
    setWalletList(updatedWallets);
  }, []);

  const handleConnect = async (walletType) => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      console.log('Attempting to connect with wallet:', walletType);
      
      // Пытаемся подключиться с указанным типом кошелька
      // Используем коннектор wagmi, соответствующий выбранному кошельку
      const byId = connectors?.find(c => c.id.toLowerCase().includes(walletType));
      const byName = connectors?.find(c => (c.name || '').toLowerCase().includes(walletType));
      const connector = byId || byName || connectors?.[0];
      const res = await connect({ connectorId: connector?.id, connectorName: connector?.name });
      if (!res?.success) throw (res?.error || new Error('Failed to connect'));
      onClose();
    } catch (error) {
      console.error('Failed to connect:', error);
      // Показываем ошибку пользователю
      alert(`Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      onClose();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask',
      installed: true
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect using WalletConnect',
      installed: true
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      icon: '🐰',
      description: 'Connect using Rabby Wallet',
      installed: true
    },
    {
      id: 'keplr',
      name: 'Keplr',
      icon: '🔵',
      description: 'Connect using Keplr',
      installed: window.keplr
    },
    {
      id: 'subwallet',
      name: 'SubWallet',
      icon: '🟢',
      description: 'Connect using SubWallet',
      installed: window.injectedWeb3 && window.injectedWeb3['polkadot-js']
    },
    {
      id: 'pontem',
      name: 'Pontem Wallet',
      icon: '🟣',
      description: 'Connect using Pontem Wallet',
      installed: window.ethereum && window.ethereum.isPontem
    },
    {
      id: 'nightly',
      name: 'Nightly',
      icon: '🌙',
      description: 'Connect using Nightly',
      installed: window.ethereum && window.ethereum.isNightly
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      icon: '⚫',
      description: 'Connect using OKX Wallet',
      installed: window.ethereum && window.ethereum.isOkxWallet
    }
  ];

  return createPortal(
    <div className="wallet-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-md p-4 z-[100000]" onClick={onClose}>
      <div className="wallet-modal-content bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl mx-auto my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Dreava" className="w-8 h-8" />
            <h2 className="text-xl font-bold text-white">Connect</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isConnected ? (
            // Connected state
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 font-medium">Connected</span>
                </div>
                <p className="text-zinc-300 text-sm font-mono break-all">
                  {address}
                </p>
              </div>
              
              <button
                onClick={handleDisconnect}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            // Wallet list
            <div className="space-y-3">
              {walletList.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={!wallet.installed || isConnecting}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    wallet.installed
                      ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 cursor-pointer'
                      : 'bg-zinc-800/50 border-zinc-700/50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{wallet.name}</span>
                        {wallet.installed && (
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                            installed
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm">{wallet.description}</p>
                    </div>
                  </div>
                  {isConnecting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-center text-zinc-400 text-sm">
            By connecting your wallet, you agree to our{' '}
            <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConnectWalletModal; 