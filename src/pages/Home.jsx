// src/pages/Home.jsx
import { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import leftArrow from '../assets/arrow-left.svg';
import rightArrow from '../assets/arrow-right.svg';
import somniaLogo from '../assets/somnia-logo.svg';
import BackgroundCircles from '../components/BackgroundCircles';
import { Clock, Users, Star, ArrowRight, Trophy, Calendar, CheckCircle, ExternalLink, Info, X, Plus, Minus } from 'lucide-react';
import Countdown from 'react-countdown';
import { getIpfsUrls, fetchWithFallback } from '../utils/ipfs.js';

import nftAbi from '../abi/SomniaNFT.json';
import LoadingSpinner from '../components/LoadingSpinner';
import CollectionStats from '../components/CollectionStats';
import LazyImage from '../components/LazyImage';
import Pagination from '../components/Pagination';
import SearchResults from '../components/SearchResults';
import SearchStats from '../components/SearchStats';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSearch } from '../contexts/SearchContext';
import { useActiveCollections } from '../hooks/useActiveCollections';
import ImagePreloader from '../components/ImagePreloader';
import PerformanceMonitor from '../components/PerformanceMonitor';
import PerformanceStats from '../components/PerformanceStats';

// 🚀 Lazy loading для тяжелых компонентов (пока отключен)
// const VirtualList = lazy(() => import('../components/VirtualList'));



const Home = () => {
  const { collections, loading, error } = useActiveCollections();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [manualSelect, setManualSelect] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'completed' | 'active' | 'upcoming'
  const [currentCollectionsPage, setCurrentCollectionsPage] = useState(0);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const { searchTerm, filters, updateSearch } = useSearch();
  
  // 🚀 Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  
  // 📱 Responsive breakpoints для оптимизации
  const isMobile = useMemo(() => window.innerWidth < 768, []);
  const isTablet = useMemo(() => window.innerWidth >= 768 && window.innerWidth < 1024, []);
  
  // 🖼️ Оптимизация: предзагрузка критических изображений
  const criticalImages = useMemo(() => {
    if (!collections || collections.length === 0) return [];
    
    const images = [];
    // Первые 3 коллекции для баннера
    collections.slice(0, 3).forEach(collection => {
      if (collection.cover) images.push(collection.cover);
      if (collection.bannerImage) images.push(collection.bannerImage);
      // 🖼️ Добавляем изображения NFT для быстрой загрузки
      if (collection.firstNFTImage) images.push(collection.firstNFTImage);
    });
    
    // Первые 6 коллекций для карточек
    collections.slice(0, 6).forEach(collection => {
      if (collection.cover) images.push(collection.cover);
      // 🖼️ Добавляем изображения NFT для быстрой загрузки
      if (collection.firstNFTImage) images.push(collection.firstNFTImage);
    });
    
    return [...new Set(images)]; // Убираем дубликаты
  }, [collections]);

  // Мемоизированные значения для производительности
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);
  const completedCutoff = useMemo(() => Math.floor(new Date('2025-06-29T00:00:00Z').getTime() / 1000), []);

  const isSoldOut = useCallback((col) => {
    const supply = Number(col.totalSupply || col.metadata?.totalSupply || 0);
    const minted = Number(col.minted || col.metadata?.minted || 0);
    return supply > 0 && minted >= supply;
  }, []);

  const isSaleEnded = useCallback((collection) => {
    const phases = collection.phases || {};
    
    // Если нет фаз, считаем коллекцию активной
    if (Object.values(phases).length === 0) {
      return false;
    }
    
    const allPhasesEnded = Object.values(phases).every(
      phase => Number(phase.end) < now
    );
        const soldOut = collection.totalSupply && collection.minted !== undefined && 
Number(collection.minted) >= Number(collection.totalSupply);
    
    // Debug для конкретных коллекций
    if (collection.name === 'Somniac visioner' || collection.name === 'True Friendship in Somnia') {
      console.log('🔍 isSaleEnded debug for:', collection.name, {
        phases,
        allPhasesEnded,
        soldOut,
        now,
        phaseEnds: Object.values(phases).map(p => ({ end: p.end, endTime: new Date(p.end * 1000) }))
      });
    }
    
    return soldOut || allPhasesEnded;
  }, [now]);

  const isActiveSale = useCallback((phases) => {
    if (!phases || Object.values(phases).length === 0) {
      return false;
    }
    
    const hasActive = Object.values(phases).some(
      (phase) => Number(phase.start) <= now && now <= Number(phase.end)
    );
    
    // Debug для конкретных коллекций
    if (phases && Object.keys(phases).length > 0) {
      const firstPhase = Object.values(phases)[0];
      if (firstPhase && (firstPhase.name === 'Somniac visioner' || firstPhase.name === 'True Friendship in Somnia')) {
        console.log('🔍 isActiveSale debug:', {
          phases,
          hasActive,
          now,
          phaseTimes: Object.values(phases).map(p => ({
            start: p.start,
            end: p.end,
            startTime: new Date(p.start * 1000),
            endTime: new Date(p.end * 1000),
            isActive: Number(p.start) <= now && now <= Number(p.end)
          }))
        });
      }
    }
    
    return hasActive;
  }, [now]);

  const isUpcomingSale = useCallback((phases) =>
    phases && Object.values(phases).some(
      (phase) => Number(phase.start) > now
    ), [now]);

  const getPhases = useCallback((col) => col.phases || col.metadata?.phases || {}, []);

  const getLastPhaseEnd = useCallback((col) => {
    const phases = getPhases(col);
    if (!phases || Object.values(phases).length === 0) return 0;
    return Math.max(...Object.values(phases).map(phase => Number(phase.end)));
  }, [getPhases]);

  const getCurrentPhase = useCallback((collection) => {
    const phases = getPhases(collection);
    if (!phases) return null;

    const now = Math.floor(Date.now() / 1000);
    for (const [key, phase] of Object.entries(phases)) {
      if (Number(phase.start) <= now && now <= Number(phase.end)) {
        return { name: key, ...phase };
      }
    }
    return null;
  }, [getPhases]);

  // Adaptive STT price formatter
  const formatPrice = (value) => {
    const num = Number(value);
    if (!isFinite(num)) return '0';
    if (num === 0) return '0';
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 0.1) return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
    if (num >= 0.01) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const getCurrentPrice = useCallback((collection) => {
    const currentPhase = getCurrentPhase(collection);
    return currentPhase ? currentPhase.price : '0';
  }, [getCurrentPhase]);



  // Мемоизированные фильтры коллекций
  const activeCollections = useMemo(() => {
    const filtered = collections.filter((col) => {
      const phases = getPhases(col);
      const supply = Number(col.totalSupply || col.metadata?.totalSupply || 0);
      const isActive = isActiveSale(phases) && !isSaleEnded(col) && supply > 0;
      
      // Debug active collection filtering
      if (col.name === 'Somniac visioner' || col.name === 'True Friendship in Somnia') {
        console.log('🔍 Debug collection:', col.name, {
          phases,
          isActiveSale: isActiveSale(phases),
          isSaleEnded: isSaleEnded(col),
          isActive,
          supply
        });
      }
      
      return isActive;
    });
    
    console.log('🎯 Active collections found:', filtered.length, filtered.map(c => c.name));
    return filtered;
  }, [collections, getPhases, isActiveSale, isSaleEnded]);

  const shownCollections = useMemo(() => {
    console.log('🔍 Filtering collections for tab:', activeTab, 'Total collections:', collections.length);
    
    // Сначала фильтруем по табам
    let filtered = collections.filter((col) => {
      const phases = getPhases(col);
      const supply = Number(col.totalSupply || col.metadata?.totalSupply || 0);
      let shouldShow = false;
      
      if (activeTab === 'completed') {
        shouldShow = isSaleEnded(col) && getLastPhaseEnd(col) >= completedCutoff && supply > 0;
        console.log(`📊 Collection ${col.name}: completed=${shouldShow}, isSaleEnded=${isSaleEnded(col)}, lastPhaseEnd=${getLastPhaseEnd(col)}, cutoff=${completedCutoff}`);
      } else if (activeTab === 'active') {
        shouldShow = isActiveSale(phases) && !isSaleEnded(col) && supply > 0;
        console.log(`📊 Collection ${col.name}: active=${shouldShow}, isActiveSale=${isActiveSale(phases)}, isSaleEnded=${isSaleEnded(col)}`);
      } else if (activeTab === 'upcoming') {
        const hasUpcoming = isUpcomingSale(phases);
        const hasActive = isActiveSale(phases);
        // Upcoming: только когда есть будущие фазы, нет активных и коллекция не завершена, при этом задан supply
        shouldShow = (hasUpcoming && !hasActive && !isSaleEnded(col) && supply > 0);
        console.log(`📊 Collection ${col.name}: upcoming=${shouldShow}, hasUpcoming=${hasUpcoming}, hasActive=${hasActive}, isSaleEnded=${isSaleEnded(col)}`);
      }
      
      return shouldShow;
    });
    
    console.log(`✅ Filtered collections for ${activeTab}:`, filtered.length);

    // Затем применяем поиск и фильтры
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(col => 
        col.name.toLowerCase().includes(searchLower) ||
        col.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(col => {
        const currentPhase = getCurrentPhase(col);
        const price = currentPhase ? parseFloat(currentPhase.price) : 0;
        
        switch (filters.priceRange) {
          case 'low': return price < 0.1;
          case 'medium': return price >= 0.1 && price <= 1;
          case 'high': return price > 1;
          default: return true;
        }
      });
    }

    if (filters.supplyRange !== 'all') {
      filtered = filtered.filter(col => {
        const supply = col.totalSupply || 0;
        
        switch (filters.supplyRange) {
          case 'small': return supply < 1000;
          case 'medium': return supply >= 1000 && supply <= 10000;
          case 'large': return supply > 10000;
          default: return true;
        }
      });
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(col => {
        const phases = getPhases(col);
        const now = Math.floor(Date.now() / 1000);
        
        switch (filters.status) {
          case 'active': 
            return Object.values(phases).some(
              phase => Number(phase.start) <= now && now <= Number(phase.end)
            );
          case 'upcoming': 
            return Object.values(phases).some(phase => Number(phase.start) > now);
          case 'completed': 
            return isSaleEnded(col);
          default: return true;
        }
      });
    }

    return filtered;
  }, [collections, activeTab, searchTerm, filters, getPhases, isSaleEnded, isActiveSale, isUpcomingSale, getLastPhaseEnd, completedCutoff, getCurrentPhase]);

  // Автоматическое переключение баннеров
  useEffect(() => {
    if (activeCollections.length <= 1 || manualSelect) return;

    intervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeCollections.length);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeCollections.length, manualSelect]);

  // Обновляем поиск при изменении searchTerm
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      console.log('🔍 Performing search for term:', searchTerm);
      // Search is handled automatically by SearchContext when searchTerm changes
      // No need to call updateSearch here as it's already called from Header
    }
  }, [searchTerm]);

  // Отладочная информация
  useEffect(() => {
    console.log('📊 Home state:', {
      loading,
      error,
      collectionsCount: collections.length,
      activeCollectionsCount: activeCollections.length,
      shownCollectionsCount: shownCollections.length,
      activeTab,
      searchTerm,
      filters
    });
    
    // Детальная информация о коллекциях
    if (collections.length > 0) {
      console.log('📋 Collections details:', collections.map(col => ({
        name: col.name,
        address: col.address,
        phases: col.phases,
        totalSupply: col.totalSupply,
        minted: col.minted,
        hasPhases: Object.keys(col.phases || {}).length > 0
      })));
    }
  }, [loading, error, collections.length, activeCollections.length, shownCollections.length, activeTab, searchTerm, filters]);

  const prevBanner = useCallback(() => {
    setManualSelect(true);
    setCurrentBannerIndex((prev) => (prev - 1 + activeCollections.length) % activeCollections.length);
  }, [activeCollections.length]);

  const nextBanner = useCallback(() => {
    setManualSelect(true);
    setCurrentBannerIndex((prev) => (prev + 1) % activeCollections.length);
  }, [activeCollections.length]);

  const handleBannerClick = useCallback(() => {
    if (activeCollections[currentBannerIndex]) {
      navigate(`/launchpad/collection/${activeCollections[currentBannerIndex].address}`);
    }
  }, [activeCollections, currentBannerIndex, navigate]);

  const handleCollectionClick = useCallback((collection) => {
    navigate(`/launchpad/collection/${collection.address}`);
  }, [navigate]);

  const handleFilterChange = useCallback(() => {
    setCurrentCollectionsPage(0); // Сбрасываем страницу при изменении фильтров
  }, []);

  const Banner = useCallback(({ collection }) => {
    if (!collection) {
      return null;
    }

    // Resolve banner like on CollectionMintPage
    const bannerLocal = localStorage.getItem(`collection_${collection.address}_banner`);
    const bannerMeta = collection.metadata?.banner ? getIpfsUrls(collection.metadata.banner)[0] : null;
    const bannerApi = collection.banner
      ? (collection.banner.startsWith('ipfs://') ? getIpfsUrls(collection.banner)[0] : collection.banner)
      : null;
    const resolvedBanner = bannerLocal || bannerMeta || bannerApi || null;
    const bannerPosition = localStorage.getItem(`collection_${collection.address}_banner_position`) || 'center center';
    const bannerFit = localStorage.getItem(`collection_${collection.address}_banner_fit`) || 'cover';

    // Debug banner logs removed

    const currentPhase = getCurrentPhase(collection);
    const price = getCurrentPrice(collection);
    const isSoldOut = collection.totalSupply && collection.minted !== undefined && 
Number(collection.minted) >= Number(collection.totalSupply);

    return (
      <div className="relative h-[250px] md:h-[400px] w-full overflow-hidden shadow-2xl border-b border-zinc-700/30 bg-zinc-900/80 backdrop-blur-sm z-10">
        {/* Баннер коллекции - использовать только баннер */}
        {resolvedBanner ? (
          <img 
            src={resolvedBanner} 
            alt="banner" 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: bannerPosition, objectFit: bannerFit }}
            onError={(e) => {
              console.warn('⚠️ Banner image failed to load:', resolvedBanner);
              e.target.style.display = 'none';
              // Показываем fallback
              const fallback = e.target.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback когда нет баннера или изображение не загрузилось */}
        <div 
          className={`flex items-center justify-center h-full w-full ${resolvedBanner ? 'hidden' : ''}`}
          style={{ display: resolvedBanner ? 'none' : 'flex' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"></div>
          <div className="relative z-10 text-center text-white px-4">
            <div className="text-2xl md:text-4xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent">
              {collection.name}
            </div>
            <div className="hidden md:block text-xl text-zinc-300 mb-2">
              {collection.description ? collection.description.slice(0, 100) + '...' : 'Amazing NFT Collection'}
            </div>
            <div className="text-sm md:text-base text-zinc-400">
              Discover and mint unique NFTs
            </div>
          </div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-zinc-900/20 to-transparent"></div>
        
        {/* Live статус - в правом верхнем углу */}
        <div className="absolute top-3 md:top-6 right-3 md:right-6 z-30">
          {isSoldOut ? (
            <div className="bg-pink-500/20 text-pink-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border border-pink-500/30">
              Sold out
            </div>
          ) : currentPhase ? (
            <div className="bg-green-500/20 text-green-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border border-green-500/30 animate-pulse">
              Live
            </div>
          ) : (
            <div className="bg-blue-500/20 text-blue-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border border-blue-500/30">
              Coming soon
            </div>
          )}
        </div>

        {/* Collection Info Overlay - новый layout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-20">
          <div className="flex items-end gap-3 md:gap-6">
            {/* Обложка слева */}
            <img 
              src={collection.cover || collection.firstNFTImage || collection.bannerImage || '/placeholder-banner.jpg'} 
              alt={collection.name}
              className="w-20 h-20 md:w-32 md:h-32 object-cover rounded-xl border border-zinc-700/30 flex-shrink-0"
              onError={(e) => {
                console.warn('⚠️ Cover image failed to load:', e.target.src);
                // Если нет обложки, пробуем показать изображение NFT
                if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                  e.target.src = collection.firstNFTImage;
                } else {
                  // Если нет изображения NFT, показываем placeholder
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzM0MTU1Ii8+CjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjMyIiBmaWxsPSIjNjY3MzgwIi8+Cjwvc3ZnPgo=';
                }
              }}
            />
            
            {/* Контент справа от обложки */}
            <div className="flex-1">
              {/* Название коллекции - кликабельное на мобильных устройствах */}
              <h2 
                onClick={() => window.innerWidth < 768 && handleBannerClick()}
                className={`text-xl md:text-3xl font-bold text-white drop-shadow-lg mb-2 md:mb-4 ${window.innerWidth < 768 ? 'cursor-pointer hover:text-pink-400 transition-colors duration-200' : ''}`}
              >
                {collection.name}
              </h2>
              
              {/* Описание - только на десктопе */}
              <div className="hidden md:block">
                <p className="text-zinc-300 text-base leading-relaxed mb-6">
                  {collection.description || 'No description available'}
                </p>
              </div>
              
              {/* Плашки Minted/Price */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                <div className="bg-zinc-900/50 backdrop-blur-sm px-3 py-2 md:px-4 md:py-2 rounded-xl border border-zinc-700/30 w-full md:w-[180px]">
                  <span className="text-zinc-400 text-xs md:text-sm">Minted:</span>
                  <span className="text-white font-semibold ml-2 text-sm md:text-base">{Number(collection.minted || collection.metadata?.minted) || 0} / {Number(collection.totalSupply || collection.metadata?.totalSupply) || 0}</span>
                </div>
                
                <div className="bg-zinc-900/50 backdrop-blur-sm px-3 py-2 md:px-4 md:py-2 rounded-xl border border-zinc-700/30 w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-xs md:text-sm">Price:</span>
                    <div className="flex items-center gap-1">
                      <img src={somniaLogo} alt="STT" className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-white font-semibold text-sm md:text-base">{formatPrice(price)} STT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка View в правом углу - только на десктопе */}
        <button
          onClick={handleBannerClick}
          className="hidden md:inline-flex absolute bottom-4 md:bottom-6 right-4 md:right-6 items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-medium rounded-lg hover:from-[#0095E6] hover:to-[#E61CC7] transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-pink-500/25 text-xs md:text-sm z-30"
        >
          View
          <ArrowRight size={12} className="md:w-3.5 md:h-3.5" />
        </button>

        {/* Navigation arrows */}
        {activeCollections.length > 1 && (
          <>
            <button
              onClick={prevBanner}
              className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full p-1.5 md:p-2 hover:bg-black/60 transition-all duration-200 z-30"
            >
              <img src={leftArrow} alt="Previous" className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={nextBanner}
              className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full p-1.5 md:p-2 hover:bg-black/60 transition-all duration-200 z-30"
            >
              <img src={rightArrow} alt="Next" className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            {/* Banner indicators */}
            <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 md:gap-2 z-30">
              {activeCollections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setManualSelect(true);
                    setCurrentBannerIndex(index);
                  }}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-200 ${
                    index === currentBannerIndex
                      ? 'bg-white'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }, [getCurrentPhase, getCurrentPrice, handleBannerClick, activeCollections.length]);

  const CollectionCard = useCallback(({ collection, index }) => {
    const currentPhase = getCurrentPhase(collection);
    const price = getCurrentPrice(collection);
    const isSoldOut = collection.totalSupply && collection.minted !== undefined && 
                     Number(collection.minted) >= Number(collection.totalSupply);

    return (
            <div 
        onClick={() => handleCollectionClick(collection)}
        className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-3 md:p-4 hover:border-zinc-600/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
        data-index={index}
      >
        <div className="aspect-square rounded-xl overflow-hidden mb-3 md:mb-4 border border-zinc-600/30">
          <LazyImage 
            src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            priority={index < 6} // Приоритет для первых 6 изображений
            sizes={isMobile ? "100vw" : isTablet ? "50vw" : "33vw"}
            onError={(e) => {
              console.warn('⚠️ Collection cover failed to load:', e.target.src);
              // Если нет обложки, пробуем показать изображение NFT
              if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                e.target.src = collection.firstNFTImage;
              } else {
                // Если нет изображения NFT, показываем placeholder
                e.target.src = '/default-cover.png';
              }
            }}
          />
        </div>
        
        <h3 
          onClick={() => window.innerWidth < 768 && handleCollectionClick(collection)}
          className={`text-white font-semibold mb-2 truncate text-sm md:text-base ${window.innerWidth < 768 ? 'cursor-pointer hover:text-pink-400 transition-colors duration-200' : ''}`}
        >
          {collection.name}
        </h3>
        
        <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Price:</span>
            <div className="flex items-center gap-1">
              <img src={somniaLogo} alt="STT" className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="text-white">{formatPrice(price)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Supply:</span>
            <span className="text-white">{Number(collection.totalSupply) || 0}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Minted:</span>
            <span className="text-white">{Number(collection.minted) || 0}</span>
          </div>
        </div>

        <div className="mt-2 md:mt-3">
          {isSoldOut ? (
            <div className="text-center text-zinc-400 text-xs md:text-sm">Finished</div>
          ) : currentPhase ? (
            <div className="text-center text-green-400 text-xs md:text-sm">Live</div>
          ) : (
            <div className="text-center text-blue-400 text-xs md:text-sm">Coming soon</div>
          )}
        </div>
      </div>
    );
  }, [getCurrentPhase, getCurrentPrice, handleCollectionClick]);

  const TabBar = useCallback(() => (
    <div className="bg-zinc-900 border-b border-zinc-800 relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex">
          {[
            { id: 'completed', name: 'Completed Sales' },
            { id: 'active', name: 'Active Sales' },
            { id: 'upcoming', name: 'Upcoming Sales' }
          ].map((tab) => (
          <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentCollectionsPage(0);
              }}
              className={`py-3 md:py-4 px-3 md:px-6 font-medium transition-all duration-200 border-b-2 text-sm md:text-base ${
                activeTab === tab.id
                  ? 'text-white border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              {tab.name}
          </button>
          ))}
        </div>
      </div>
    </div>
  ), [activeTab]);

  // Компонент для пустого состояния
  const EmptyState = useCallback(({ message, icon: Icon }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Collections Found</h3>
      <p className="text-zinc-400 max-w-md">{message}</p>
    </div>
  ), []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white">
        <BackgroundCircles />
        
        {/* Active Collections Banner */}
        {activeCollections.length > 0 ? (
          <div className="relative z-10">
            <Banner collection={activeCollections[currentBannerIndex]} />
          </div>
        ) : (
          // Fallback banner when no active collections
          <div className="relative h-[250px] md:h-[400px] w-full overflow-hidden shadow-2xl border-b border-zinc-700/30 bg-zinc-900/80 backdrop-blur-sm z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent">
                  Welcome to Dreava
                </h1>
                <p className="text-xl text-zinc-300 mb-6">
                  Discover amazing NFT collections
                </p>
                <div className="text-zinc-400">
                  No active sales at the moment
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <TabBar />

        {/* Collections Grid */}
        <div className="relative z-10 py-6 md:py-8 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {/* 🚀 Performance Monitor */}
            <PerformanceMonitor 
              onMetrics={setPerformanceMetrics}
              showUI={false}
            />
            
            {/* 📊 Performance Stats - только через DevPanel */}
            {Object.keys(performanceMetrics).length > 0 && (
              <div className="mb-6">
                <PerformanceStats 
                  metrics={performanceMetrics} 
                  isVisible={localStorage.getItem('showPerformanceStats') === 'true'}
                />
              </div>
            )}
            
            {/* 🖼️ Image Preloader для критических изображений */}
            {criticalImages.length > 0 && (
              <ImagePreloader
                images={criticalImages}
                priority={true}
                onComplete={() => setImagesPreloaded(true)}
                onProgress={(loaded, total) => {
                  if (loaded === total) setImagesPreloaded(true);
                }}
              />
            )}
            
            {loading ? (
              <LoadingSpinner 
                message="Loading collections" 
                showVideo={true}
                showBackground={true}
                size="large"
                showProgress={false}
                showDots={false}
              />
            ) : error ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Error Loading Collections</h3>
                <p className="text-zinc-400 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white rounded-lg hover:from-[#0095E6] hover:to-[#E61CC7] transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            ) : shownCollections.length === 0 ? (
              <EmptyState 
                message={`No ${activeTab} collections found. Check back later for new drops!`}
                icon={activeTab === 'completed' ? Trophy : activeTab === 'active' ? Clock : Calendar}
              />
            ) : (
              <>
                {/* Show Search Results if search is active */}
                {searchTerm ? (
                  <SearchResults
                    collections={shownCollections}
                    searchTerm={searchTerm}
                    onCollectionClick={handleCollectionClick}
                  />
                ) : (
                  <>
                    {/* Collections Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
                      {shownCollections
                        .slice(currentCollectionsPage * 5, (currentCollectionsPage + 1) * 5)
                        .map((collection, index) => (
                          <CollectionCard key={collection.address} collection={collection} index={index} />
                        ))}
                    </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentCollectionsPage}
                      totalPages={Math.ceil(shownCollections.length / 5)}
                      onPageChange={setCurrentCollectionsPage}
                      totalItems={shownCollections.length}
                      itemsPerPage={5}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Home;
