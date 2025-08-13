import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import walletIcon from '../assets/wallet.svg';
import { useReownWallet } from '../hooks/useReownWallet';
import ConnectWalletModal from './ConnectWalletModal';

const ReownConnector = ({ isMobile = false }) => {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const walletMenuRef = useRef();

  const { 
    connect, 
    disconnect, 
    isConnected, 
    address, 
    isLoading 
  } = useReownWallet();

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target)) {
        setWalletMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWalletClick = () => {
    if (isConnected) {
      setWalletMenuOpen((prev) => !prev);
    } else {
      setShowConnectModal(true);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setWalletMenuOpen(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      {/* Кнопка кошелька */}
      <button
        onClick={handleWalletClick}
        disabled={isLoading}
        data-wallet-connect
        className={`flex items-center gap-2 rounded-xl text-white font-semibold shadow hover:shadow-lg hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-500 to-pink-500 ${
          isMobile ? 'px-3 py-2' : 'px-4 py-2'
        }`}
      >
        <img src={walletIcon} alt="Wallet" className="w-5 h-5" />
        {isConnected ? formatAddress(address) : (isLoading ? 'Connecting...' : 'Connect')}
      </button>

      {/* Меню кошелька */}
      {walletMenuOpen && createPortal(
        (
          <div
            ref={walletMenuRef}
            className="fixed inset-0 z-[100000]"
            onClick={() => setWalletMenuOpen(false)}
          >
            <div className="absolute right-3 top-16 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-xl shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
              <div className="pt-2">
                <Link 
                  to="/my-nfts" 
                  onClick={() => setWalletMenuOpen(false)}
                  className="block px-4 py-3 hover:bg-white/5 text-white transition-colors duration-200"
                >
                  My NFTs
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* Наш новый модал */}
      {showConnectModal && (
        <div className="relative z-[999999]">
          <ConnectWalletModal 
            isOpen={showConnectModal} 
            onClose={() => setShowConnectModal(false)} 
          />
        </div>
      )}
    </>
  );
};

export default ReownConnector; 