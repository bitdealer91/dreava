import { useEffect, useState, useRef } from 'react';
import loadingVideo from '../assets/videos/IMG.mov';
import BackgroundCircles from './BackgroundCircles';

const UniversalLoading = ({ 
  message = "Loading...", 
  progress = null, 
  showVideo = true,
  showBackground = true,
  size = "default",
  className = "",
  onComplete = null,
  autoProgress = false,
  minDuration = 2000,
  showProgress = true,
  showDots = true
}) => {
  const [dots, setDots] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const videoRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Автоматический прогресс если включен
  useEffect(() => {
    if (autoProgress && progress === null) {
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return 100;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [autoProgress, progress, onComplete]);

  // Проверка минимальной длительности
  useEffect(() => {
    if (onComplete && !autoProgress) {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, minDuration - elapsed);
      
      if (remaining > 0) {
        const timer = setTimeout(() => {
          onComplete();
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        onComplete();
      }
    }
  }, [onComplete, autoProgress, minDuration]);

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "py-8",
          video: "w-32 h-32",
          logo: "text-2xl",
          message: "text-sm",
          progress: "w-48 h-2",
          dots: "w-2 h-2"
        };
      case "large":
        return {
          container: "py-20",
          video: "w-96 h-96",
          logo: "text-5xl",
          message: "text-xl",
          progress: "w-96 h-4",
          dots: "w-4 h-4"
        };
      default:
        return {
          container: "py-16",
          video: "w-64 h-64",
          logo: "text-4xl",
          message: "text-lg",
          progress: "w-80 h-3",
          dots: "w-3 h-3"
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const displayProgress = progress !== null ? progress : currentProgress;

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}>
      {/* Фон с кругами */}
      {showBackground && <BackgroundCircles />}
      
      {/* Видео логотипа */}
      {showVideo && !videoError ? (
        <div className="relative z-10 mb-8">
          <video
            ref={videoRef}
            src={loadingVideo}
            autoPlay
            muted
            loop
            playsInline
            className={`${sizeClasses.video} object-cover rounded-2xl shadow-2xl`}
            onError={(e) => {
              console.warn('Failed to load video:', e);
              setVideoError(true);
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : showVideo && videoError ? (
        <div className={`relative z-10 mb-8 ${sizeClasses.video} bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-2xl flex items-center justify-center border border-zinc-700/30`}>
          <div className="text-center">
            <video
              src={loadingVideo}
              autoPlay
              muted
              loop
              playsInline
              className={`${sizeClasses.video} object-cover rounded-2xl`}
            />
          </div>
        </div>
      ) : (
        /* Логотип без видео */
        <div className="mb-8">
          <video
            src={loadingVideo}
            autoPlay
            muted
            loop
            playsInline
            className={`${sizeClasses.video} object-cover rounded-2xl shadow-2xl`}
          />
        </div>
      )}
      
      {/* Сообщение */}
      <p className={`text-zinc-400 ${sizeClasses.message} mb-6 text-center`}>
        {message}
        {showDots && dots > 0 && <span className="ml-1">{'.'.repeat(dots)}</span>}
      </p>
      
      {/* Прогресс бар */}
      {showProgress && (
        <div className={`max-w-full mx-auto mb-6 ${sizeClasses.progress}`}>
          <div className="bg-zinc-800/80 backdrop-blur-sm rounded-full h-full overflow-hidden border border-zinc-700/30">
            <div 
              className="bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${displayProgress}%` }}
            ></div>
          </div>
          
          {/* Процент */}
          <div className="flex justify-center items-center mt-2">
            <span className="text-white font-semibold">{Math.round(displayProgress)}%</span>
          </div>
        </div>
      )}
      
      {/* Анимация загрузки */}
      {showDots && (
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] rounded-full animate-pulse ${sizeClasses.dots}`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UniversalLoading; 