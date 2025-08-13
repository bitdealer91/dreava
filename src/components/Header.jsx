// src/components/Header.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import logo from '../assets/logo.svg';
import somniaLogo from '../assets/somnia-logo.svg';
import walletIcon from '../assets/wallet.svg';
import { Sparkles, Search, X, Filter, Menu } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import SearchResults from './SearchResults';
import ReownConnector from './ReownConnector';
import { useReownWallet } from '../hooks/useReownWallet';
import { SOMNIA_CHAIN_ID_DEC } from '../utils/network';

const SOMNIA_CHAIN_HEX = '0xc488';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchTerm, filters, updateSearch, updateFilters, clearSearch, hideSearchResults } = useSearch();
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { isConnected, chainId, switchNetwork, balance } = useReownWallet();

  // Do not auto-reload on connect errors; show console only
  useEffect(() => {
    if (!isConnected) {
      console.warn('❌ Wallet not connected');
    }
  }, [isConnected]);

  // Минимизируем логику переключения сети: единственный вызов через wagmi при подключении
  useEffect(() => {
    const enforceNetwork = async () => {
      if (!isConnected) return;
      if (chainId === SOMNIA_CHAIN_ID_DEC) return;
      try {
        console.log('[Header] enforcing network. current chainId:', chainId);
        await switchNetwork(SOMNIA_CHAIN_ID_DEC);
      } catch (err) {
        console.warn('[Header] Network switch failed (wagmi):', err?.message || err);
      }
    };
    enforceNetwork();
  }, [isConnected, chainId, switchNetwork]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Скрываем результаты поиска при клике вне области поиска
      const searchContainer = event.target.closest('.search-container');
      if (!searchContainer) {
        hideSearchResults();
      }
      
      // Скрываем мобильное меню при клике вне его
      const mobileMenu = event.target.closest('.mobile-menu');
      if (!mobileMenu && showMobileMenu) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hideSearchResults, showMobileMenu]);

  // Закрываем мобильное меню при изменении маршрута
  useEffect(() => {
    setShowMobileMenu(false);
    setShowSearchFilters(false);
  }, [location.pathname]);

  const handleCreateDreams = () => {
    navigate('/create-dreams');
    setShowMobileMenu(false);
  };

  const handleSearchChange = useCallback((e) => {
    updateSearch(e.target.value);
  }, [updateSearch]);

  const handleFilterChange = useCallback((filterType, value) => {
    updateFilters({ ...filters, [filterType]: value });
  }, [filters, updateFilters]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const formatBalance = (balanceValue) => {
    if (!balanceValue) return '0.00';
    try {
      return parseFloat(balanceValue).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  return (
    <>
      <header className="bg-black text-white px-4 md:px-6 py-3 flex items-center justify-between border-b border-zinc-800 relative z-[100]">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/">
            <img src={logo} alt="Logo" className="h-8 md:h-9" />
          </Link>
          
          {/* Create Your Dreams Button (desktop only) */}
          <button
            onClick={handleCreateDreams}
            className="hidden md:inline-flex items-center bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-zinc-700"
          >
            <Sparkles className="inline w-4 h-4 mr-2" />
            Create your dreams
          </button>
        </div>

        {/* Search - центр (только desktop/tablet) */}
        <div className="hidden md:block flex-1 md:px-10 md:max-w-xl">
          <div className="search-container relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items, collections and accounts"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 rounded-full bg-zinc-800 placeholder-zinc-400 text-white focus:outline-none pl-10 pr-20"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors duration-200"
                >
                  <X size={16} />
                </button>
              )}
              
              {/* Filter Button - встроен внутрь поиска как иконка */}
              <button
                onClick={() => setShowSearchFilters(!showSearchFilters)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors duration-200"
              >
                <Filter size={16} />
              </button>
            </div>

            {/* Integrated Search Filters - выпадают при клике на иконку */}
            {showSearchFilters && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4 z-40">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Price Range</label>
                    <select
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      value={filters.priceRange || ''}
                      onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="0-0.1">0 - 0.1 STT</option>
                      <option value="0.1-1">0.1 - 1 STT</option>
                      <option value="1-10">1 - 10 STT</option>
                      <option value="10+">10+ STT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Supply Range</label>
                    <select
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      value={filters.supplyRange || ''}
                      onChange={(e) => handleFilterChange('supplyRange', e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="1-100">1 - 100</option>
                      <option value="100-1000">100 - 1,000</option>
                      <option value="1000-10000">1,000 - 10,000</option>
                      <option value="10000+">10,000+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Type</label>
                    <select
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      value={filters.type || ''}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="collection">Collection</option>
                      <option value="nft">NFT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Sort</label>
                    <select
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      value={filters.sort || ''}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="newest">Newest</option>
                      <option value="popular">Popular</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            <SearchResults />
          </div>
        </div>

        {/* Links & Wallet - справа (только desktop/tablet) */}
        <div className="hidden md:flex items-center gap-6 relative">
          <Link to="/launchpad" className="font-semibold">Launchpad</Link>
          <Link to="/marketplace" className="font-semibold">Marketplace</Link>

          {/* Wallet Balance */}
          {isConnected && balance && (
            <div className="flex items-center gap-1 pr-2">
              <img src={somniaLogo} alt="STT" className="w-5 h-5" />
              <span className="font-bold text-sm">{formatBalance(balance)} STT</span>
            </div>
          )}

          {/* Reown Connector */}
          <ReownConnector />
        </div>

        {/* Mobile Right Section */}
        <div className="flex md:hidden items-center gap-3">
          {/* Search Icon */}
          <button
            onClick={() => setShowSearchFilters(!showSearchFilters)}
            className="p-2 text-zinc-400 hover:text-white transition-colors duration-200"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Wallet Icon */}
          <div className="p-2">
            <ReownConnector isMobile={true} />
          </div>

          {/* Burger Menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-zinc-400 hover:text-white transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Search Dropdown (overlay below header) */}
        {showSearchFilters && createPortal(
          (
            <div className="search-container fixed inset-x-0 top-20 z-[100000] md:hidden px-4 animate-fadeIn">
              <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-3 shadow-2xl mx-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search collections, NFTs, creators..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-10 py-3 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors duration-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <SearchResults />
                </div>
              </div>
            </div>
          ),
          document.body
        )}

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div className="mobile-menu md:hidden absolute top-full left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 animate-fadeIn">
            <div className="p-6 space-y-6 relative">
              {/* Крестик для закрытия */}
              <button
                onClick={() => setShowMobileMenu(false)}
                className="absolute top-0 right-0 p-2 text-zinc-400 hover:text-white transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
              {/* Create Your Dreams */}
              <div className="text-center">
                <button
                  onClick={() => {
                    handleCreateDreams();
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-6 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-zinc-700 shadow-lg"
                >
                  <Sparkles className="inline w-5 h-5 mr-2" />
                  Create Your Dreams
                </button>
                <p className="text-zinc-400 text-sm mt-2">
                  Build, populate, and manage your NFT collections.
                </p>
              </div>

              {/* Navigation Links */}
              <div className="space-y-4">
                <Link 
                  to="/launchpad" 
                  onClick={() => setShowMobileMenu(false)}
                  className="block text-center py-3 font-semibold text-white hover:text-pink-400 transition-colors duration-200 border border-zinc-700 rounded-lg hover:bg-zinc-800/50"
                >
                  Launchpad
                </Link>
                <Link 
                  to="/marketplace" 
                  onClick={() => setShowMobileMenu(false)}
                  className="block text-center py-3 font-semibold text-white hover:text-pink-400 transition-colors duration-200 border border-zinc-700 rounded-lg hover:bg-zinc-800/50"
                >
                  Marketplace
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
