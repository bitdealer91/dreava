// serviceWorkerCache.js - Service Worker кэш для загрузок
export class ServiceWorkerCache {
  constructor() {
    this.cacheName = 'dreava-upload-cache-v1';
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Проверяем поддержку Service Worker
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker();
        this.initialized = true;
        // Service Worker cache initialized
      } else {
        // Service Worker not supported
      }
    } catch (error) {
              // Service Worker cache initialization failed
    }
  }

  async registerServiceWorker() {
    try {
      // Register SW from public/ in production, and no-op in dev (Vite dev server)
      if (location.hostname === 'localhost' || location.port) {
        return null;
      }
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return registration;
    } catch (error) {
      // Ignore SW registration errors to avoid blocking app boot
      console.warn('ServiceWorker registration skipped/failed:', error);
      return null;
    }
  }

  async cacheUpload(file, metadata) {
    if (!this.initialized) return;

    try {
      const cache = await caches.open(this.cacheName);
      const fileHash = await this.generateFileHash(file);
      const cacheKey = `upload_${fileHash}`;
      
      // Создаем Response с метаданными
      const response = new Response(JSON.stringify(metadata), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=86400' // 24 часа
        }
      });
      
      await cache.put(cacheKey, response);
      // Cached upload
      
      return cacheKey;
    } catch (error) {
      // Cache upload failed
    }
  }

  async getCachedUpload(file) {
    if (!this.initialized) return null;

    try {
      const cache = await caches.open(this.cacheName);
      const fileHash = await this.generateFileHash(file);
      const cacheKey = `upload_${fileHash}`;
      
      const response = await cache.match(cacheKey);
      if (response) {
        const metadata = await response.json();
        // Cache hit for upload
        return metadata;
      }
      
      return null;
    } catch (error) {
      // Get cached upload failed
      return null;
    }
  }

  async cacheMetadata(collectionId, metadata) {
    if (!this.initialized) return;

    try {
      const cache = await caches.open(this.cacheName);
      const cacheKey = `metadata_${collectionId}`;
      
      const response = new Response(JSON.stringify(metadata), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=3600' // 1 час
        }
      });
      
      await cache.put(cacheKey, response);
      // Cached metadata
      
      return cacheKey;
    } catch (error) {
      // Cache metadata failed
    }
  }

  async getCachedMetadata(collectionId) {
    if (!this.initialized) return null;

    try {
      const cache = await caches.open(this.cacheName);
      const cacheKey = `metadata_${collectionId}`;
      
      const response = await cache.match(cacheKey);
      if (response) {
        const metadata = await response.json();
        // Cache hit for metadata
        return metadata;
      }
      
      return null;
    } catch (error) {
      // Get cached metadata failed
      return null;
    }
  }

  async clearCache() {
    if (!this.initialized) return;

    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        await cache.delete(key);
      }
      
      // Cache cleared
    } catch (error) {
      // Clear cache failed
    }
  }

  async getCacheStats() {
    if (!this.initialized) return null;

    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      
      let totalSize = 0;
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
      
      return {
        entries: keys.length,
        totalSize,
        cacheName: this.cacheName
      };
    } catch (error) {
      // Get cache stats failed
      return null;
    }
  }

  async generateFileHash(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const hash = crypto.subtle.digest('SHA-256', arrayBuffer).then(hashBuffer => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Методы для работы с сетью
  async cacheNetworkResponse(url, response) {
    if (!this.initialized) return;

    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(url, response.clone());
      // Cached network response
    } catch (error) {
      // Cache network response failed
    }
  }

  async getCachedNetworkResponse(url) {
    if (!this.initialized) return null;

    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(url);
      if (response) {
        // Cache hit for network response
        return response;
      }
      return null;
    } catch (error) {
      // Get cached network response failed
      return null;
    }
  }
} 