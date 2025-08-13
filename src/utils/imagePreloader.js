// Глобальный кэш для предзагруженных изображений
const preloadedImages = new Set();

/**
 * Предзагружает изображение и добавляет его в кэш
 * @param {string} src - URL изображения
 * @returns {Promise} - Promise, который резолвится когда изображение загружено
 */
export const preloadImage = (src) => {
  return new Promise((resolve) => {
    // Если изображение уже загружено, сразу резолвим
    if (preloadedImages.has(src)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`);
      resolve(); // Продолжаем даже если изображение не загрузилось
    };
    img.src = src;
  });
};

/**
 * Предзагружает массив изображений батчами
 * @param {string[]} imageUrls - Массив URL изображений
 * @param {number} batchSize - Размер батча (по умолчанию 3)
 * @returns {Promise} - Promise, который резолвится когда все изображения загружены
 */
export const preloadImagesBatch = async (imageUrls, batchSize = 3) => {
  const uniqueUrls = [...new Set(imageUrls)]; // Убираем дубликаты
  
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(src => preloadImage(src))
    );

    // Небольшая задержка между батчами
    if (i + batchSize < uniqueUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Preloaded ${preloadedImages.size} images total`);
};

/**
 * Предзагружает изображения коллекций
 * @param {Array} collections - Массив коллекций
 * @returns {Promise} - Promise, который резолвится когда все изображения загружены
 */
export const preloadCollectionImages = async (collections) => {
  if (!collections || collections.length === 0) {
    return;
  }

  const imagesToPreload = [];

  collections.forEach(collection => {
    if (collection.cover) {
      imagesToPreload.push(collection.cover);
    }
    
    if (collection.banner) {
      imagesToPreload.push(collection.banner);
    }

    // Предзагружаем NFT изображения из localStorage
    try {
      const nfts = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`) || '[]');
      nfts.forEach(nft => {
        if (nft.image) {
          imagesToPreload.push(nft.image);
        }
      });
    } catch (error) {
      console.warn('Failed to preload NFT images for collection:', collection.address);
    }
  });

  await preloadImagesBatch(imagesToPreload);
};

/**
 * Проверяет, загружено ли изображение
 * @param {string} src - URL изображения
 * @returns {boolean} - true если изображение загружено
 */
export const isImagePreloaded = (src) => {
  return preloadedImages.has(src);
};

/**
 * Получает количество предзагруженных изображений
 * @returns {number} - Количество предзагруженных изображений
 */
export const getPreloadedImagesCount = () => {
  return preloadedImages.size;
};

/**
 * Очищает кэш предзагруженных изображений
 */
export const clearPreloadedImages = () => {
  preloadedImages.clear();
}; 