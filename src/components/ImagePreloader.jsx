import { useEffect, useRef } from 'react';

const ImagePreloader = ({ 
  images = [], 
  priority = false,
  onProgress = null,
  onComplete = null 
}) => {
  const loadedCount = useRef(0);
  const totalCount = useRef(images.length);
  const isPreloading = useRef(false);

  useEffect(() => {
    if (!images.length || isPreloading.current) return;

    isPreloading.current = true;
    loadedCount.current = 0;

    const preloadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          loadedCount.current++;
          if (onProgress) {
            onProgress(loadedCount.current, totalCount.current);
          }
          resolve(src);
        };
        
        img.onerror = () => {
          loadedCount.current++;
          if (onProgress) {
            onProgress(loadedCount.current, totalCount.current);
          }
          reject(new Error(`Failed to load: ${src}`));
        };
        
        img.src = src;
      });
    };

    const preloadAll = async () => {
      try {
        if (priority) {
          // Для приоритетных изображений загружаем параллельно
          await Promise.allSettled(images.map(preloadImage));
        } else {
          // Для обычных изображений загружаем последовательно
          for (const image of images) {
            await preloadImage(image);
          }
        }
        
        if (onComplete) {
          onComplete(loadedCount.current, totalCount.current);
        }
      } catch (error) {
        // Игнорируем ошибки загрузки
      } finally {
        isPreloading.current = false;
      }
    };

    preloadAll();
  }, [images, priority, onProgress, onComplete]);

  // Компонент не рендерит ничего видимого
  return null;
};

export default ImagePreloader; 