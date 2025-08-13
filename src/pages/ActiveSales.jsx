import { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveCollections } from '../hooks/useActiveCollections';
import LoadingSpinner from '../components/LoadingSpinner';
import leftArrow from '../assets/arrow-left.svg';
import rightArrow from '../assets/arrow-right.svg';
import somniaLogo from '../assets/somnia-logo.svg';
import { Sparkles, Clock, Users, ArrowRight } from 'lucide-react';
import Countdown from 'react-countdown';
import { ethers } from 'ethers';
import { getIpfsUrl } from '../utils/ipfs';
import factoryAbi from '../abi/SomniaFactory.json';
import nftAbi from '../abi/SomniaNFT.json';
import React from 'react';
import logo from '../assets/logo.svg';
import LazyImage from '../components/LazyImage';
import ImagePreloader from '../components/ImagePreloader';
import PerformanceMonitor from '../components/PerformanceMonitor';
import basePortalVideoSrc from '../assets/videos/IMG_6919.MOV';
import hoverPortalVideoSrc from '../assets/videos/IMG_6924.MOV';

// 🚀 Lazy loading для тяжелых компонентов (пока отключен)
// const VirtualList = lazy(() => import('../components/VirtualList'));

// Компонент для ограничения текста с tooltip
const TruncatedText = ({ text, maxLines = 1, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef(null);
  
  // Закрытие tooltip при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTooltip && containerRef.current && !containerRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);
  
  if (!text) return null;
  
  // Простое обрезание текста
  const maxLength = maxLines === 1 ? 50 : 100;
  const shouldTruncate = text.length > maxLength;
  
  if (!shouldTruncate) {
    return <div className={className}>{text}</div>;
  }
  
  return (
    <div className="relative" ref={containerRef}>
      <div className={`${className} flex items-start`}>
        <span className="flex-1 truncate">
          {text.substring(0, maxLength)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          className="ml-1 text-blue-400 hover:text-blue-300 cursor-pointer flex-shrink-0"
        >
          ...
        </button>
      </div>
      
      {/* Tooltip с полным описанием */}
      {showTooltip && (
        <div 
          className="absolute bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg z-50 backdrop-blur-sm"
          style={{
            top: '-10px',
            right: '0px',
            width: '280px',
            maxHeight: '150px',
            overflow: 'auto'
          }}
        >
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {text}
          </p>
        </div>
      )}
    </div>
  );
};

// Выносим TabBar за пределы компонента
const TabBar = ({ activeTab, setActiveTab }) => {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex">
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-6 font-medium transition-all duration-200 border-b-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'text-white border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                : 'text-zinc-400 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Completed Sales
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-6 font-medium transition-all duration-200 border-b-2 cursor-pointer ${
              activeTab === 'active'
                ? 'text-white border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                : 'text-zinc-400 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Active Sales
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-4 px-6 font-medium transition-all duration-200 border-b-2 cursor-pointer ${
              activeTab === 'upcoming'
                ? 'text-white border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                : 'text-zinc-400 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Upcoming Sales
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveSales = ({ portalVideo, portalHoverVideo }) => {
  // Fallback to bundled videos if props are not provided
  const defaultPortalVideo = portalVideo || basePortalVideoSrc;
  const defaultPortalHoverVideo = portalHoverVideo || hoverPortalVideoSrc;
  const { collections, loading, error } = useActiveCollections();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('active'); // 'completed' | 'active' | 'upcoming'
  
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
    // Первые 10 коллекций для быстрой загрузки
    collections.slice(0, 10).forEach(collection => {
      if (collection.cover) images.push(collection.cover);
      if (collection.bannerImage) images.push(collection.bannerImage);
      // 🖼️ Добавляем изображения NFT для быстрой загрузки
      if (collection.firstNFTImage) images.push(collection.firstNFTImage);
    });
    
    return [...new Set(images)]; // Убираем дубликаты
  }, [collections]);

  // Фильтрация коллекций по фазам
  const now = Math.floor(Date.now() / 1000); // Convert to Unix timestamp (seconds)

  // --- ДОБАВЛЕНО: отсечка для completed sales ---
  const completedCutoff = Math.floor(new Date('2025-06-29T00:00:00Z').getTime() / 1000); // Юникс-время в секундах

  const isSoldOut = (col) =>
    col.totalSupply && col.minted !== undefined && Number(col.minted) >= Number(col.totalSupply);

  const isSaleEnded = (collection) => {
    const phases = collection.phases || {};
    const allPhasesEnded = Object.values(phases).length > 0 && Object.values(phases).every(
      phase => Number(phase.end) < now
    );
    return collection.soldOut || allPhasesEnded;
  };

  const isActiveSale = (phases) =>
    phases && Object.values(phases).some(
      (phase) => Number(phase.start) <= now && now <= Number(phase.end)
    );

  const isUpcomingSale = (phases) =>
    phases && Object.values(phases).some(
      (phase) => Number(phase.start) > now
    );

  // Получаем phases из collection.metadata или collection.phases
  const getPhases = (col) => {
    const phases = col.phases || col.metadata?.phases || {};
    return phases;
  };

  // --- ДОБАВЛЕНО: функция для получения времени окончания последней фазы ---
  const getLastPhaseEnd = (col) => {
    const phases = getPhases(col);
    if (!phases || Object.values(phases).length === 0) return 0;
    return Math.max(...Object.values(phases).map(phase => Number(phase.end)));
  };

  // 🔥 ОПТИМИЗИРОВАННАЯ ФИЛЬТРАЦИЯ: 
  // - Для 'active': все коллекции уже активные (отфильтрованы в useActiveCollections)
  // - Для 'upcoming': фильтруем только будущие фазы
  const shownCollections = collections.filter((col) => {
    const phases = getPhases(col);
    if (activeTab === 'completed') {
      return (
        isSaleEnded(col) &&
        getLastPhaseEnd(col) >= completedCutoff // Только те, что закончились после 26 июня
      );
    }
    if (activeTab === 'active') return isActiveSale(phases) && !isSaleEnded(col);
    if (activeTab === 'upcoming') {
      const hasUpcoming = isUpcomingSale(phases);
      const hasActive = isActiveSale(phases);
      return hasUpcoming && !hasActive && !isSaleEnded(col);
    }
    return false;
  });





  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTab, shownCollections.length]);



  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner 
              message="Loading active sales"
              showLogo={true}
              size="default"
              showProgress={false}
              showDots={false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner 
              message={`Error loading collections: ${error}`}
              showLogo={true}
              size="default"
              showProgress={false}
              showDots={false}
            />
            <p className="text-zinc-400 text-sm mt-4">The indexer may not be running yet.</p>
          </div>
        </div>
      </div>
    );
  }

  if (shownCollections.length === 0) {
    const getMessage = () => {
      if (activeTab === 'active') return "No active sales at the moment";
      if (activeTab === 'upcoming') return "No upcoming sales at the moment";
      return "No completed sales yet";
    };

    return (
      <div className="min-h-screen bg-black text-white">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner 
              message={getMessage()}
              showLogo={true}
              size="default"
              showProgress={false}
              showDots={false}
            />
          </div>
        </div>
      </div>
    );
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev - 3;
      return newIndex < 0 ? Math.max(0, shownCollections.length - 3) : newIndex;
    });
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 3;
      return nextIndex >= shownCollections.length ? 0 : nextIndex;
    });
  };

  // Получаем текущие 3 коллекции
  const currentCollections = shownCollections.slice(currentIndex, currentIndex + 3);

  return (
    <div className="min-h-screen bg-black text-white">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-fadeIn">
          {/* 🚀 Performance Monitor */}
          <PerformanceMonitor 
            onMetrics={setPerformanceMetrics}
            showUI={false}
          />
          
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
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent leading-none mb-4">
              {activeTab === 'active' && 'Active Sales'}
              {activeTab === 'upcoming' && 'Upcoming Sales'}
              {activeTab === 'completed' && 'Completed Sales'}
            </h1>
            <p className="text-zinc-400 text-lg">
              {activeTab === 'active' && 'Discover and mint from the latest NFT collections'}
              {activeTab === 'upcoming' && 'Get ready for these exciting upcoming launches'}
              {activeTab === 'completed' && 'Explore completed sales and their achievements'}
            </p>
          </div>

                    {/* Collections Grid */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentCollections.map((collection, index) => (
                <CollectionCard
                  key={collection.address}
                  collection={collection}
                  portalVideo={portalVideo}
                  portalHoverVideo={portalHoverVideo}
                  isSaleEnded={isSaleEnded}
                  getPhases={getPhases}
                  now={now}
                  isUpcoming={activeTab === 'upcoming'}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            {shownCollections.length > 3 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute top-1/2 left-[-20px] transform -translate-y-1/2 bg-zinc-800 bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 z-10"
                >
                  <img src={leftArrow} alt="Previous" className="w-6 h-6 opacity-80 hover:opacity-100" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute top-1/2 right-[-20px] transform -translate-y-1/2 bg-zinc-800 bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 z-10"
                >
                  <img src={rightArrow} alt="Next" className="w-6 h-6 opacity-80 hover:opacity-100" />
                </button>
              </>
            )}

            {/* Pagination Indicator */}
            {shownCollections.length > 3 && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2">
                  {Array.from({ length: Math.ceil(shownCollections.length / 3) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index * 3)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        Math.floor(currentIndex / 3) === index
                          ? 'bg-gradient-to-r from-blue-500 to-pink-500'
                          : 'bg-zinc-600 hover:bg-zinc-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CollectionCard = ({ collection, portalVideo, portalHoverVideo, isSaleEnded, getPhases, now, isUpcoming = false }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [portalClosed, setPortalClosed] = useState(false);
  const [baseVideoOk, setBaseVideoOk] = useState(true);

  const phases = getPhases(collection);
  const activePhase = Object.entries(phases).find(
    ([, phase]) => {
      const startTime = Number(phase.start);
      const endTime = Number(phase.end);
      return startTime <= now && now <= endTime;
    }
  );
  const futurePhases = Object.values(phases).filter(phase => {
    const startTime = Number(phase.start);
    return startTime > now;
  });
  const nextPhase = futurePhases.length > 0
    ? futurePhases.reduce((a, b) => {
        const timeA = Number(a.start);
        const timeB = Number(b.start);
        return timeA < timeB ? a : b;
      })
    : null;

  const handleHoverStart = () => {
    if (!portalClosed) setHovered(true);
  };

  const handleHoverEnd = () => {
    setHovered(false);
  };

  const handleHoverVideoEnd = () => {
    setPortalClosed(true);
  };

  useEffect(() => {
    setPortalClosed(false);
    setHovered(false);
  }, [collection]);

  const description = collection.description || collection.metadata?.description || 'No description provided.';
  const displayPrice = activePhase ? activePhase[1].price : '0';
  const saleEnded = isSaleEnded(collection);

  return (
    <div 
      className="bg-[#111] p-4 rounded-2xl text-white shadow-lg border border-zinc-800/50 h-[480px] flex flex-col cursor-pointer hover:scale-105 transition-all duration-300"
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onClick={() => navigate(`/launchpad/collection/${collection.address}`)}
    >
      {/* Portal/Image Section - увеличенная высота */}
      <div className="relative mb-4 flex-shrink-0 h-64 overflow-hidden rounded-xl">
        <video
          src={portalVideo || defaultPortalVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBaseVideoOk(false)}
        />

        {hovered && !portalClosed && (
          <video
            src={portalHoverVideo || defaultPortalHoverVideo}
            autoPlay
            muted
            playsInline
            onEnded={handleHoverVideoEnd}
            onError={() => setPortalClosed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {(portalClosed || !baseVideoOk) && (
          <img
            src={collection.cover || collection.firstNFTImage || logo}
            alt={collection.name}
            className="absolute inset-0 w-full h-full object-contain bg-zinc-900 transition-opacity duration-700"
            style={{ 
              objectFit: 'contain',
              objectPosition: 'center'
            }}
            onError={(e)=>{
              // Если нет обложки, пробуем показать изображение NFT
              if (collection.firstNFTImage && collection.firstNFTImage !== e.currentTarget.src) {
                e.currentTarget.src = collection.firstNFTImage;
              } else {
                // Если нет изображения NFT, показываем логотип
                e.currentTarget.src = logo;
              }
            }}
          />
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isSaleEnded(collection) ? (
            <span className="px-2 py-1 bg-red-500/80 text-white text-xs rounded-full">Ended</span>
          ) : activePhase ? (
            <span className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1">
              <Sparkles size={12} />
              Active
            </span>
          ) : nextPhase ? (
            <span className="px-2 py-1 bg-yellow-500/80 text-white text-xs rounded-full">Upcoming</span>
          ) : (
            <span className="px-2 py-1 bg-zinc-500/80 text-white text-xs rounded-full">Paused</span>
          )}
        </div>


      </div>

      {/* Collection Info */}
      <div className="flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent mb-2">
          {collection.name}
        </h3>

        {/* Description with TruncatedText */}
        <div className="mb-3 flex-1">
          <TruncatedText 
            text={description} 
            maxLines={1}
            className="text-sm text-zinc-400"
          />
        </div>

        {/* Supply and Price */}
        <div className="flex justify-between text-sm text-zinc-300 mb-2">
          {(!isUpcoming && (activePhase || saleEnded)) ? (
            <span className="flex items-center gap-1">
              <Users size={12} />
              {collection.minted || 0} / {collection.totalSupply || 0}
            </span>
          ) : <span />}
          <span className="flex items-center gap-1">
            <img src={somniaLogo} alt="STT" className="w-3 h-3" />
            {displayPrice} STT
          </span>
        </div>

        {/* Progress Bar removed */}

        {/* Timer or Status */}
        <div className="mb-3">
          {isSaleEnded(collection) ? (
            <span className="text-red-400 text-xs font-medium">Sale ended</span>
          ) : activePhase ? (
            <div className="flex items-center gap-2 text-xs">
              <Clock size={12} className="text-pink-400" />
              <span className="text-pink-400">Ends in:</span>
              <Countdown 
                date={Number(activePhase[1].end) * 1000} 
                renderer={({ days, hours, minutes, seconds }) => (
                  <span className="text-white font-mono">
                    {days > 0 ? `${days}d ` : ''}{hours}h {minutes}m {seconds}s
                  </span>
                )}
              />
            </div>
          ) : nextPhase ? (
            <div className="flex items-center gap-2 text-xs">
              <Clock size={12} className="text-yellow-400" />
              <span className="text-yellow-400">Starts in:</span>
              <Countdown 
                date={Number(nextPhase.start) * 1000} 
                renderer={({ days, hours, minutes, seconds }) => (
                  <span className="text-white font-mono">
                    {days > 0 ? `${days}d ` : ''}{hours}h {minutes}m {seconds}s
                  </span>
                )}
              />
            </div>
          ) : (
            <span className="text-zinc-400 text-xs">No active phase</span>
          )}
        </div>

        {/* Enter Button */}
        <button className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm">
          <span>Enter Portal</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ActiveSales;