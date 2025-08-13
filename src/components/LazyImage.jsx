import { useState, useRef, useEffect, useMemo } from 'react';

const LazyImage = ({ 
  src, 
  alt, 
  className = "", 
  fallbackSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDMwIDEwMEMxMzAgMTE2LjU2OSAxMTYuNTY5IDEzMCAxMDAgMTMwQzgzLjQzMSAxMzAgNzAgMTE2LjU2OSA3MCAxMEM3MCA4My40MzEgODMuNDMxIDcwIDEwMCA3MFoiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+",
  placeholderSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzM0MTU1Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjAiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+",
  onLoad,
  onError,
  priority = false, // Для критических изображений
  sizes = "100vw", // Для responsive images
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [imageStatus, setImageStatus] = useState('loading'); // 'loading', 'loaded', 'error'
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Мемоизируем observer options для оптимизации
  const observerOptions = useMemo(() => ({
    rootMargin: priority ? '0px' : '100px', // Для приоритетных изображений начинаем загрузку сразу
    threshold: priority ? 0 : 0.1
  }), [priority]);

  // Генерируем WebP URL если поддерживается
  const webpSrc = useMemo(() => {
    if (!src || !src.includes('ipfs') || src.includes('data:')) return src;
    
    // Добавляем WebP версию для IPFS изображений
    if (src.includes('gateway.lighthouse.storage')) {
      return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return src;
  }, [src]);

  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc);
      setImageStatus('error');
      return;
    }

    // Если изображение приоритетное, загружаем сразу
    if (priority) {
      setIsIntersecting(true);
      return;
    }

    // Создаем Intersection Observer для lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            // Отключаем observer после появления
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      observerOptions
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, priority, observerOptions]);

  // Загружаем изображение когда оно становится видимым
  useEffect(() => {
    if (!isIntersecting || !src) return;

    const img = new Image();
    
    // Предзагружаем WebP версию
    if (webpSrc !== src) {
      const webpImg = new Image();
      webpImg.src = webpSrc;
    }

    img.onload = () => {
      setImageSrc(src);
      setImageStatus('loaded');
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      // Если WebP не загрузился, пробуем оригинал
      if (webpSrc !== src) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setImageSrc(src);
          setImageStatus('loaded');
          if (onLoad) onLoad();
        };
        fallbackImg.onerror = () => {
          setImageSrc(fallbackSrc);
          setImageStatus('error');
          if (onError) onError();
        };
        fallbackImg.src = src;
      } else {
        setImageSrc(fallbackSrc);
        setImageStatus('error');
        if (onError) onError();
      }
    };
    
    img.src = webpSrc;
  }, [isIntersecting, src, webpSrc, fallbackSrc, onLoad, onError]);

  return (
    <div className="relative overflow-hidden">
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${
          imageStatus === 'loading' ? 'animate-pulse blur-sm scale-105' : ''
        } ${
          imageStatus === 'loaded' ? 'animate-fade-in' : ''
        }`}
        style={{
          transition: 'all 0.3s ease-in-out',
          opacity: imageStatus === 'loaded' ? 1 : 0.8,
          filter: imageStatus === 'loading' ? 'blur(4px)' : 'blur(0px)',
          transform: imageStatus === 'loading' ? 'scale(1.05)' : 'scale(1)'
        }}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        {...props}
      />
      
      {/* Skeleton loader для лучшего UX */}
      {imageStatus === 'loading' && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}
    </div>
  );
};

export default LazyImage; 