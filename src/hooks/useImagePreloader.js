import { useEffect, useRef } from 'react';

// Глобальный кэш для предзагруженных изображений
const preloadedImages = new Set();

export const useImagePreloader = (collections) => {
  const isPreloading = useRef(false);

  useEffect(() => {
    if (!collections || collections.length === 0 || isPreloading.current) {
      return;
    }

    isPreloading.current = true;

    const preloadCollectionImages = async () => {
      const imagesToPreload = [];

      // Собираем все изображения из коллекций
      collections.forEach(collection => {
        if (collection.cover && !preloadedImages.has(collection.cover)) {
          imagesToPreload.push(collection.cover);
        }
        
        if (collection.banner && !preloadedImages.has(collection.banner)) {
          imagesToPreload.push(collection.banner);
        }

        // Предзагружаем NFT изображения из localStorage
        try {
          const nfts = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`) || '[]');
          nfts.forEach(nft => {
            if (nft.image && !preloadedImages.has(nft.image)) {
              imagesToPreload.push(nft.image);
            }
          });
        } catch (error) {
          console.warn('Failed to preload NFT images for collection:', collection.address);
        }
      });

      // Предзагружаем изображения батчами
      const batchSize = 3;
      for (let i = 0; i < imagesToPreload.length; i += batchSize) {
        const batch = imagesToPreload.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(src => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                preloadedImages.add(src);
                resolve();
              };
              img.onerror = () => {
                console.warn(`Failed to preload image: ${src}`);
                resolve();
              };
              img.src = src;
            });
          })
        );

        // Небольшая задержка между батчами
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Preloaded ${preloadedImages.size} images for collections`);
    };

    preloadCollectionImages();
  }, [collections]);

  return { preloadedImages };
}; 