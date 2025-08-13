import { useEffect, useState } from 'react';
import { getPreloadedImagesCount, isImagePreloaded } from '../utils/imagePreloader';

const PreloadStatus = ({ imageUrl, showCount = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);

  useEffect(() => {
    // Проверяем статус загрузки изображения
    if (imageUrl) {
      setIsLoaded(isImagePreloaded(imageUrl));
    }

    // Обновляем счетчик предзагруженных изображений
    const updateCount = () => {
      setPreloadedCount(getPreloadedImagesCount());
    };

    updateCount();

    // Периодически обновляем счетчик
    const interval = setInterval(updateCount, 1000);

    return () => clearInterval(interval);
  }, [imageUrl]);

  if (!showCount && !imageUrl) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/30 rounded-lg p-3 text-xs text-zinc-400 z-50">
      {imageUrl && (
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span>{isLoaded ? 'Preloaded' : 'Loading...'}</span>
        </div>
      )}
      
      {showCount && (
        <div className="text-zinc-500">
          {preloadedCount} images cached
        </div>
      )}
    </div>
  );
};

export default PreloadStatus; 