import { useEffect, useState, useRef } from 'react';
import loadingVideo from '../assets/videos/IMG.mov';
import BackgroundCircles from './BackgroundCircles';
import logo from '../assets/logo.svg';

const LoadingScreen = ({ onLoadingComplete }) => {
  const [loadingText, setLoadingText] = useState('Initializing');
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  // Предзагрузка всех изображений
  const preloadAllImages = async () => {
    setLoadingText('Preloading assets');
    setProgress(30);
    
    // Имитируем загрузку изображений
    await new Promise(resolve => setTimeout(resolve, 300));
    setProgress(60);
  };

  // Предзагрузка коллекций из localStorage
  const preloadCollections = async () => {
    setLoadingText('Loading collections');
    setProgress(80);
    
    try {
      JSON.parse(localStorage.getItem('dreava_collections') || '[]');
    } catch (error) {
      // Игнорируем ошибки
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    setProgress(90);
  };

  useEffect(() => {
    const initializeLoading = async () => {
      try {
        const startTime = Date.now();
        const minLoadingTime = 2000; // Минимальное время показа
        
        setLoadingText('Initializing');
        setProgress(10);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        await preloadAllImages();
        await preloadCollections();
        
        setLoadingText('Almost ready');
        setProgress(95);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setProgress(100);
        setLoadingText('Ready');
        
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
        }
        
        setIsLoading(false);
        if (onLoadingComplete) onLoadingComplete();
      } catch (error) {
        console.error('Loading error:', error);
        setIsLoading(false);
        if (onLoadingComplete) onLoadingComplete();
      }
    };

    initializeLoading();
  }, [onLoadingComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9996] flex flex-col items-center justify-center">
      <BackgroundCircles />
      
      {!videoError ? (
        <div className="relative z-10 mb-6">
          <video
            ref={videoRef}
            src={loadingVideo}
            autoPlay
            muted
            loop
            playsInline
            className="w-64 h-64 object-cover rounded-2xl shadow-2xl"
            onError={(e) => {
              console.warn('Failed to load video:', e);
              setVideoError(true);
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 mb-6 w-64 h-64 bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-2xl flex items-center justify-center border border-zinc-700/30">
          <div className="text-center">
            <img src={logo} alt="Dreava" className="w-32 h-32 mx-auto mb-4" />
            <div className="text-zinc-300 text-lg font-semibold">Dreava</div>
          </div>
        </div>
      )}

      {/* Прогресс бар */}
      <div className="relative z-10 w-80 h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Процент загрузки */}
      <div className="relative z-10 text-zinc-300 text-sm font-medium mb-2">
        {Math.round(progress)}%
      </div>

      {/* Сообщение о загрузке */}
      <div className="relative z-10 text-zinc-300 text-sm font-medium">
        {loadingText}
      </div>
    </div>
  );
};

export default LoadingScreen; 